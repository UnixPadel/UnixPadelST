namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to AntrepoStokKalem — antrepoda ya da depoda bekleyen tek bir mal satırı.
/// Beyanname bağlantısı isteğe bağlıdır (<see cref="BeyannameId"/> null olabilir).
/// "Kalan" miktar saklanmaz: Miktar − Σ(geri alınmamış <see cref="AntrepoStokCikis"/>).
/// Mevcut StokTablo (üretim stoğu) ile ilgisi yoktur.
/// </summary>
public sealed class AntrepoStokKalem
{
    public int      Id                  { get; set; }
    public int?     BeyannameId         { get; set; }
    public string   Konum               { get; set; } = "Antrepo";   // Antrepo | Depo
    public string   MalAdi              { get; set; } = string.Empty; // kısa ad (kullanıcı verir)
    public string?  TicariTanim         { get; set; }                 // kutu 31
    public decimal  Miktar              { get; set; }                 // kutu 41 (ya da yedek kaynak)
    public string   Birim               { get; set; } = "ADET";
    public decimal? KapAdedi            { get; set; }
    public string?  KapCinsi            { get; set; }
    public string?  Gtip                { get; set; }                 // kutu 33
    public string?  MenseUlke           { get; set; }                 // kutu 34
    public decimal? BrutKg              { get; set; }                 // kutu 35
    public decimal? NetKg               { get; set; }                 // kutu 38
    public int?     KalemNo             { get; set; }                 // kutu 32
    public decimal? KalemFiyati         { get; set; }                 // kutu 42
    public int      OlusturanKullaniciID { get; set; }
    public DateTime OlusturmaTarihi     { get; set; }
}
