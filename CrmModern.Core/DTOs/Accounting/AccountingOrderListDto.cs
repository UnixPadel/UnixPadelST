namespace CrmModern.Core.DTOs.Accounting;

public sealed record AccountingOrderListDto(
    string   SiparisNo,
    string   MusteriAd,
    string?  MUlke,
    string   ParaTipi,
    decimal? ToplamFiyat,
    decimal  KaparoFiyat,
    decimal  KalanBakiye,
    decimal? OdenenMiktar,
    string?  OdemeDurum,
    string   SiparisMiTeklifMi,
    // Muhasebe-type purchase request fields (nullable — populated only when a Muhasebe talep exists)
    decimal? Maliyet,
    string?  MaliyetDetayi,
    decimal? Kar,
    string?  MuhasebeDurumu,
    int?     MuhasebeTalepID,
    string?  MuhasebeRedNotu,
    DateTime Tarih);
