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
    // Lojistik teklif kuyruğu aşamaları — sipariş üretime alınınca düşer,
    // tamamlanana (Tamamlandi) kadar kalır.
    private static readonly string[] OfferQueueStages =
        { "Uretim", "Hazir", "Lojistik", "TamamlanmaBekliyor" };

    public async Task<IReadOnlyList<LogisticsOrderListDto>> GetLogisticsOrdersAsync()
    {
        var orders = await uow.Orders.GetLogisticsStagesAsync();
        return orders.Select(o => MapList(o)).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<LogisticsOrderListDto>> GetReadyForShipmentAsync()
    {
        // Faz 4: Hazir + Kontrol=Onay
        // PROMPT-v6 §1.1 — Burcu lojistik onay gate'i: 'Bekliyor' satırlar
        // ready-listte görünmez. NULL = migration öncesi eski kayıt (gate
        // uygulanmaz — migrator backfill'i bunları zaten 'Onay' yapar).
        var hazir = (await uow.Orders.SearchAsync(
                siparisNo: null, musteriAd: null, kullaniciID: null,
                ulke: null, asama: "Hazir", kontrol: "Onay",
                odemeDurum: null, baslangic: null, bitis: null))
            .Where(o => o.LojistikOnay is null or "Onay")
            .ToList();

        // Üretime alınan sipariş lojistikte de görünür ("Hazırlanıyor"); gerçek
        // aşama 'Uretim' kalır, sevk yalnız 'Hazir' olunca yapılabilir (frontend
        // 'Sevk Oluştur'u pasif tutar). Mevcut aşama mantığı korunur.
        var uretim = (await uow.Orders.SearchAsync(
                siparisNo: null, musteriAd: null, kullaniciID: null,
                ulke: null, asama: "Uretim", kontrol: "Onay",
                odemeDurum: null, baslangic: null, bitis: null))
            .ToList();

        var all = hazir.Concat(uretim).ToList();

        // "Her ikisi de" — onaylı lojistik teklifini sevk formuna taşımak için
        // onaylı firma/tür/fiyat'ı satıra iliştir (yoksa null kalır).
        var approved = await uow.LogisticsOffers.GetApprovedForOrdersAsync(
            all.Select(o => o.SiparisNo).Distinct().ToList());

        return all
            .Select(o => MapList(o, approved.TryGetValue(o.SiparisNo, out var a) ? a : null))
            .ToList()
            .AsReadOnly();
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

    private static LogisticsOrderListDto MapList(Order o, LogisticsOffer? approved = null) => new(
        o.SiparisNo, o.MusteriAd, o.MUlke,
        o.SiparisMiTeklifMi, o.LojistikNot, o.STarih, o.Tarih,
        // PROMPT-v6 §4 — ödeme türü bilgisi (tutar yok; v5 §2 karartması korunur).
        o.PesinYüzde, o.OdemeDurum,
        // Onaylı lojistik teklif (yalnız ready listesinde dolu) — sevk ön-doldurma.
        approved?.FirmaAdi, approved?.LojistikCesit, approved?.Fiyat);

    // ── Lojistik Teklif akışı ─────────────────────────────────────────────────

    public async Task<IReadOnlyList<LogisticsOfferQueueItemDto>> GetOfferQueueAsync()
    {
        // Üretim→tamamlanma aralığındaki siparişler. Bu aşamalara yalnız QC+cari
        // onaydan geçmiş siparişler ulaşır; ayrı kontrol filtresine gerek yok.
        var orders = new List<Order>();
        foreach (var stage in OfferQueueStages)
        {
            orders.AddRange(await uow.Orders.SearchAsync(
                siparisNo: null, musteriAd: null, kullaniciID: null,
                ulke: null, asama: stage, kontrol: null,
                odemeDurum: null, baslangic: null, bitis: null));
        }

        var siparisNolar = orders.Select(o => o.SiparisNo).Distinct().ToList();
        var counts   = await uow.LogisticsOffers.GetOfferCountsAsync(siparisNolar);
        var approved = await uow.LogisticsOffers.GetApprovedForOrdersAsync(siparisNolar);

        return orders
            .OrderByDescending(o => o.Tarih)
            .Select(o => new LogisticsOfferQueueItemDto(
                o.SiparisNo, o.MusteriAd, o.MUlke, o.SiparisMiTeklifMi, o.Tarih, o.STarih,
                counts.TryGetValue(o.SiparisNo, out var c) ? c : 0,
                approved.TryGetValue(o.SiparisNo, out var a) ? a.FirmaAdi : null,
                approved.TryGetValue(o.SiparisNo, out var a2) ? a2.Fiyat : null))
            .ToList()
            .AsReadOnly();
    }

    public async Task<IReadOnlyList<LogisticsOfferDto>> GetOffersAsync(string siparisNo)
    {
        var offers = await uow.LogisticsOffers.GetByOrderAsync(siparisNo);
        if (offers.Count == 0) return Array.Empty<LogisticsOfferDto>();

        var userIds = offers.Select(o => o.KullaniciID)
            .Concat(offers.Where(o => o.OnayKullaniciID.HasValue).Select(o => o.OnayKullaniciID!.Value))
            .Distinct().ToList();
        var users = (await uow.Kullanicilar.GetAllAsync())
            .Where(u => userIds.Contains(u.KullaniciID))
            .ToDictionary(u => u.KullaniciID, u => $"{u.Ad} {u.Soyad}".Trim());

        return offers.Select(o => new LogisticsOfferDto(
                o.TeklifID, o.SiparisNo, o.KullaniciID,
                users.TryGetValue(o.KullaniciID, out var n) ? n : null,
                o.FirmaAdi, o.LojistikCesit, o.Fiyat, o.Aciklama, o.Durum, o.OlusturmaTarihi,
                o.OnayKullaniciID,
                o.OnayKullaniciID.HasValue && users.TryGetValue(o.OnayKullaniciID.Value, out var on) ? on : null,
                o.OnayTarihi, o.RedNotu))
            .ToList()
            .AsReadOnly();
    }

    public async Task SubmitOfferAsync(string siparisNo, int kullaniciId, SubmitLogisticsOfferRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FirmaAdi))
            throw new BusinessException("Firma adı zorunlu.");
        if (string.IsNullOrWhiteSpace(req.LojistikCesit))
            throw new BusinessException("Taşıma türü zorunlu.");

        var order = await uow.Orders.GetByNoAsync(siparisNo)
            ?? throw new NotFoundException("Order", siparisNo);

        if (!OfferQueueStages.Contains(order.SiparisMiTeklifMi))
            throw new BusinessException(
                $"'{siparisNo}' lojistik teklif aşamasında değil (aşama: {order.SiparisMiTeklifMi}).");

        await uow.LogisticsOffers.AddAsync(new LogisticsOffer
        {
            SiparisNo       = siparisNo,
            KullaniciID     = kullaniciId,
            FirmaAdi        = req.FirmaAdi.Trim(),
            LojistikCesit   = req.LojistikCesit.Trim(),
            Fiyat           = req.Fiyat,
            Aciklama        = string.IsNullOrWhiteSpace(req.Aciklama) ? null : req.Aciklama.Trim(),
            Durum           = "Beklemede",
            OlusturmaTarihi = DateTime.Now,
        });
        await uow.SaveChangesAsync();
    }

    public async Task ApproveOfferAsync(int teklifId, int yoneticiId)
    {
        var offer = await uow.LogisticsOffers.GetByIdAsync(teklifId)
            ?? throw new NotFoundException("LogisticsOffer", teklifId);

        // Tracked çek — aynı siparişteki tüm teklifler (chosen EF identity map ile aynı instance).
        var siblings = await uow.LogisticsOffers.GetTrackedByOrderAsync(offer.SiparisNo);
        LogisticsOffer? chosen = null;
        foreach (var s in siblings)
        {
            if (s.TeklifID == teklifId)
            {
                s.Durum           = "Onaylandi";
                s.OnayKullaniciID = yoneticiId;
                s.OnayTarihi      = DateTime.Now;
                s.RedNotu         = null;   // önceden reddedildiyse red notunu temizle
                chosen = s;
            }
            else if (s.Durum == "Onaylandi")
            {
                // Tek onaylı kalsın — önceki onayı geri al.
                s.Durum           = "Beklemede";
                s.OnayKullaniciID = null;
                s.OnayTarihi      = null;
            }
            uow.LogisticsOffers.Update(s);
        }

        chosen ??= offer;
        await uow.OrderApprovals.UpsertAsync(
            offer.SiparisNo, yoneticiId, "LojistikTeklifOnaylandi",
            $"Lojistik teklif onaylandı: {chosen.FirmaAdi} — {chosen.Fiyat:N2} ({chosen.LojistikCesit}).");

        await uow.SaveChangesAsync();
    }

    public async Task RevokeOfferAsync(int teklifId, int yoneticiId)
    {
        var offer = await uow.LogisticsOffers.GetByIdAsync(teklifId)
            ?? throw new NotFoundException("LogisticsOffer", teklifId);

        if (offer.Durum != "Onaylandi")
            throw new BusinessException("Teklif onaylı değil — iptal edilecek onay yok.");

        offer.Durum           = "Beklemede";
        offer.OnayKullaniciID = null;
        offer.OnayTarihi      = null;
        uow.LogisticsOffers.Update(offer);

        await uow.OrderApprovals.UpsertAsync(
            offer.SiparisNo, yoneticiId, "LojistikTeklifIptal",
            $"Lojistik teklif onayı iptal edildi: {offer.FirmaAdi}.");

        await uow.SaveChangesAsync();
    }

    public async Task RejectOfferAsync(int teklifId, int yoneticiId, string redNotu)
    {
        if (string.IsNullOrWhiteSpace(redNotu))
            throw new BusinessException("Red açıklaması zorunlu.");

        var offer = await uow.LogisticsOffers.GetByIdAsync(teklifId)
            ?? throw new NotFoundException("LogisticsOffer", teklifId);

        offer.Durum           = "Reddedildi";
        offer.RedNotu         = redNotu.Trim();
        offer.OnayKullaniciID = yoneticiId;   // kararı veren yönetici
        offer.OnayTarihi      = DateTime.Now;
        uow.LogisticsOffers.Update(offer);

        await uow.OrderApprovals.UpsertAsync(
            offer.SiparisNo, yoneticiId, "LojistikTeklifReddedildi",
            $"Lojistik teklif reddedildi: {offer.FirmaAdi} — {redNotu.Trim()}");

        await uow.SaveChangesAsync();
    }
}
