namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to AntrepoStokCikis — bir stok kaleminden "araca yüklendi" işareti.
/// Satır silinmez: geri alma <see cref="GeriAlinmaZamani"/> doldurularak yapılır
/// (kim/ne zaman izlenebilsin). Sipariş/sevkiyat ile bağlantısı yoktur.
/// </summary>
public sealed class AntrepoStokCikis
{
    public int       Id                { get; set; }
    public int       KalemId           { get; set; }
    public decimal   Miktar            { get; set; }
    public decimal?  KapAdedi          { get; set; }
    public DateTime  Tarih             { get; set; }   // fiilen yüklenme günü
    public string?   Aciklama          { get; set; }   // plaka vb. serbest metin (eski Not)
    public int       GirenKullaniciID  { get; set; }
    public DateTime  KayitZamani       { get; set; }
    public DateTime? GeriAlinmaZamani  { get; set; }
    public int?      GeriAlanKullaniciID { get; set; }
}
