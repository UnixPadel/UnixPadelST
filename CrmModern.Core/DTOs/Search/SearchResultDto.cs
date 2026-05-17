namespace CrmModern.Core.DTOs.Search;

public sealed record SearchResultDto(
    string   SiparisNo,
    string   TeklifNo,
    string   MusteriAd,
    string?  MUlke,
    int      KullaniciID,
    string   ParaTipi,
    decimal? ToplamFiyat,
    decimal  KaparoFiyat,
    decimal  KalanBakiye,
    decimal? OdenenMiktar,
    string?  OdemeDurum,
    string   SiparisMiTeklifMi,
    string   Kontrol,
    DateTime Tarih,
    string?  Sirket);
