namespace CrmModern.Core.DTOs.Dashboard;

/// <summary>
/// Round-8 §13 — Temsilci performans raporu (Yönetici-only). Bir tarih
/// aralığındaki, tek bir Temsilci'nin oluşturma/dönüşüm/onay metrikleri.
/// Silinmiş (Silindi) siparişler hariç tutulur.
/// </summary>
public sealed record RepPerformanceDto(
    int     KullaniciID,
    string  AdSoyad,
    int     Olusturulan,    // toplam oluşturulan (teklif + sipariş)
    int     Teklif,         // SiparisMiTeklifMi == 'Teklif'
    int     Siparis,        // siparişe ilerlemiş (Teklif/Iptal dışı)
    int     Onaylanan,      // Kontrol == 'Onay'
    int     Reddedilen,     // Kontrol == 'Reddet'
    int     Bekleyen,       // Kontrol == 'Kontrol'
    int     Tamamlanan,     // SiparisMiTeklifMi == 'Tamamlandi'
    decimal DonusumOrani,   // % (siparis / olusturulan)
    decimal CiroEuro,
    decimal CiroDolar,
    decimal CiroTL,
    decimal CiroSterlin);
