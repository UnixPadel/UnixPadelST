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
    /// </summary>
    Task<UnifiedSearchResultDto> UnifiedSearchAsync(string query, string role);
}
