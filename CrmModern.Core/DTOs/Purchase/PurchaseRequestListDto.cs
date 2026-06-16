namespace CrmModern.Core.DTOs.Purchase;

public sealed record PurchaseRequestListDto(
    int      TalepID,
    string   UrunAdi,
    string?  UrunTuru,
    decimal  UrunMaliyeti,
    string?  AlinanYer,
    string?  TalepEdenKullaniciAdi,
    string?  Departman,
    DateTime TalepTarihi,
    string   Durum,
    string?  RedNotu,
    string?  IslemYapanKullanici,
    DateTime? IslemTarihi,
    string?  TalepTipi,
    // Muhasebe extras
    string?  MusteriAdi,
    decimal? ToplamSiparis,
    decimal? KaporaBakiyesi,
    decimal? KalanBakiyeTalep,
    decimal? PesinYuzde,
    decimal? Maliyet,
    string?  MaliyetDetayi,
    decimal? Kar,
    string?  SiparisNo,
    // Round-11 §9 — belge düzeyinde para birimi
    string?  ParaBirimi = null);
