namespace CrmModern.Core.Entities;

/// <summary>
/// Round-9 §9 — SatinAlmaTalepKalem: bir satın alma talebinin tek satır (kalem)
/// kaydı. Parent <see cref="PurchaseRequest"/> (SatinAlmaTalep) değişmeden kalır;
/// genel toplam parent.UrunMaliyeti'nde tutulur. Eski talepler kalemsiz çalışır.
///
/// FiyatModu:   'miktar' (Miktar × BirimFiyat) | 'toplam' (Toplam + İndirim)
/// IndirimTipi: 'yuzde' (%) | 'tutar' (mutlak)  — yalnız 'toplam' modunda anlamlı
/// </summary>
public sealed class PurchaseRequestLine
{
    public int      KalemID     { get; set; }
    public int      TalepID     { get; set; }
    public string   UrunAdi     { get; set; } = string.Empty;
    public string   Birim       { get; set; } = string.Empty;
    public decimal  Miktar      { get; set; }
    public decimal? BirimFiyat  { get; set; }
    public decimal  Toplam      { get; set; }
    public decimal? Indirim     { get; set; }
    public string?  IndirimTipi { get; set; }
    public string   FiyatModu   { get; set; } = "miktar";
}
