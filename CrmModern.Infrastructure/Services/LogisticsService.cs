using CrmModern.Core.DTOs.Logistics;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Lojistik + LojistikYontim + LojistikGecmis WinForms ekranları.
/// </summary>
internal sealed class LogisticsService(IUnitOfWork uow) : ILogisticsService
{
    public async Task<IReadOnlyList<LogisticsOrderListDto>> GetLogisticsOrdersAsync()
    {
        var orders = await uow.Orders.GetLogisticsStagesAsync();
        return orders.Select(MapList).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<LogisticsOrderListDto>> GetReadyForShipmentAsync()
    {
        // Faz 4: Hazir + Kontrol=Onay
        var orders = await uow.Orders.SearchAsync(
            siparisNo: null, musteriAd: null, kullaniciID: null,
            ulke: null, asama: "Hazir", kontrol: "Onay",
            odemeDurum: null, baslangic: null, bitis: null);
        // PROMPT-v6 §1.1 — Burcu lojistik onay gate'i: 'Bekliyor' satırlar
        // ready-listte görünmez. NULL = migration öncesi eski kayıt (gate
        // uygulanmaz — migrator backfill'i bunları zaten 'Onay' yapar).
        return orders
            .Where(o => o.LojistikOnay is null or "Onay")
            .Select(MapList).ToList().AsReadOnly();
    }

    public async Task MoveToLogisticsAsync(string siparisNo, MoveToLogisticsDto dto)
    {
        // Round-9 §19: Sevk oluşturma artık doğrudan Hazir → Lojistik geçişi yapar.
        // Ayrı "Muhasebe Lojistik Onayları" gate'i kaldırıldı (Burcu lojistik onayını
        // cari/lojistik kuyruğunda zaten verdi).

        // Önce siparişin Hazir aşamasında olduğunu garanti et (idempotent kontrol).
        var existing = await uow.Orders.GetByNoAsync(siparisNo)
            ?? throw new NotFoundException("Order", siparisNo);

        if (existing.SiparisMiTeklifMi != "Hazir")
            throw new BusinessException(
                $"'{siparisNo}' 'Hazir' aşamasında değil — sevk oluşturulamaz.");

        // 1) LojistikTablo INSERT
        var entry = new LogisticsEntry
        {
            KullaniciAdi  = dto.KullaniciID,
            SiparisNo     = siparisNo,
            FirmaAdi      = dto.FirmaAdi,
            LojistikCesit = dto.LojistikCesit,
            Fiyat         = dto.Fiyat,
            LNot          = dto.LNot
        };
        await uow.LogisticsEntries.AddAsync(entry);

        // 2) Order: Hazir → Lojistik + STarih/LojistikNot setle (sevk yola çıktı).
        await uow.Orders.MoveToLogisticsAsync(siparisNo, dto.STarih, dto.LojistikNot);

        // 3) SiparisOnaylari UPSERT (Paket 2 audit).
        var note = string.IsNullOrWhiteSpace(dto.LojistikNot) ? "Sevkiyat oluşturuldu." : dto.LojistikNot;
        await uow.OrderApprovals.UpsertAsync(
            siparisNo, dto.KullaniciID, "LojistikOnaylandi", note);

        await uow.SaveChangesAsync();
    }

    public async Task CompleteShipmentAsync(int sevkId, int currentUserId, string? not)
    {
        var sevk = await uow.LogisticsEntries.GetByIdAsync(sevkId)
            ?? throw new NotFoundException("LogisticsEntry", sevkId);

        // Round-9 §19: Sevkiyat tamamlanınca sipariş 'Tamamlandi' OLMAZ; muhasebe
        // (Burcu) 1. Peşinat + Final Maliyet girişini bekleyen ara aşamaya geçer.
        // Nihai 'Tamamlandi' + TamamlandiTablo audit, FinalizeCompletion adımında yazılır.
        int rows = await uow.Orders.CompleteShipmentToPendingAsync(sevk.SiparisNo);
        if (rows == 0)
        {
            var exists = await uow.Orders.GetByNoAsync(sevk.SiparisNo);
            if (exists is null)
                throw new NotFoundException("Order", sevk.SiparisNo);
            throw new BusinessException(
                $"'{sevk.SiparisNo}' 'Lojistik' aşamasında değil — tamamlanamaz.");
        }

        // SiparisOnaylari audit (Paket 2 — UPSERT)
        await uow.OrderApprovals.UpsertAsync(
            sevk.SiparisNo, currentUserId, "LojistikOnaylandi",
            string.IsNullOrWhiteSpace(not)
                ? "Sevkiyat tamamlandı — muhasebe tamamlama onayı bekliyor."
                : $"Sevkiyat tamamlandı ({not}) — muhasebe tamamlama onayı bekliyor.");

        await uow.SaveChangesAsync();
    }

    public async Task CancelShipmentAsync(int sevkId, int currentUserId, string sebep)
    {
        if (string.IsNullOrWhiteSpace(sebep))
            throw new BusinessException("İptal gerekçesi zorunlu.");

        var sevk = await uow.LogisticsEntries.GetByIdAsync(sevkId)
            ?? throw new NotFoundException("LogisticsEntry", sevkId);

        var order = await uow.Orders.GetByNoAsync(sevk.SiparisNo);

        // LojistikTablo hard DELETE (soft-delete kolonu yok)
        uow.LogisticsEntries.Remove(sevk);

        // Order rollback: Lojistik → Hazir (yalnız Lojistik aşamasındaysa)
        if (order is not null && order.SiparisMiTeklifMi == "Lojistik")
        {
            order.SiparisMiTeklifMi = "Hazir";
            order.LojistikNot = $"[İPTAL: {sebep}] " + (order.LojistikNot ?? "");
            uow.Orders.Update(order);
        }

        // SiparisOnaylari audit (Paket 2 — UPSERT)
        if (order is not null)
        {
            await uow.OrderApprovals.UpsertAsync(
                order.SiparisNo, currentUserId, "Reddedildi",
                $"Sevkiyat iptal (#{sevkId}): {sebep}");
        }

        await uow.SaveChangesAsync();
    }

    public async Task CompleteOrderAsync(string siparisNo)
    {
        int rows = await uow.Orders.CompleteOrderAsync(siparisNo);
        if (rows == 0)
        {
            var exists = await uow.Orders.GetByNoAsync(siparisNo);
            if (exists is null)
                throw new NotFoundException("Order", siparisNo);

            throw new BusinessException(
                $"Order '{siparisNo}' is not in 'Lojistik' stage and cannot be completed.");
        }
    }

    public Task<IReadOnlyList<LogisticsHistoryDto>> GetHistoryAsync(string? siparisNo, string? firmaAdi) =>
        // Paket 3: SearchHistoryAsync Order.SiparisMiTeklifMi'yi de join'le döndürür.
        uow.LogisticsEntries.SearchHistoryAsync(siparisNo, firmaAdi);

    public Task<IReadOnlyList<string>> GetCarriersAsync() => uow.LogisticsEntries.GetDistinctCarriersAsync();
    public Task<IReadOnlyList<string>> GetCesitlerAsync() => uow.LogisticsEntries.GetDistinctCesitlerAsync();

    private static LogisticsOrderListDto MapList(Order o) => new(
        o.SiparisNo, o.MusteriAd, o.MUlke,
        o.SiparisMiTeklifMi, o.LojistikNot, o.STarih, o.Tarih,
        // PROMPT-v6 §4 — ödeme türü bilgisi (tutar yok; v5 §2 karartması korunur).
        o.PesinYüzde, o.OdemeDurum);
}
