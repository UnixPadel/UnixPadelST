namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Projection used by the Siparislerim list view.
/// Returns both SiparisNo and TeklifNo separately so the frontend can display both columns.
/// </summary>
public sealed record OrderListDto(
    int      SiparisAlID,
    string   SiparisNo,
    string   TeklifNo,
    string   MusteriAd,
    string?  MUlke,
    int      KullaniciID,
    string   ParaTipi,
    decimal? ToplamFiyat,
    string   SiparisMiTeklifMi,
    string   Kontrol,
    DateTime Tarih,
    string?  Sirket
);
