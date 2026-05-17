namespace CrmModern.Core.DTOs.Purchase;

public sealed record CreatePurchaseRequestDto(
    string   UrunAdi,
    string?  UrunTuru,
    decimal  UrunMaliyeti,
    string?  AlinanYer,
    string?  Notlar,
    string   TalepEdenKullaniciAdi,
    string   Departman,
    string?  TalepTipi,
    // Muhasebe extras (nullable for SatinAlma-type requests)
    string?  MusteriAdi,
    decimal? ToplamSiparis,
    decimal? KaporaBakiyesi,
    decimal? KalanBakiyeTalep,
    decimal? PesinYuzde,
    decimal? Maliyet,
    string?  MaliyetDetayi,
    decimal? Kar,
    string?  SiparisNo);
