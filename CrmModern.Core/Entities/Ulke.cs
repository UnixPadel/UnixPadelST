namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to UlkelerBilgileri table — schema unchanged.
/// </summary>
public sealed class Ulke
{
    public int     UlkelerID     { get; set; }
    public string  UlkeAdi       { get; set; } = string.Empty;
    public string  NumaraBirimi  { get; set; } = string.Empty;
    public string? Bolge         { get; set; }

    // Navigation property
    public ICollection<Musteri> Musteriler { get; set; } = [];
}
