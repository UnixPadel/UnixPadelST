using CrmModern.Core.DTOs.Search;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Yapılandırılmış sipariş araması (Ara.cs WinForms portu) ve
/// Faz 7 — Topbar global unified search.
/// </summary>
public interface ISearchService
{
    /// <summary>Ara.cs portu — yapılandırılmış filtreli sipariş arama.</summary>
    Task<IReadOnlyList<SearchResultDto>> SearchAsync(SearchFilterDto filter);

    /// <summary>
    /// Faz 7 — Topbar global arama. Tek query → birden çok kategori (Sipariş, Müşteri,
    /// Bileşen, Kategori, Kullanıcı, Satın Alma Talep) üzerinde paralel LIKE.
    /// Yetki: rol bazlı kategori filtresi.
    /// PROMPT-v2 §6/§7: sipariş + müşteri sonuçları <paramref name="onlyKullaniciId"/>
    /// doluysa o kullanıcıya kısıtlanır. Para görmeyen kullanıcı tutarla arayamaz.
    /// </summary>
    Task<UnifiedSearchResultDto> UnifiedSearchAsync(string query, string role, int? onlyKullaniciId = null, bool canSeeMoney = true);

    /// <summary>
    /// Tek kutudan sipariş ve teklif araması: no, müşteri, iletişim, adres, temsilci,
    /// ürün, durum, tarih ve tutar. Sonuç, siparişin beklediği adımı da taşır.
    /// </summary>
    Task<OrderSearchResultDto> FindOrdersAsync(OrderSearchRequest request);
}
