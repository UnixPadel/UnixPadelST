namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to MusteriBilgileri table — schema unchanged.
/// </summary>
public sealed class Musteri
{
    public int    MusteriID    { get; set; }
    public string MusteriAd    { get; set; } = string.Empty;
    public string Telefon      { get; set; } = string.Empty;
    public string ZipKod       { get; set; } = string.Empty;
    public string E_Mail       { get; set; } = string.Empty;
    public string Adres        { get; set; } = string.Empty;
    public string VATNumarasi  { get; set; } = string.Empty;
    public int    UlkelerID    { get; set; }

    // Navigation property
    public Ulke? Ulke { get; set; }
}
