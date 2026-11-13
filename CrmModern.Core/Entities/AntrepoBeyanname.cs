namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to AntrepoBeyanname — yüklenen (ya da elle girilen) gümrük beyannamesinin başlığı.
/// Beyanname numarası isteğe bağlıdır (elle girilen ve numarasız kayıtlar için null);
/// doluysa tekildir. Orijinal belge (PDF/görsel) aynı satırda LONGBLOB olarak saklanır —
/// liste sorguları entity yerine projeksiyon kullanır, bu yüzden blob yüklenmez.
/// </summary>
public sealed class AntrepoBeyanname
{
    public int       Id                  { get; set; }
    public string?   BeyannameNo         { get; set; }   // örn. 26341200AN000123; tekil, null olabilir
    public DateTime? TescilTarihi        { get; set; }
    public string?   RejimKodu           { get; set; }   // kutu 1 (IM, AN …)
    public string?   GumrukIdaresi       { get; set; }   // kutu A
    public string?   Gonderici           { get; set; }   // kutu 2
    public string?   Alici               { get; set; }   // kutu 8
    public string?   Doviz               { get; set; }   // kutu 22 (USD, EUR …)
    public decimal?  FaturaTutari        { get; set; }   // kutu 22
    public decimal?  Kur                 { get; set; }   // kutu 23
    public string    Kaynak              { get; set; } = "Elle";   // Otomatik | Elle
    public string?   BelgeAdi            { get; set; }
    public string?   BelgeTip            { get; set; }   // MIME
    public byte[]?   Belge               { get; set; }
    public string?   HamJson             { get; set; }   // Gemini'nin ham çıktısı (denetim için)
    public int       YukleyenKullaniciID { get; set; }
    public DateTime  YuklemeTarihi       { get; set; }
}
