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
}
