using CrmModern.Core.DTOs.Search;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Yapılandırılmış sipariş araması (Ara.cs WinForms portu) ve Faz 7 unified search.
/// </summary>
internal sealed class SearchService(IUnitOfWork uow) : ISearchService
{
    private const int CategoryLimit = 5;

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

        return orders.Select(o =>
        {
            decimal odenen      = o.OdenenMiktar ?? 0m;
            decimal toplam      = o.ToplamFiyat  ?? 0m;
            decimal pesinOran   = o.PesinYüzde / 100m;
            decimal kaparo      = Math.Max(toplam * pesinOran - odenen, 0m);
            decimal kalanBakiye = toplam - odenen;

            return new SearchResultDto(
                o.SiparisNo, o.TeklifNo, o.MusteriAd, o.MUlke, o.KullaniciID,
                o.ParaTipi, o.ToplamFiyat, kaparo, kalanBakiye,
                o.OdenenMiktar, o.OdemeDurum,
                o.SiparisMiTeklifMi, o.Kontrol, o.Tarih, o.Sirket);
        }).ToList().AsReadOnly();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FAZ 7 — Unified (Topbar) Global Search
    // WinForms'ta yoktu — modern UI özelliği.
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<UnifiedSearchResultDto> UnifiedSearchAsync(string query, string role)
    {
        var trimmed = (query ?? string.Empty).Trim();
        if (trimmed.Length < 2)
            return new UnifiedSearchResultDto(trimmed, 0, Array.Empty<UnifiedSearchHitDto>());

        // ── Rol bazlı kategori yetkileri ──────────────────────────────────────
        bool canSeeOrders     = true;
        bool canSeeMusteri    = true;
        bool canSeeBilesen    = role is "Yonetici" or "Muhasebe" or "Fabrika";
        bool canSeeKategori   = role is "Yonetici" or "Muhasebe" or "Fabrika";
        bool canSeeKullanici  = role == "Yonetici";
        bool canSeeSatinAlma  = role is "Yonetici" or "Muhasebe" or "Gozlemci" or "Fabrika" or "Lojistik";

        // ── Paralel sorgular ──────────────────────────────────────────────────
        var orderTask    = canSeeOrders    ? uow.Orders.QuickFindAsync(trimmed, CategoryLimit)
                                           : Task.FromResult<IReadOnlyList<Core.Entities.Order>>(Array.Empty<Core.Entities.Order>());
        var musteriTask  = canSeeMusteri   ? uow.Musteriler.QuickFindAsync(trimmed, CategoryLimit)
                                           : Task.FromResult<IReadOnlyList<Core.Entities.Musteri>>(Array.Empty<Core.Entities.Musteri>());
        var bilesenTask  = canSeeBilesen   ? uow.Components.QuickFindAsync(trimmed, CategoryLimit)
                                           : Task.FromResult<IReadOnlyList<Core.Entities.Component>>(Array.Empty<Core.Entities.Component>());
        var kategoriTask = canSeeKategori  ? uow.ProductCategories.QuickFindAsync(trimmed, CategoryLimit)
                                           : Task.FromResult<IReadOnlyList<Core.Entities.ProductCategory>>(Array.Empty<Core.Entities.ProductCategory>());
        var kullaniciTask= canSeeKullanici ? uow.Kullanicilar.QuickFindAsync(trimmed, CategoryLimit)
                                           : Task.FromResult<IReadOnlyList<Core.Entities.Kullanici>>(Array.Empty<Core.Entities.Kullanici>());
        var purchaseTask = canSeeSatinAlma ? uow.PurchaseRequests.QuickFindAsync(trimmed, CategoryLimit)
                                           : Task.FromResult<IReadOnlyList<Core.Entities.PurchaseRequest>>(Array.Empty<Core.Entities.PurchaseRequest>());

        await Task.WhenAll(orderTask, musteriTask, bilesenTask, kategoriTask, kullaniciTask, purchaseTask);

        // ── Map → DTO ─────────────────────────────────────────────────────────
        var hits = new List<UnifiedSearchHitDto>();

        foreach (var o in orderTask.Result)
        {
            string numara = o.SiparisMiTeklifMi == "Teklif" && !string.IsNullOrEmpty(o.TeklifNo)
                ? o.TeklifNo : o.SiparisNo;
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Sipariş",
                Id:          o.SiparisNo,
                Baslik:      $"{numara} — {o.MusteriAd}",
                AltMetin:    $"{o.SiparisMiTeklifMi} • {o.ParaTipi} • {o.Tarih:dd.MM.yyyy}",
                NavigateUrl: $"/orders/{Uri.EscapeDataString(o.SiparisNo)}"));
        }

        foreach (var m in musteriTask.Result)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Müşteri",
                Id:          m.MusteriID.ToString(),
                Baslik:      m.MusteriAd,
                AltMetin:    string.IsNullOrEmpty(m.E_Mail) ? m.Telefon : m.E_Mail,
                NavigateUrl: $"/customers/{m.MusteriID}"));
        }

        foreach (var b in bilesenTask.Result)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Bileşen",
                Id:          b.BilesenID.ToString(),
                Baslik:      b.BilesenAdi,
                AltMetin:    b.Birim,
                NavigateUrl: $"/product-catalog/components/{b.BilesenID}"));
        }

        foreach (var k in kategoriTask.Result)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Kategori",
                Id:          k.KategoriID.ToString(),
                Baslik:      k.KategoriAdi,
                AltMetin:    $"Fiyat: {k.Fiyat}",
                NavigateUrl: $"/product-catalog/categories/{k.KategoriID}"));
        }

        foreach (var u in kullaniciTask.Result)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Kullanıcı",
                Id:          u.KullaniciID.ToString(),
                Baslik:      $"{u.Ad} {u.Soyad}".Trim(),
                AltMetin:    $"{u.KullaniciAdi} • {u.YetkiTuru}",
                NavigateUrl: $"/users/{u.KullaniciID}"));
        }

        foreach (var p in purchaseTask.Result)
        {
            hits.Add(new UnifiedSearchHitDto(
                Kategori:    "Satın Alma Talep",
                Id:          p.TalepID.ToString(),
                Baslik:      p.UrunAdi,
                AltMetin:    $"{p.Departman ?? "-"} • {p.Durum} • {p.TalepTarihi:dd.MM.yyyy}",
                NavigateUrl: $"/purchase/{p.TalepID}"));
        }

        return new UnifiedSearchResultDto(trimmed, hits.Count, hits);
    }
}
