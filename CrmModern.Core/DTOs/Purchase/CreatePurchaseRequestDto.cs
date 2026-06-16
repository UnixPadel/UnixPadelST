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
    string?  SiparisNo,
    // Round-9 §9 — çok kalemli talep satırları (boş/null → tek satırlık legacy davranış)
    IReadOnlyList<CreatePurchaseRequestLineDto>? Kalemler = null,
    // Round-11 §9 — belge düzeyinde para birimi (Euro/Dolar/TL/Sterlin)
    string? ParaBirimi = null);
