namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Serbest metin (Özel Kalem) — master BilesenBilgileri'ne yazmadan doğrudan
/// SiparisIslemTablo'da saklanır. KategoriID = null, BilesenID = null.
/// </summary>
public sealed record FreeItemDto(
    string  BilesenAdi,    // Kullanıcının girdiği ad (zorunlu)
    string? OznitelikAdi,  // Opsiyonel özellik
    string? Birim,         // Adet / Set / m² / kg / Metre vb.
    int     Adet,
    decimal Fiyat          // Birim fiyat
);
