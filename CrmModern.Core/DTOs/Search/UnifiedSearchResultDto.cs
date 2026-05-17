namespace CrmModern.Core.DTOs.Search;

/// <summary>
/// Topbar global aramanın tüm kategorilerini içeren cevap.
/// Frontend kategori başlığı altında gruplayarak gösterecek.
/// </summary>
public sealed record UnifiedSearchResultDto(
    string  Query,
    int     ToplamSonuc,
    IReadOnlyList<UnifiedSearchHitDto> Sonuclar);
