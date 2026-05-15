namespace CrmModern.Core.Entities;

/// <summary>
/// TamamlandiTablo — sipariş tamamlandığında basılan kayıt.
/// NOT: kolon adı "KullaniciAdi" ama tipi int (= KullaniciID). Şema değiştirilmedi,
/// property adı KullaniciID olarak yansıtılıyor; column rename yok, value-bind aynı kolona.
/// </summary>
public sealed class CompletedOrder
{
    public int       ID         { get; set; }
    public string?   SiparisNo  { get; set; }
    public int?      KullaniciID { get; set; }    // column: KullaniciAdi (int)
    public DateTime? Tarih      { get; set; }
}
