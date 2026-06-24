namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to SatinAlmaTalepEk — bir satın alma talebine eklenen dosya.
/// Blob ayrı tabloda tutulur: ana SatinAlmaTalep sorguları (liste/aşama) blob
/// yüklemez. Orijinal dosya adı + içerik tipi korunur (indirme doğru açılır).
/// </summary>
public sealed class PurchaseAttachment
{
    public int      EkID                 { get; set; }
    public int      TalepID              { get; set; }
    public string   Ad                   { get; set; } = string.Empty;      // orijinal dosya adı
    public string   Tip                  { get; set; } = string.Empty;      // content-type (MIME)
    public byte[]   Veri                 { get; set; } = Array.Empty<byte>();
    public DateTime Tarih                { get; set; }
    public string?  YukleyenKullaniciAdi { get; set; }
}
