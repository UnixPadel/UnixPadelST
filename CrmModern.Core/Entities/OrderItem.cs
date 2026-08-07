namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to SiparisIslemTablo — schema unchanged.
/// Each row is either a category-level record (KategoriID set, BilesenID null)
/// or a component-level record (BilesenID set, KategoriID null).
/// </summary>
public sealed class OrderItem
{
    public int     SiparisIslemID { get; set; }
    public string  SiparisNo      { get; set; } = string.Empty;
    public string? TeklifNo       { get; set; }
    public int?    KategoriID     { get; set; }   // null for component rows
    public int?    BilesenID      { get; set; }   // null for category rows
    public string? OznitelikAdi   { get; set; }
    public int      Adet           { get; set; }
    public decimal? Fiyat          { get; set; }

    public string? SBilesenAdi   { get; set; }   // free-text component name (custom line item)
    public string? SBirim        { get; set; }   // free-text unit (custom line item)

    // ── Navigation properties ─────────────────────────────────────────────
    public Order?           Order    { get; set; }
    public ProductCategory? Category { get; set; }
    public Component?       Component { get; set; }
}
