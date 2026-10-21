namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to MuhasebeIslemTablo — one row per payment received for an order.
/// </summary>
public sealed class AccountingTransaction
{
    public int      ID           { get; set; }
    public string   SiparisNo    { get; set; } = string.Empty;
    public int      MusteriID    { get; set; }
    public int      KullaniciID  { get; set; }
    public decimal? OdenenMiktar { get; set; }
    public DateTime Tarih        { get; set; }

    // Tahsilat iptali (yumuşak): satır silinmez, iz kalır. İptal satırları global
    // query filter ile tüm toplamlardan / listelerden düşer.
    public bool      Iptal            { get; set; }
    public string?   IptalGerekce     { get; set; }
    public int?      IptalKullaniciID { get; set; }
    public DateTime? IptalTarihi      { get; set; }
}
