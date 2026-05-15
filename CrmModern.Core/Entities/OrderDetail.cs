namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to DetayTablo — schema unchanged.
/// Free-text detail rows attached to an order (selected via checkbox in the UI).
/// Column "Detay" maps to property Text to avoid a name collision with the class.
/// </summary>
public sealed class OrderDetail
{
    public int    DetayID   { get; set; }
    public string SiparisNo { get; set; } = string.Empty;
    public string Text      { get; set; } = string.Empty;   // column: Detay

    // ── Navigation properties ─────────────────────────────────────────────
    public Order? Order { get; set; }
}
