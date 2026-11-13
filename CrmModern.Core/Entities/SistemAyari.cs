namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to SistemAyarlari — anahtar/değer tabanlı, tüm istemciler için ortak ayarlar
/// (şimdilik Gemini API anahtarı ve son kullanım durumu). Hassas değerler
/// (<c>Deger</c>) servis tarafından şifrelenerek yazılır; düz metin saklanmaz.
/// </summary>
public sealed class SistemAyari
{
    public string    Anahtar               { get; set; } = string.Empty;
    public string?   Deger                 { get; set; }
    public int?      GuncelleyenKullaniciID { get; set; }
    public DateTime  GuncellemeZamani      { get; set; }
}
