namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to LojistikTablo — one row per logistics shipment event.
/// KullaniciAdi column stores KullaniciID (int) — preserved from legacy schema.
/// </summary>
public sealed class LogisticsEntry
{
    public int     ID            { get; set; }
    public int     KullaniciAdi  { get; set; }   // FK → KullaniciBilgileri (column name preserved)
    public string  SiparisNo     { get; set; } = string.Empty;
    public string  FirmaAdi      { get; set; } = string.Empty;
    public string  LojistikCesit { get; set; } = string.Empty;
    public decimal Fiyat         { get; set; }
    public string? LNot          { get; set; }
}
