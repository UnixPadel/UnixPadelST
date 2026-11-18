namespace CrmModern.Core.DTOs.Search;

/// <summary>
/// Sipariş Ara ve üst arama kutusu için tek arama isteği. Sahiplik ve para yetkisi
/// istemciden gelmez; controller oturumdan belirler.
/// </summary>
public sealed record OrderSearchRequest(
    string?   Q,
    string?   Tur = null,
    string?   Asama = null,
    string?   Kontrol = null,
    string?   Ulke = null,
    DateTime? Baslangic = null,
    DateTime? Bitis = null,
    int?      OnlyKullaniciId = null,
    bool      CanSeeMoney = true,
    int       Limit = 100);

/// <summary>
/// Tek arama sonucu. Tur: "Teklif" | "Siparis". StepCode/Department: siparişin şu an
/// beklediği adım (OrderWorkflow); kapanmış ya da silinmiş kayıtta null.
/// Parasal alanlar, para görmeyen kullanıcıda null döner.
/// Eslesen: sorgunun eşleştiği alan kodları (OrderSearchFields).
/// </summary>
public sealed record OrderSearchHitDto(
    string   SiparisNo,
    string   TeklifNo,
    string   BelgeNo,
    string   Tur,
    string   Asama,
    string   Kontrol,
    bool     Silindi,
    string?  StepCode,
    string?  Department,
    string   MusteriAd,
    string?  Ulke,
    string?  Telefon,
    string?  Eposta,
    string?  VergiNo,
    string?  Adres,
    int      KullaniciID,
    string?  Temsilci,
    string?  Sirket,
    DateTime Tarih,
    string   ParaTipi,
    decimal? ToplamFiyat,
    decimal? BrutToplamFiyat,
    decimal? OdenenMiktar,
    decimal? KalanBakiye,
    int?     PesinYuzde,
    string?  OdemeDurum,
    IReadOnlyList<string> Eslesen);

/// <summary>Toplam: tüm eşleşmeler; Sonuclar en çok Limit kadardır.</summary>
public sealed record OrderSearchResultDto(
    string Query,
    int    Toplam,
    IReadOnlyList<OrderSearchHitDto> Sonuclar);

/// <summary>Üst arama kutusunda sipariş satırının özeti (parasal alan içermez).</summary>
public sealed record OrderHitSummaryDto(
    string  Tur,
    string  Asama,
    string  Kontrol,
    bool    Silindi,
    string? StepCode,
    string? Department);
