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
    // PROMPT.md ACCOUNTING #14 — legacy Muhasebe.cs grid columns that were
    // missing from the modern DTO.
    string?  Sirket,
    int      PesinYuzde,
    string?  TeslimatCesiti,
    // Kontrol kolonu legacy grid'te gizli; row colouring ve "Muhasebe Onayla"
    // butonu için frontend buna ihtiyaç duyuyor.
    string?  Kontrol,
    DateTime Tarih,
    // PROMPT-v2 §10.2: Maliyet Reçetesi Net Kar = ToplamFiyat × (1-İndirim%) ×
    // (1-KDV%) − Maliyet formülü için. Eski siparişlerde NULL olabilir.
    decimal? Indirim = null,
    decimal? Kdv     = null);
