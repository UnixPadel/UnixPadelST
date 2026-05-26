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
        return orders.Select(MapList).ToList().AsReadOnly();
    }

    public async Task MoveToLogisticsAsync(string siparisNo, MoveToLogisticsDto dto)
    {
        // Paket 3: Sevk talebi akışı. Order 'Hazir'da kalır, Muhasebe onayı beklenir.

        // Önce siparişin Hazir aşamasında olduğunu garanti et (idempotent kontrol).
        var existing = await uow.Orders.GetByNoAsync(siparisNo)
            ?? throw new NotFoundException("Order", siparisNo);

        if (existing.SiparisMiTeklifMi != "Hazir")
            throw new BusinessException(
                $"'{siparisNo}' 'Hazir' aşamasında değil — sevk talebi oluşturulamaz.");

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

        // 2) Order: STarih + LojistikNot setle; SiparisMiTeklifMi DEĞİŞMEZ ('Hazir' kalır).
        await uow.Orders.UpdateLogisticsFieldsAsync(siparisNo, dto.STarih, dto.LojistikNot);

        // 3) SiparisOnaylari UPSERT (Paket 2 audit) — Muhasebe onayını bekliyor sinyali.
        var note = string.IsNullOrWhiteSpace(dto.LojistikNot) ? "Sevk talebi açıldı." : dto.LojistikNot;
        await uow.OrderApprovals.UpsertAsync(
            siparisNo, dto.KullaniciID, "LojistikOnayBekliyor", note);

        await uow.SaveChangesAsync();
    }

    public Task<IReadOnlyList<LogisticsPendingApprovalDto>> GetPendingMuhasebeApprovalAsync() =>
        uow.LogisticsEntries.GetPendingApprovalAsync();

    public async Task MuhasebeApproveLogisticsAsync(int sevkId, int currentUserId, string? aciklama)
    {
        var sevk = await uow.LogisticsEntries.GetByIdAsync(sevkId)
            ?? throw new NotFoundException("LogisticsEntry", sevkId);

        int rows = await uow.Orders.PromoteHazirToLogisticsAsync(sevk.SiparisNo);
        if (rows == 0)
        {
            var existing = await uow.Orders.GetByNoAsync(sevk.SiparisNo);
            if (existing is null)
                throw new NotFoundException("Order", sevk.SiparisNo);

            throw new BusinessException(
                $"'{sevk.SiparisNo}' 'Hazir' aşamasında değil — Muhasebe onayı yapılamaz.");
        }

        await uow.OrderApprovals.UpsertAsync(
            sevk.SiparisNo, currentUserId, "LojistikOnaylandi",
            string.IsNullOrWhiteSpace(aciklama) ? "Sevkiyat Muhasebe tarafından onaylandı." : aciklama);

        await uow.SaveChangesAsync();
    }

    public async Task MuhasebeRejectLogisticsAsync(int sevkId, int currentUserId, string redNotu)
    {
        if (string.IsNullOrWhiteSpace(redNotu))
            throw new BusinessException("Red gerekçesi zorunlu.");

        var sevk = await uow.LogisticsEntries.GetByIdAsync(sevkId)
            ?? throw new NotFoundException("LogisticsEntry", sevkId);

        var order = await uow.Orders.GetByNoAsync(sevk.SiparisNo);
        if (order is null)
            throw new NotFoundException("Order", sevk.SiparisNo);

        if (order.SiparisMiTeklifMi != "Hazir")
            throw new BusinessException(
                $"'{sevk.SiparisNo}' 'Hazir' aşamasında değil — sevk reddedilemez.");

        // LojistikTablo'dan satırı sil — sevk talebi iptal.
        uow.LogisticsEntries.Remove(sevk);

        await uow.OrderApprovals.UpsertAsync(
            sevk.SiparisNo, currentUserId, "LojistikReddedildi",
            $"Sevk reddi (#{sevkId}): {redNotu}");

        await uow.SaveChangesAsync();
    }

    public async Task CompleteShipmentAsync(int sevkId, int currentUserId, string? not)
    {
        var sevk = await uow.LogisticsEntries.GetByIdAsync(sevkId)
            ?? throw new NotFoundException("LogisticsEntry", sevkId);

        // Order'ı Tamamlandi'ya çek
        int rows = await uow.Orders.CompleteOrderAsync(sevk.SiparisNo);
        if (rows == 0)
        {
            var exists = await uow.Orders.GetByNoAsync(sevk.SiparisNo);
            if (exists is null)
                throw new NotFoundException("Order", sevk.SiparisNo);
            throw new BusinessException(
                $"'{sevk.SiparisNo}' 'Lojistik' aşamasında değil — tamamlanamaz.");
        }

        // TamamlandiTablo audit (Faz 3 entity)
        await uow.CompletedOrders.AddAsync(new CompletedOrder
        {
            SiparisNo   = sevk.SiparisNo,
            KullaniciID = currentUserId,
            Tarih       = DateTime.Now
        });

        // SiparisOnaylari audit (Paket 2 — UPSERT)
        await uow.OrderApprovals.UpsertAsync(
            sevk.SiparisNo, currentUserId, "Onaylandi",
            string.IsNullOrWhiteSpace(not) ? "Sevkiyat tamamlandı." : $"Tamamlandı: {not}");

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
        o.SiparisMiTeklifMi, o.LojistikNot, o.STarih, o.Tarih);
}
