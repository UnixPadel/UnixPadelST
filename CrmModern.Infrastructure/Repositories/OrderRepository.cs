using System.Linq.Expressions;
using CrmModern.Core.DTOs.Dashboard;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Core.Workflow;
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

        // PROMPT-v4 §4.2 — Detay satırları Teklif oluşturulurken yazılır; sipariş
        // numarasıyla bulunamazsa TeklifNo ile tekrar dene (teklif→sipariş dönüşümü).
        if (order.Details.Count == 0 &&
            !string.IsNullOrEmpty(order.TeklifNo) && order.TeklifNo != siparisNo)
        {
            order.Details = await _context.DetayTablo
                .AsNoTracking()
                .Where(d => d.SiparisNo == order.TeklifNo)
                .ToListAsync();
        }

        return order;
    }

    public async Task<IReadOnlyList<Order>> GetByKullaniciAsync(int kullaniciID) =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.KullaniciID == kullaniciID)
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    // Round-8 §13 — Temsilci performans raporu kaynağı (silinmemiş başlık satırları).
    public async Task<IReadOnlyList<Order>> GetOrdersInRangeAsync(DateTime start, DateTime end) =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => !o.Silindi && o.Tarih >= start && o.Tarih <= end)
            .ToListAsync();

    // §19 — Tek temsilcinin tarih aralığındaki silinmemiş siparişleri (detay rapor).
    public async Task<IReadOnlyList<Order>> GetRepReportOrdersAsync(int kullaniciID, DateTime start, DateTime end) =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => !o.Silindi && o.KullaniciID == kullaniciID && o.Tarih >= start && o.Tarih <= end)
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    // §19 — Verilen sipariş numaralarına ait kalemler (SiparisIslemTablo) — toplu, N+1 yok.
    public async Task<IReadOnlyList<OrderItem>> GetItemsForOrdersAsync(IReadOnlyCollection<string> siparisNolar)
    {
        if (siparisNolar.Count == 0) return Array.Empty<OrderItem>();
        return await _context.SiparisIslemTablo
            .AsNoTracking()
            .Where(i => siparisNolar.Contains(i.SiparisNo))
            .ToListAsync();
    }

    // Round-8 §10 — müşteri silmeden önce sipariş/teklif var mı kontrolü.
    public async Task<bool> AnyByCustomerAsync(int musteriId, string musteriAd) =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .AnyAsync(o => o.MusteriId == musteriId
                || (musteriAd != "" && o.MusteriAd == musteriAd));

    // ── İç denetim (workflow) ─────────────────────────────────────────────────

    // Yalnız akış kolonları + başlık; Ek/MuhasebeEk blob'ları ve tutarlar yüklenmez.
    private static readonly Expression<Func<Order, Order>> WorkflowHeader = o => new Order
    {
        SiparisNo         = o.SiparisNo,
        MusteriAd         = o.MusteriAd,
        MUlke             = o.MUlke,
        KullaniciID       = o.KullaniciID,
        SiparisMiTeklifMi = o.SiparisMiTeklifMi,
        Kontrol           = o.Kontrol,
        LojistikOnay      = o.LojistikOnay,
        Silindi           = o.Silindi,
        Tarih             = o.Tarih,
        STarih            = o.STarih,
        DegisiklikTarihi  = o.DegisiklikTarihi,
    };

    public async Task<IReadOnlyList<Order>> GetWorkflowHeadersAsync(
        Expression<Func<Order, bool>> predicate,
        Expression<Func<Order, bool>>? narrow,
        int? kullaniciID)
    {
        var q = _context.SiparisAlTablo.AsNoTracking().Where(predicate);
        if (narrow is not null) q = q.Where(narrow);
        if (kullaniciID is int uid) q = q.Where(o => o.KullaniciID == uid);
        return await q.OrderByDescending(o => o.SiparisAlID).Select(WorkflowHeader).ToListAsync();
    }

    public async Task<Order?> GetWorkflowHeaderAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.SiparisNo == siparisNo)
            .Select(WorkflowHeader)
            .FirstOrDefaultAsync();

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

    // ── Ekstra maliyet (SiparisEkMaliyet) ──────────────────────────────────────

    public async Task<IReadOnlyList<OrderExtraCost>> GetExtraCostsByOrderIdAsync(int siparisAlID) =>
        await _context.SiparisEkMaliyet
            .AsNoTracking()
            .Where(c => c.SiparisAlID == siparisAlID)
            .OrderBy(c => c.EkMaliyetID)
            .ToListAsync();

    public async Task<OrderExtraCost?> GetExtraCostByIdAsync(int ekMaliyetID) =>
        await _context.SiparisEkMaliyet.FirstOrDefaultAsync(c => c.EkMaliyetID == ekMaliyetID);

    public async Task AddExtraCostAsync(OrderExtraCost cost) =>
        await _context.SiparisEkMaliyet.AddAsync(cost);

    public void RemoveExtraCost(OrderExtraCost cost) =>
        _context.SiparisEkMaliyet.Remove(cost);

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
    // İç denetim — yalnız Planlama'daki sipariş üretime alınır (önceden aşama
    // kontrolü yoktu; Siparis/Hazir/Lojistik kayıt da Uretim'e geri çekilebiliyordu).
    public async Task<int> MoveToProductionAsync(string siparisNo, DateTime stTarih, string fabrikaNot) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Planlama")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Uretim")
                .SetProperty(o => o.STarih, (DateTime?)stTarih)
                .SetProperty(o => o.FabrikaNot, fabrikaNot));

    public async Task<int> MarkAsReadyAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Uretim")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Hazir")
                // PROMPT-v6 §1.1 — Hazir'a geçen sipariş Burcu'nun lojistik onay
                // kuyruğuna düşer; o onaylayana dek lojistik ready-listte görünmez.
                .SetProperty(o => o.LojistikOnay, "Bekliyor")
                .SetProperty(o => o.STarih, (DateTime?)DateTime.Now));

    // ── Logistics ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<Order>> GetLogisticsStagesAsync() =>
        await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => new[] { "Siparis", "Planlama", "Uretim", "Hazir", "Lojistik", "Tamamlandi" }
                .Contains(o.SiparisMiTeklifMi))
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();

    // İç denetim — sevk yalnız Kontrol onaylı ve muhasebe lojistik onayı verilmiş
    // (veya gate'siz eski kayıt: NULL) Hazir siparişte (OrderWorkflow.Sevkiyat).
    public async Task<int> MoveToLogisticsAsync(string siparisNo, DateTime stTarih, string lojistikNot) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Hazir"
                     && o.Kontrol == "Onay" && (o.LojistikOnay == null || o.LojistikOnay == "Onay"))
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

    // Round-9 §19 — sevkiyat tamamlanınca sipariş doğrudan 'Tamamlandi' olmaz;
    // muhasebe (Burcu) 1. Peşinat + Final Maliyet girişini bekleyen ara aşamaya geçer.
    public async Task<int> CompleteShipmentToPendingAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo && o.SiparisMiTeklifMi == "Lojistik")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "TamamlanmaBekliyor"));

    // Round-9 §19 — Burcu finalize / istendiğinde erken kapatma:
    // Yalnızca "Siparis" ve sonraki aşamalar kapatılabilir (Teklif/Iptal/Silindi hariç).
    // Kapatıldığında Kontrol='Onay' ve LojistikOnay='Onay' yapılır.
    public async Task<int> FinalizeCompletionAsync(string siparisNo) =>
        await _context.SiparisAlTablo
            .Where(o => o.SiparisNo == siparisNo
                     && !o.Silindi
                     && o.SiparisMiTeklifMi != "Teklif"
                     && o.SiparisMiTeklifMi != "Iptal"
                     && o.SiparisMiTeklifMi != "Tamamlandi")
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.SiparisMiTeklifMi, "Tamamlandi")
                .SetProperty(o => o.Kontrol, "Onay")
                .SetProperty(o => o.LojistikOnay, "Onay"));

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

    public async Task<IReadOnlyList<Order>> GetQualityControlListAsync(DateTime approvedSince)
    {
        // Son X günde 'Onaylandi' audit'i olan sipariş no'ları (onay tarihi
        // SiparisOnaylari.OnayTarih'te; sipariş tablosunda QC onay tarihi yok).
        var recentlyApprovedNos = await _context.SiparisOnaylari
            .AsNoTracking()
            .Where(a => a.OnayDurumu == "Onaylandi"
                     && a.OnayTarih != null
                     && a.OnayTarih >= approvedSince)
            .Select(a => a.SiparisNo)
            .Distinct()
            .ToListAsync();

        // Bekleyen (Kontrol='Kontrol') TÜMÜ + son X günde onaylanan (Kontrol='Onay').
        return await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(o => !o.Silindi && ((o.Kontrol == "Kontrol" && o.SiparisMiTeklifMi != "Tamamlandi" && o.SiparisMiTeklifMi != "Iptal")
                     || (o.Kontrol == "Onay" && recentlyApprovedNos.Contains(o.SiparisNo))))
            .OrderByDescending(o => o.SiparisAlID)
            .ToListAsync();
    }

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
            .Where(OrderWorkflow.CiroPredicate)
            .CountAsync(o => o.Tarih >= cutoff);
    }

    public async Task<IReadOnlyDictionary<string, decimal>> SumCiroByCurrencyInLastDaysAsync(int days)
    {
        var cutoff = DateTime.Now.AddDays(-days);
        var rows = await _context.SiparisAlTablo
            .AsNoTracking()
            .Where(OrderWorkflow.CiroPredicate)
            .Where(o => o.Tarih >= cutoff)
            .GroupBy(o => o.ParaTipi)
            .Select(g => new { ParaTipi = g.Key, Toplam = g.Sum(x => x.ToplamFiyat ?? 0m) })
            .ToListAsync();

        return rows.ToDictionary(r => r.ParaTipi, r => r.Toplam);
    }

    public Task<int> CountBekleyenKontrolAsync() =>
        _context.SiparisAlTablo.AsNoTracking().CountAsync(o => !o.Silindi && o.Kontrol == "Kontrol" && (o.SiparisMiTeklifMi == "Teklif" || o.SiparisMiTeklifMi == "Siparis"));

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
            .Where(OrderWorkflow.CiroPredicate)
            .Where(o => o.Tarih >= cutoff)
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
            .Where(o => !o.Silindi)
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
            .Where(OrderWorkflow.CiroPredicate)
            .Where(o => o.Tarih >= cutoff)
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
            .Where(OrderWorkflow.CiroPredicate)
            .Where(o => o.Tarih >= cutoff)
            .GroupBy(o => o.ParaTipi)
            .Select(g => new CurrencyDistributionDto(
                g.Key,
                g.Count(),
                g.Sum(x => x.ToplamFiyat ?? 0m)))
            .ToListAsync();
        return rows;
    }
}
