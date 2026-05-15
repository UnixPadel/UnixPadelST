namespace CrmModern.Core.Entities;

/// <summary>
/// UrunMaliyetTablo — sipariş başına kategori bazlı maliyet kaydı.
/// Faz 3'te SADECE OKU (material-cost endpoint için); yazma Faz 5 (muhasebe).
/// </summary>
public sealed class ProductCost
{
    public int      MaliyetID      { get; set; }
    public string   SiparisNo      { get; set; } = string.Empty;
    public int      KategoriID     { get; set; }
    public decimal  Malzeme        { get; set; }
    public decimal  Iscilik        { get; set; }
    public decimal  Nakliye        { get; set; }
    public decimal  Diger          { get; set; }
    public int      GirenKullanici { get; set; }
    public DateTime GirisTarih     { get; set; }
}
