namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Single row from SiparisIslemTablo.
/// KategoriID is set and BilesenID is null for category-level rows.
/// BilesenID is set and KategoriID is null for component-level rows.
/// </summary>
public sealed record OrderItemDto(
    int?    KategoriID,
    int?    BilesenID,
    string? OznitelikAdi,
    int      Adet,
    decimal? Fiyat
);
