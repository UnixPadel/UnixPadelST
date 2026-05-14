namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to KullaniciBilgileri table — schema unchanged.
/// YetkiTuru values: Yonetici | Muhasebe | Fabrika | Gozlemci | Temsilci | Lojistik
/// Durum values:     Aktif | Pasif
/// </summary>
public sealed class Kullanici
{
    public int    KullaniciID  { get; set; }
    public string KullaniciAdi { get; set; } = string.Empty;
    public string Sifre        { get; set; } = string.Empty;
    public string Ad           { get; set; } = string.Empty;
    public string Soyad        { get; set; } = string.Empty;
    public string Email        { get; set; } = string.Empty;
    public string Telefon      { get; set; } = string.Empty;
    public string YetkiTuru    { get; set; } = string.Empty;
    public string Durum        { get; set; } = string.Empty;

    // KullaniciBilgileri tablosunda mevcut iki ek kolon — DB şemasını değiştirme,
    // sadece map'le. Form3 1449. satır INSERT bu kolonları yazıyor.
    public DateTime? OlusturmaTarihi  { get; set; }
    public bool      SatinAlmaYetkisi { get; set; }
}
