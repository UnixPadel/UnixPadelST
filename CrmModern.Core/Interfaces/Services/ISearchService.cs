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
    /// PROMPT-v2 §6/§7: Temsilci için sipariş + müşteri sonuçları kendi user id'sine
    /// kısıtlanır; <paramref name="currentUserId"/> null ise kısıtlama uygulanmaz.
    /// </summary>
    Task<UnifiedSearchResultDto> UnifiedSearchAsync(string query, string role, int? currentUserId = null);
}
