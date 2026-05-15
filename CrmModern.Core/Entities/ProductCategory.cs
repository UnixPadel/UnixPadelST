namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to UrunKategorileri — schema unchanged.
/// Holds product categories (e.g. "Standard Padel Court") with their base prices.
/// </summary>
public sealed class ProductCategory
{
    public int     KategoriID  { get; set; }
    public string  KategoriAdi { get; set; } = string.Empty;
    public int Fiyat       { get; set; }

    // ── Navigation properties ─────────────────────────────────────────────
    public ICollection<CategoryComponent> CategoryComponents { get; set; } = [];
}
