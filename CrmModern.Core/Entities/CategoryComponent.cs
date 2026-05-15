namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to KategoriBilesenleri — schema unchanged.
/// Join table with payload: records which components belong to a category
/// and their default quantity (Adet) for that category.
/// </summary>
public sealed class CategoryComponent
{
    public int KategoriID { get; set; }
    public int BilesenID  { get; set; }
    public int Adet       { get; set; }   // default quantity for this component in this category

    // ── Navigation properties ─────────────────────────────────────────────
    public ProductCategory? Category  { get; set; }
    public Component?       Component { get; set; }
}
