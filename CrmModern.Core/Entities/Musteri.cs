namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to MusteriBilgileri table.
/// PROMPT-v2 §7: CreatedByKullaniciID kolonu Temsilci sahiplenmesini taşır
/// (DatabaseSchemaMigrator idempotent ALTER + earliest-order backfill).
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

    /// <summary>
    /// Müşteriyi sisteme ekleyen kullanıcının id'si (PROMPT-v2 §7).
    /// Geçmişte yaratılmış kayıtlarda ilk SiparisAlTablo.KullaniciID'sinden
    /// doldurulur; hiç sipariş yoksa NULL kalır (yalnız Yonetici görür).
    /// </summary>
    public int? CreatedByKullaniciID { get; set; }

    // Navigation property
    public Ulke? Ulke { get; set; }
}
