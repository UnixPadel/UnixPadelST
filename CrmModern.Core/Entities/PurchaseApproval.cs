namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to TalepOnaylari — Satın Alma talep aşama log'u (Faz 8.4 yeni).
/// Tablo `DatabaseSchemaMigrator` ile CREATE IF NOT EXISTS yapılır.
/// Asama: "OnOnay" | "OdemeDetay" | "NihaiOnay"
/// Durum: "Onaylandı" | "Reddedildi" | "MuhasebeTamamlandı"
/// </summary>
public sealed class PurchaseApproval
{
    public int       OnayID       { get; set; }
    public int       TalepID      { get; set; }
    public string    Asama        { get; set; } = string.Empty;
    public string    Durum        { get; set; } = string.Empty;
    public string    KullaniciAdi { get; set; } = string.Empty;
    public DateTime  Tarih        { get; set; }
    public string?   Not          { get; set; }
}
