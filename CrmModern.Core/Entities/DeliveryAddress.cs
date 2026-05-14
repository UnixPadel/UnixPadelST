namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to TeslimatBilgisiTablo — schema unchanged.
/// Reusable delivery address book; rows are upserted on order save
/// (insert only if TeslimAlanAdi is new).
/// </summary>
public sealed class DeliveryAddress
{
    public int     TeslimatBilgiID { get; set; }
    public string  TeslimAlanAdi   { get; set; } = string.Empty;
    public string? IlgiliKisi      { get; set; }
    public int?    UlkeID          { get; set; }
    public string? ZipKod          { get; set; }
    public string? Telefon         { get; set; }
    public string? AltTelefon      { get; set; }
    public string? TelUlkeKodu     { get; set; }
    public string? AltTelUlkeKodu  { get; set; }
    public string? E_Mail          { get; set; }
    public string? VATNumarasi     { get; set; }
    public string? Adres           { get; set; }

    // ── Navigation properties ─────────────────────────────────────────────
    public Ulke? Ulke { get; set; }
}
