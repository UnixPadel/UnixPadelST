namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to OznitelikTablo — schema unchanged.
/// Variant/attribute options for a component (e.g. glass thickness "10mm" / "12mm").
/// Column name is OznitelikAdı (with Turkish ı) — preserved exactly.
/// </summary>
public sealed class Attribute
{
    public int    OznitelikID  { get; set; }
    public int    BilesenID    { get; set; }
    public string OznitelikAdı { get; set; } = string.Empty;   // column: OznitelikAdı

    // ── Navigation properties ─────────────────────────────────────────────
    public Component? Component { get; set; }
}
