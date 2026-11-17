namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to SiparisMuhasebeEk — Muhasebe Klasörü'ne yüklenen dosya.
/// Sipariş başına çok dosya; yeni yükleme öncekini silmez. Siparişe numara yerine
/// SiparisAlID ile bağlanır (teklif → sipariş dönüşümünde bağ kopmaz). Blob ayrı
/// tabloda: sipariş sorguları blob yüklemez. Orijinal ad + içerik tipi korunur.
/// </summary>
public sealed class OrderAccountingFile
{
    public int      EkID                 { get; set; }
    public int      SiparisAlID          { get; set; }
    public string   Ad                   { get; set; } = string.Empty;   // orijinal dosya adı
    public string   Tip                  { get; set; } = string.Empty;   // content-type (MIME)
    public long     Boyut                { get; set; }
    public byte[]   Veri                 { get; set; } = Array.Empty<byte>();
    public DateTime Tarih                { get; set; }
    public int?     YukleyenKullaniciID  { get; set; }
    public string?  YukleyenAdSoyad      { get; set; }

    // 40+ ergonomi K5 — yumuşak silme: silinen dosya klasörden gizlenir, geri yüklenebilir.
    public bool      Silindi             { get; set; }
    public DateTime? SilinmeTarihi       { get; set; }
    public int?      SilenKullaniciID    { get; set; }
}
