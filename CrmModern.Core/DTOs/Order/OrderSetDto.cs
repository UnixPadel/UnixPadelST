namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Represents one of the up-to-five product tab pages in the order form.
/// Maps to one category-level SiparisIslemTablo row plus N component rows.
/// </summary>
public sealed record OrderSetDto(
    int     KategoriID,
    int     Adet,           // urunNumericUpDown value
    decimal KategoriFiyat,  // setFiyatTextBox value
    IReadOnlyList<OrderItemDto> Components
);
