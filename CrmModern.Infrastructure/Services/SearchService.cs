using CrmModern.Core.DTOs.Search;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;
using CrmModern.Core.Search;
using CrmModern.Core.Workflow;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Yapılandırılmış sipariş araması (Ara.cs WinForms portu), Faz 7 unified search ve
/// tek kutudan sipariş/teklif araması.
/// </summary>
internal sealed class SearchService(IUnitOfWork uow) : ISearchService
{
    private const int CategoryLimit = 5;
    private const int MaxOrderResults = 100;

    public async Task<IReadOnlyList<SearchResultDto>> SearchAsync(SearchFilterDto filter)
    {
        var orders = await uow.Orders.SearchAsync(
            filter.SiparisNo,
            filter.MusteriAd,
            filter.KullaniciID,
            filter.Ulke,
            filter.Asama,
            filter.Kontrol,
            filter.OdemeDurum,
            filter.Baslangic,
            filter.Bitis);

        // Oluşturan kullanıcı adları (legacy Ara formu KullaniciBilgileri join'i).
        var users = (await uow.Kullanicilar.GetAllAsync())
            .ToDictionary(u => u.KullaniciID, u => u.KullaniciAdi);

        return orders.Select(o =>
        {
            decimal odenen      = o.OdenenMiktar ?? 0m;
            decimal toplam      = o.ToplamFiyat  ?? 0m;
            decimal pesinOran   = o.PesinYüzde / 100m;
            decimal kaparo      = Math.Max(toplam * pesinOran - odenen, 0m);
            decimal kalanBakiye = toplam - odenen;

            return new SearchResultDto(
                o.SiparisNo, o.TeklifNo, o.MusteriAd, o.MUlke, o.KullaniciID,
                users.TryGetValue(o.KullaniciID, out var kAdi) ? kAdi : null,
                o.ParaTipi, o.ToplamFiyat, kaparo, kalanBakiye,
                o.OdenenMiktar, o.OdemeDurum,
                o.SiparisMiTeklifMi, o.Kontrol, o.Tarih, o.Sirket);
        }).ToList().AsReadOnly();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FAZ 7 — Unified (Topbar) Global Search
    // WinForms'ta yoktu — modern UI özelliği.
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<UnifiedSearchResultDto> UnifiedSearchAsync(
        string query, string role, int? onlyKullaniciId = null, bool canSeeMoney = true)
    {
        var trimmed = (query ?? string.Empty).Trim();
        if (trimmed.Length < OrderSearchMatcher.MinQueryLength)
            return new UnifiedSearchResultDto(trimmed, 0, Array.Empty<UnifiedSearchHitDto>());

        // ── Rol bazlı kategori yetkileri ──────────────────────────────────────
        bool canSeeBilesen    = role is "Yonetici" or "Muhasebe" or "Fabrika";
        bool canSeeKategori   = role is "Yonetici" or "Muhasebe" or "Fabrika";
        bool canSeeKullanici  = role == "Yonetici";
        bool canSeeSatinAlma  = role is "Yonetici" or "Muhasebe" or "Gozlemci" or "Fabrika" or "Lojistik";

        // Sorgular sırayla çalışır: tüm depolar aynı istek kapsamlı DbContext'i paylaşır.
        // Sahiplik filtresi eşleştirmeden önce uygulanır; ilk N sonuca sonradan kesilmez.
        var orders = await FindOrdersAsync(new OrderSearchRequest(
            trimmed, OnlyKullaniciId: onlyKullaniciId, CanSeeMoney: canSeeMoney, Limit: CategoryLimit));
        var musteriler = await uow.Musteriler.QuickFindAsync(trimmed, CategoryLimit);
        IReadOnlyList<Core.Entities.Component> bilesenler = canSeeBilesen
            ? await uow.Components.QuickFindAsync(trimmed, CategoryLimit) : [];
        IReadOnlyList<Core.Entities.ProductCategory> kategoriler = canSeeKategori
            ? await uow.ProductCategories.QuickFindAsync(trimmed, CategoryLimit) : [];
        IReadOnlyList<Core.Entities.Kullanici> kullanicilar = canSeeKullanici
            ? await uow.Kullanicilar.QuickFindAsync(trimmed, CategoryLimit) : [];
        IReadOnlyList<Core.Entities.PurchaseRequest> talepler = canSeeSatinAlma
            ? await uow.PurchaseRequests.QuickFindAsync(trimmed, CategoryLimit) : [];

        // ── Map → DTO ─────────────────────────────────────────────────────────
        var hits = new List<UnifiedSearchHitDto>();
        var encodedQuery = Uri.EscapeDataString(trimmed);

        foreach (var o in orders.Sonuclar)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Sipariş",
                Id:          o.SiparisNo,
                Baslik:      $"{o.BelgeNo} — {o.MusteriAd}",
                AltMetin:    $"{o.Asama} • {o.ParaTipi} • {o.Tarih:dd.MM.yyyy}",
                NavigateUrl: $"/search?f.q={encodedQuery}&sel={Uri.EscapeDataString(o.SiparisNo)}",
                Siparis:     new OrderHitSummaryDto(o.Tur, o.Asama, o.Kontrol, o.Silindi, o.StepCode, o.Department)));
        }

        // PROMPT-v2 §7: kısıtlı kullanıcı yalnız kendi oluşturduğu müşterileri görür.
        var scopedMusteri = onlyKullaniciId is int muid
            ? musteriler.Where(m => m.CreatedByKullaniciID == muid)
            : musteriler;

        foreach (var m in scopedMusteri)
        {
            // Müşteri sonucu, o müşterinin teklif ve siparişlerini listeler.
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Müşteri",
                Id:          m.MusteriID.ToString(),
                Baslik:      m.MusteriAd,
                AltMetin:    string.IsNullOrEmpty(m.E_Mail) ? m.Telefon : m.E_Mail,
                NavigateUrl: $"/search?f.q={Uri.EscapeDataString(m.MusteriAd)}"));
        }

        foreach (var b in bilesenler)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Bileşen",
                Id:          b.BilesenID.ToString(),
                Baslik:      b.BilesenAdi,
                AltMetin:    b.Birim,
                NavigateUrl: $"/product-catalog/components/{b.BilesenID}"));
        }

        foreach (var k in kategoriler)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Kategori",
                Id:          k.KategoriID.ToString(),
                Baslik:      k.KategoriAdi,
                AltMetin:    $"Fiyat: {k.Fiyat}",
                NavigateUrl: $"/product-catalog/categories/{k.KategoriID}"));
        }

        foreach (var u in kullanicilar)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Kullanıcı",
                Id:          u.KullaniciID.ToString(),
                Baslik:      $"{u.Ad} {u.Soyad}".Trim(),
                AltMetin:    $"{u.KullaniciAdi} • {u.YetkiTuru}",
                NavigateUrl: $"/users/{u.KullaniciID}"));
        }

        foreach (var p in talepler)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Satın Alma Talep",
                Id:          p.TalepID.ToString(),
                Baslik:      p.UrunAdi,
                AltMetin:    $"{p.Departman ?? "-"} • {p.Durum} • {p.TalepTarihi:dd.MM.yyyy}",
                NavigateUrl: $"/purchase/{p.TalepID}"));
        }

        return new UnifiedSearchResultDto(trimmed, hits.Count, hits, orders.Toplam);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Sipariş ve teklif araması (Sipariş Ara ekranı + üst arama kutusu)
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<OrderSearchResultDto> FindOrdersAsync(OrderSearchRequest request)
    {
        var query  = (request.Q ?? string.Empty).Trim();
        var tokens = OrderSearchMatcher.Parse(query);
        var hasFilter = !string.IsNullOrWhiteSpace(request.Tur)
            || !string.IsNullOrWhiteSpace(request.Asama)
            || !string.IsNullOrWhiteSpace(request.Kontrol)
            || !string.IsNullOrWhiteSpace(request.Ulke)
            || request.Baslangic.HasValue
            || request.Bitis.HasValue;

        if (tokens.Count == 0 && !hasFilter)
            return new OrderSearchResultDto(query, 0, []);

        var rows = await uow.Orders.GetSearchRowsAsync(request.OnlyKullaniciId);
        var users = (await uow.Kullanicilar.GetAllAsync()).ToDictionary(u => u.KullaniciID);
        var items = tokens.Count > 0
            ? GroupItemNames(await uow.Orders.GetSearchItemNamesAsync(request.OnlyKullaniciId))
            : new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        var ulke = OrderSearchMatcher.Fold(request.Ulke?.Trim());
        var bitisHaric = request.Bitis?.Date.AddDays(1);
        var matches = new List<(Order Order, OrderSearchMatch Match, string? Temsilci)>();

        foreach (var o in rows)
        {
            if (!PassesFilters(o, request, ulke, bitisHaric)) continue;

            users.TryGetValue(o.KullaniciID, out var user);
            var temsilci = user is null ? null : $"{user.Ad} {user.Soyad}".Trim();
            var aranan = user is null ? null : $"{temsilci} {user.KullaniciAdi}";
            items.TryGetValue(o.SiparisNo, out var urunler);

            var match = OrderSearchMatcher.Match(o, aranan, urunler, tokens, request.CanSeeMoney);
            if (match is not null) matches.Add((o, match, temsilci));
        }

        var sonuclar = matches
            .OrderByDescending(m => m.Match.Score)
            .ThenByDescending(m => m.Order.SiparisAlID)
            .Take(Math.Clamp(request.Limit, 1, MaxOrderResults))
            .Select(m => ToHit(m.Order, m.Match, m.Temsilci, request.CanSeeMoney))
            .ToList();

        return new OrderSearchResultDto(query, matches.Count, sonuclar);
    }

    private static bool PassesFilters(Order o, OrderSearchRequest r, string ulke, DateTime? bitisHaric)
    {
        if (r.Tur == "Teklif" && o.SiparisMiTeklifMi != "Teklif") return false;
        if (r.Tur == "Siparis" && o.SiparisMiTeklifMi == "Teklif") return false;
        if (!string.IsNullOrWhiteSpace(r.Asama) && o.SiparisMiTeklifMi != r.Asama) return false;
        if (!string.IsNullOrWhiteSpace(r.Kontrol) && o.Kontrol != r.Kontrol) return false;
        if (ulke.Length > 0 && !OrderSearchMatcher.Fold(o.MUlke).Contains(ulke, StringComparison.Ordinal)) return false;
        if (r.Baslangic is DateTime bas && o.Tarih < bas.Date) return false;
        if (bitisHaric is DateTime bit && o.Tarih >= bit) return false;
        return true;
    }

    private static Dictionary<string, List<string>> GroupItemNames(IEnumerable<OrderSearchItemName> rows)
    {
        var map = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            if (!map.TryGetValue(row.SiparisNo, out var names))
                map[row.SiparisNo] = names = [];

            foreach (var name in new[] { row.Kategori, row.Bilesen, row.Serbest, row.Oznitelik })
                if (!string.IsNullOrWhiteSpace(name) && !names.Contains(name, StringComparer.Ordinal))
                    names.Add(name);
        }
        return map;
    }

    private static OrderSearchHitDto ToHit(Order o, OrderSearchMatch match, string? temsilci, bool canSeeMoney)
    {
        var teklif = o.SiparisMiTeklifMi == "Teklif";
        // Silinmiş kayıt hiçbir kuyrukta beklemez; adım yalnız canlı kayıtta hesaplanır.
        var step = o.Silindi ? null : OrderWorkflow.CurrentStep(o);
        decimal? kalan = o.ToplamFiyat is decimal toplam ? toplam - (o.OdenenMiktar ?? 0m) : null;

        return new OrderSearchHitDto(
            o.SiparisNo,
            o.TeklifNo,
            teklif && !string.IsNullOrEmpty(o.TeklifNo) ? o.TeklifNo : o.SiparisNo,
            teklif ? "Teklif" : "Siparis",
            o.SiparisMiTeklifMi,
            o.Kontrol,
            o.Silindi,
            step?.Code,
            step?.Department,
            o.MusteriAd,
            o.MUlke,
            o.MTelefon,
            o.MMail,
            o.MVATNumarasi,
            o.MAdres,
            o.KullaniciID,
            temsilci,
            o.Sirket,
            o.Tarih,
            o.ParaTipi,
            canSeeMoney ? o.ToplamFiyat : null,
            canSeeMoney ? o.BrutToplamFiyat : null,
            canSeeMoney ? o.OdenenMiktar : null,
            canSeeMoney ? kalan : null,
            canSeeMoney ? o.PesinYüzde : null,
            o.OdemeDurum,
            match.Fields);
    }
}
