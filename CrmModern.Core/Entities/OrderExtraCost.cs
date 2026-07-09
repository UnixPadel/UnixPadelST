namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to SiparisEkMaliyet — bir sipariş/teklife muhasebe tarafından eklenen
/// ekstra maliyet kalemi (açıklama + tutar). Her kalem proformada ayrı bir satır
/// olarak render edilir; tutarı sipariş toplamına (ToplamFiyat/BrutToplamFiyat)
/// eklenir. Ayrı tablo tutulur → sipariş çekirdek kalemlerine (SiparisIslemTablo)
/// dokunulmaz, ekleme/silme geri alınabilir kalır.
/// </summary>
public sealed class OrderExtraCost
{
    public int      EkMaliyetID   { get; set; }
    public int      SiparisAlID   { get; set; }   // FK → SiparisAlTablo.SiparisAlID
    public string   Aciklama      { get; set; } = string.Empty;
    public decimal  Tutar         { get; set; }
    public DateTime EklenmeTarihi { get; set; }
    public int?     KullaniciID   { get; set; }
}
