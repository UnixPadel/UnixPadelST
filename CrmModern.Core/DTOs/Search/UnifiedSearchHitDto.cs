namespace CrmModern.Core.DTOs.Search;

/// <summary>
/// Topbar global arama tek sonucu.
/// Kategori: "Sipariş" | "Müşteri" | "Bileşen" | "Kategori" | "Kullanıcı" | "Satın Alma Talep"
/// NavigateUrl: frontend React Router push hedefi.
/// </summary>
public sealed record UnifiedSearchHitDto(
    string  Kategori,
    string  Id,
    string  Baslik,
    string? AltMetin,
    string  NavigateUrl);
