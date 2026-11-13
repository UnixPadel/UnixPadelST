namespace CrmModern.Core;

/// <summary>
/// Antrepo &amp; Depo Stokları modülünün ayarlanabilir iş kuralları.
/// Değerler tek yerde tutulur; ileride değiştirilecekleri için buradan okunur.
/// Bkz. docs/antrepo-stok-notlar.md
/// </summary>
public static class WarehouseStockRules
{
    /// <summary>
    /// GEÇİCİ DEĞER — Çıkış (araca yükleme) kaydının geri alınabileceği süre (gün).
    /// Kayıt tarihinden itibaren bu süre geçince giren kişi de Yönetici de geri alamaz.
    /// İleride düzenlenecek (örn. Sistem Ayarları ekranından yönetilebilir yapılabilir).
    /// </summary>
    public const int CikisGeriAlmaSuresiGun = 30;

    public const string KonumAntrepo = "Antrepo";
    public const string KonumDepo    = "Depo";

    public const string KaynakOtomatik = "Otomatik";
    public const string KaynakElle     = "Elle";

    /// <summary>Yüklenebilecek belgenin en büyük boyutu (bayt) — 10 MB.</summary>
    public const long MaxBelgeBayt = 10L * 1024 * 1024;

    public static bool GecerliKonum(string? konum) =>
        konum == KonumAntrepo || konum == KonumDepo;
}
