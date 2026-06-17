namespace CrmModern.Core.DTOs.Dashboard;

/// <summary>
/// §19 — Tek bir temsilcinin seçilen tarih aralığındaki detaylı satış analizi.
/// Çoklu para birimi karıştırılmaz: ciro/AOV alanları para birimi bazında ayrı tutulur.
/// Ülke/ürün/aylık kırılımlar dashboard ve 5-sayfalık Excel raporunu besler.
/// </summary>
public sealed record RepDetailDto(
    int     KullaniciID,
    string  AdSoyad,
    string? KullaniciAdi,
    int     SiparisSayisi,     // sipariş (Teklif/Iptal dışı)
    int     TeklifSayisi,      // SiparisMiTeklifMi == 'Teklif'
    int     ToplamAdet,        // satılan ürün (kategori/SET) adedi toplamı
    int     UlkeSayisi,        // satış yapılan benzersiz ülke sayısı
    decimal DonusumOrani,      // % (sipariş / oluşturulan)
    decimal CiroEuro,
    decimal CiroDolar,
    decimal CiroTL,
    decimal CiroSterlin,
    decimal AovEuro,           // ortalama sipariş değeri (para birimi bazında)
    decimal AovDolar,
    decimal AovTL,
    decimal AovSterlin,
    IReadOnlyList<RepCountryStatDto> Ulkeler,    // top ülkeler (sipariş sayısına göre)
    IReadOnlyList<RepProductStatDto> Urunler,    // top ürünler (adede göre)
    IReadOnlyList<RepMonthlyStatDto> AylikCiro); // aylık ciro trendi

/// <summary>Ülke kırılımı — sipariş sayısı + para birimi bazında ciro.</summary>
public sealed record RepCountryStatDto(
    string  Ulke,
    int     SiparisSayisi,
    int     Adet,
    decimal CiroEuro,
    decimal CiroDolar,
    decimal CiroTL,
    decimal CiroSterlin);

/// <summary>Ürün (kategori/SET) kırılımı — satılan adet + bulunduğu sipariş sayısı.</summary>
public sealed record RepProductStatDto(
    string Urun,
    int    Adet,
    int    SiparisSayisi);

/// <summary>Aylık ciro trendi — yyyy-MM + para birimi bazında ciro + sipariş sayısı.</summary>
public sealed record RepMonthlyStatDto(
    string  Ay,
    int     SiparisSayisi,
    decimal CiroEuro,
    decimal CiroDolar,
    decimal CiroTL,
    decimal CiroSterlin);
