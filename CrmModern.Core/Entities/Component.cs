namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to BilesenBilgileri — schema unchanged.
/// Represents a single component/part that can be included in a product category.
/// </summary>
public sealed class Component
{
    public int     BilesenID  { get; set; }
    public string  BilesenAdi { get; set; } = string.Empty;
    public string? Birim      { get; set; }
    public decimal? Fiyat     { get; set; }   // DB: decimal(10,2) (migrator int→decimal genişletti — Panoramik cıvata listesi kuruşlu)

    // ── Navigation properties ─────────────────────────────────────────────
    public ICollection<Attribute>         Attributes         { get; set; } = [];
    public ICollection<CategoryComponent> CategoryComponents { get; set; } = [];
}
