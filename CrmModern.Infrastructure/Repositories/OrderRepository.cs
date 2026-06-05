using CrmModern.Core.DTOs.Dashboard;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class OrderRepository(AppDbContext context)
    : BaseRepository<Order>(context), IOrderRepository
{
    public async Task<Order?> GetByNoAsync(string siparisNo)
    {
        var order = await _context.SiparisAlTablo
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.SiparisNo == siparisNo);

        if (order is null) return null;

        // Load Items and Details separately — avoids EF string-FK navigation complexity
        order.Items = await _context.SiparisIslemTablo
            .AsNoTracking()
            .Where(i => i.SiparisNo == siparisNo)
            .ToListAsync();

        order.Details = await _context.DetayTablo
            .AsNoTracking()
            .Where(d => d.SiparisNo == siparisNo)
            .ToListAsync();

        return order;
    }

    public async Task<IReadOnlyList<Order>> GetByKullaniciAsync(int kullaniciID) =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.KullaniciID == kullaniciID)
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    public async Task<int> GetNextSequenceAsync()
    {
        // Matches the WinForms query: SELECT MAX(SiparisAlID) FROM SiparisAlTablo
        var max = await _context.SiparisAlTablo.MaxAsync(o => (int?)o.SiparisAlID);
        return (max ?? 0) + 1;
    }

    public async Task DeleteItemsAsync(string siparisNo) =>
        await _context.SiparisIslemTablo
            .Where(i => i.SiparisNo == siparisNo)
            .ExecuteDeleteAsync();

    public async Task DeleteDetailsAsync(string siparisNo) =>
        await _context.DetayTablo
            .Where(d => d.SiparisNo == siparisNo)
            .ExecuteDeleteAsync();

    public async Task AddItemsAsync(IEnumerable<OrderItem> items) =>
        await _context.SiparisIslemTablo.AddRangeAsync(items);

    public async Task AddDetailsAsync(IEnumerable<OrderDetail> details) =>
        await _context.DetayTablo.AddRangeAsync(details);

    // ── Factory ───────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<Order>> GetProductionStagesAsync() =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => new[] { "Planlama", "Uretim", "Hazir", "Lojistik", "Tamamlandi" }
                .Contains(o.SiparisMiTeklifMi))
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    // Faz-fix 2.4 — Fabrika tarafındaki her aşama geçişinde STarih güncellenir;
    // STarih artık "son fabrika işlem tarihi" (legacy "İşlem Tarihi") rolünü
    // de üstlenir. MoveToProduction kullanıcı tarafından seçilen "üretim tarihi"
    // ile yazar (anlamlı bir tarih); MarkAsReady ise gerçek işlem zamanı (Now)
    // ile yazar.
    public async Task<int> MoveToProductionAsync(string siparisNo, DateTime stTarih, string fabrikaNot) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Uretim")
                .SetProperty(o => o.STarih, (DateTime?)stTarih)
                .SetProperty(o => o.FabrikaNot, fabrikaNot));

    public async Task<int> MarkAsReadyAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Uretim")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Hazir")
                .SetProperty(o => o.STarih, (DateTime?)DateTime.Now));

    // ── Logistics ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<Order>> GetLogisticsStagesAsync() =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => new[] { "Siparis", "Planlama", "Uretim", "Hazir", "Lojistik", "Tamamlandi" }
                .Contains(o.SiparisMiTeklifMi))
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    public async Task<int> MoveToLogisticsAsync(string siparisNo, DateTime stTarih, string lojistikNot) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Hazir")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Lojistik")
                .SetProperty(o => o.STarih, (DateTime?)stTarih)
                .SetProperty(o => o.LojistikNot, lojistikNot));

    public async Task<int> UpdateLogisticsFieldsAsync(string siparisNo, DateTime stTarih, string lojistikNot) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Hazir")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.STarih, (DateTime?)stTarih)
                .SetProperty(o => o.LojistikNot, lojistikNot));

    public async Task<int> PromoteHazirToLogisticsAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Hazir")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Lojistik"));

    public async Task<int> CompleteOrderAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Lojistik")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Tamamlandi"));

    // ── Search ────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<Order>> SearchAsync(
        string?   siparisNo,
        string?   musteriAd,
        int?      kullaniciID,
        string?   ulke,
        string?   asama,
        string?   kontrol,
        string?   odemeDurum,
        DateTime? baslangic,
        DateTime? bitis)
    {
        var q = _context.SiparisAlTablo.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(siparisNo))
            q = q.Where(o => o.SiparisNo.Contains(siparisNo) || o.TeklifNo.Contains(siparisNo));

        if (!string.IsNullOrWhiteSpace(musteriAd))
            q = q.Where(o => o.MusteriAd.Contains(musteriAd));

        if (kullaniciID.HasValue)
            q = q.Where(o => o.KullaniciID == kullaniciID.Value);

        if (!string.IsNullOrWhiteSpace(ulke))
            q = q.Where(o => o.MUlke == ulke);

        if (!string.IsNullOrWhiteSpace(asama))
            q = q.Where(o => o.SiparisMiTeklifMi == asama);

        if (!string.IsNullOrWhiteSpace(kontrol))
            q = q.Where(o => o.Kontrol == kontrol);

        if (!string.IsNullOrWhiteSpace(odemeDurum))
            q = q.Where(o => o.OdemeDurum == odemeDurum);

        if (baslangic.HasValue)
            q = q.Where(o => o.Tarih >= baslangic.Value);

        if (bitis.HasValue)
            q = q.Where(o => o.Tarih <= bitis.Value);

        return await q.OrderByDescending(o => o.SiparisAlID).ToListAsync();
    }

    // ── Accounting ────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<Order>> GetAccountingOrdersAsync() =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.Kontrol == "Onay")
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    // ── Quality Control ───────────────────────────────────────────────────────

    public async Task<IReadOnlyList<Order>> GetPendingQualityControlAsync() =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.Kontrol == "Kontrol")
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    public async Task<int> ApproveQualityControlAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.Kontrol != "Onay")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Kontrol, "Onay")
                .SetProperty(o => o.SiparisMiTeklifMi,
                    o => o.SiparisMiTeklifMi == "Teklif" ? "Siparis" : o.SiparisMiTeklifMi));

    public async Task<int> RejectQualityControlAsync(string siparisNo, string red) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo
                     && o.Kontrol != "Onay"
                     && (o.SiparisMiTeklifMi == "Teklif" || o.SiparisMiTeklifMi == "Siparis"))
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Red, red)
                .SetProperty(o => o.Kontrol, "Reddet"));

    public async Task<IReadOnlyList<Order>> QuickFindAsync(string query, int limit)
    {
        var q = $"%{query}%";
        return await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => EF.Functions.Like(o.SiparisNo, q)
                     || EF.Functions.Like(o.TeklifNo,  q)
                     || EF.Functions.Like(o.MusteriAd, q)
                     || (o.MAdres != null && EF.Functions.Like(o.MAdres, q)))
            .OrderByDescending(o => o.SiparisAlID)
            .Take(limit)
            .ToListAsync();
    }

    // ── Dashboard aggregations (Faz 7) ────────────────────────────────────────

    public async Task<int> CountSiparisInLastDaysAsync(int days)
    {
        var cutoff = DateTime.Now.AddDays(-days);
        return await _context.SiparisAlTablo
            .AsNoTracking()
            .CountAsync(o => o.SiparisMiTeklifMi != "Teklif" && o.Tarih >= cutoff);
    }

    public async Task<IReadOnlyDictionary<string, decimal>> SumCiroByCurrencyInLastDaysAsync(int days)
    {
        var cutoff = DateTime.Now.AddDays(-days);
        var rows = await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.SiparisMiTeklifMi != "Teklif" && o.Tarih >= cutoff)
            .GroupBy(o => o.ParaTipi)
            .Select(g => new { ParaTipi = g.Key, Toplam = g.Sum(x => x.ToplamFiyat ?? 0m) })
            .ToListAsync();

        return rows.ToDictionary(r => r.ParaTipi, r => r.Toplam);
    }

    public Task<int> CountBekleyenKontrolAsync() =>
        _context.SiparisAlTablo.AsNoTracking().CountAsync(o => o.Kontrol == "Kontrol");

    public Task<int> CountUretimdekiAsync() =>
        _context.SiparisAlTablo.AsNoTracking().CountAsync(o => o.SiparisMiTeklifMi == "Uretim");

    public Task<int> CountSevkiyatBekleyenAsync() =>
        _context.SiparisAlTablo.AsNoTracking()
            .CountAsync(o => o.SiparisMiTeklifMi == "Hazir" || o.SiparisMiTeklifMi == "Lojistik");

    public Task<int> CountOdemeBekleyenAsync() =>
        _context.SiparisAlTablo.AsNoTracking()
            .CountAsync(o => o.SiparisMiTeklifMi != "Teklif"
                          && o.SiparisMiTeklifMi != "Tamamlandi"
                          && (o.OdemeDurum == null
                              || o.OdemeDurum == ""
                              || o.OdemeDurum == "Ödeme Bekleniyor"
                              || o.OdemeDurum == "Kısmi Ödeme"));

    public Task<int> CountAcikSiparisByKullaniciAsync(int kullaniciID) =>
        _context.SiparisAlTablo.AsNoTracking()
            .CountAsync(o => o.KullaniciID == kullaniciID
                          && o.SiparisMiTeklifMi != "Tamamlandi"
                          && o.SiparisMiTeklifMi != "Iptal");

    public async Task<IReadOnlyList<OrderTrendPointDto>> GetOrdersByMonthAsync(int months)
    {
        var cutoff = DateTime.Now.AddMonths(-months);
        // Group by Year/Month + ParaTipi to keep currency split intact
        var raw = await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.SiparisMiTeklifMi != "Teklif" && o.Tarih >= cutoff)
            .GroupBy(o => new { o.Tarih.Year, o.Tarih.Month, o.ParaTipi })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                g.Key.ParaTipi,
                Sayi   = g.Count(),
                Toplam = g.Sum(x => x.ToplamFiyat ?? 0m)
            })
            .ToListAsync();

        return raw
            .GroupBy(r => new { r.Year, r.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new OrderTrendPointDto(
                $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                g.Sum(x => x.Sayi),
                g.Where(x => x.ParaTipi == "Euro"   ).Sum(x => x.Toplam),
                g.Where(x => x.ParaTipi == "Dolar"  ).Sum(x => x.Toplam),
                g.Where(x => x.ParaTipi == "TL"     ).Sum(x => x.Toplam),
                g.Where(x => x.ParaTipi == "Sterlin").Sum(x => x.Toplam)))
            .ToList();
    }

    public async Task<IReadOnlyList<StageDistributionDto>> GetOrdersByStageAsync()
    {
        var rows = await _context.SiparisAlTablo
            .AsNoTracking()
            .GroupBy(o => o.SiparisMiTeklifMi)
            .Select(g => new StageDistributionDto(g.Key, g.Count()))
            .ToListAsync();
        return rows;
    }

    public async Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(int days, int limit)
    {
        var cutoff = DateTime.Now.AddDays(-days);
        // Paket 1 — Pomelo `OrderByDescending(dto.ToplamCiro)` Select projection
        // sonrası translate edemiyor. GroupBy+Sum'ı server-side yap, sıralama ve
        // limit'i client-side uygula.
        var rows = await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.SiparisMiTeklifMi != "Teklif" && o.Tarih >= cutoff)
            .GroupBy(o => new { o.MusteriAd, o.ParaTipi })
            .Select(g => new
            {
                g.Key.MusteriAd,
                g.Key.ParaTipi,
                Sayi   = g.Count(),
                Toplam = g.Sum(x => x.ToplamFiyat ?? 0m)
            })
            .ToListAsync();

        return rows
            .OrderByDescending(r => r.Toplam)
            .Take(limit)
            .Select(r => new TopCustomerDto(r.MusteriAd, r.Sayi, r.Toplam, r.ParaTipi))
            .ToList();
    }

    public async Task<IReadOnlyList<CurrencyDistributionDto>> GetCurrencyDistributionAsync(int days)
    {
        var cutoff = DateTime.Now.AddDays(-days);
        var rows = await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.SiparisMiTeklifMi != "Teklif" && o.Tarih >= cutoff)
            .GroupBy(o => o.ParaTipi)
            .Select(g => new CurrencyDistributionDto(
                g.Key,
                g.Count(),
                g.Sum(x => x.ToplamFiyat ?? 0m)))
            .ToListAsync();
        return rows;
    }
}
