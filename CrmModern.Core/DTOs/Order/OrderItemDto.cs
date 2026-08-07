namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Single row from SiparisIslemTablo.
/// KategoriID is set and BilesenID is null for category-level rows.
/// BilesenID is set and KategoriID is null for component-level rows.
/// KategoriID = null and BilesenID = null for free-text (custom) rows.
/// </summary>
public sealed record OrderItemDto(
    int?    KategoriID,
    int?    BilesenID,
    string? OznitelikAdi,
    int      Adet,
    decimal? Fiyat,
    // PROMPT-v4 §4.3 — Kontrol ekranı Ürün & Bileşen grid'i için isim çözümlemesi
    // (legacy LEFT JOIN UrunKategorileri / BilesenBilgileri). Create yolunda null kalır.
    string? KategoriAdi = null,
    string? BilesenAdi  = null,
    string? Birim       = null,
    // Serbest metin (Özel Kalem) alanları — yalnız custom satırlarda dolu.
    string? SBilesenAdi = null,
    string? SBirim      = null
);
