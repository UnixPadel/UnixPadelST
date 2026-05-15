namespace CrmModern.Core.Entities;

/// <summary>
/// SiparisOnaylari — onay/red audit log. Bir sipariş için her aşama
/// değişikliğinde bir satır eklenir.
/// </summary>
public sealed class OrderApproval
{
    public int       OnayID      { get; set; }
    public string    SiparisNo   { get; set; } = string.Empty;
    public int       KullaniciID { get; set; }
    public string    OnayDurumu  { get; set; } = "Beklemede";    // Beklemede | Onaylandi | Reddedildi | Submit | Convert
    public string?   Aciklama    { get; set; }
    public DateTime? OnayTarih   { get; set; }
}
