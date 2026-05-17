namespace CrmModern.Core.DTOs.Purchase;

/// <summary>
/// Tam detay — list DTO + 17 ödeme/ön-izleme kolonu + Notlar.
/// SatinAlmaOnayForm sol paneli + nihai onay öncesi okuma için.
/// </summary>
public sealed record PurchaseRequestDetailDto(
    int       TalepID,
    string    UrunAdi,
    string?   UrunTuru,
    decimal   UrunMaliyeti,
    string?   AlinanYer,
    string?   Notlar,
    string?   TalepEdenKullaniciAdi,
    string?   Departman,
    DateTime  TalepTarihi,
    string    Durum,
    string?   RedNotu,
    string?   TalepTipi,
    // Ön izleme
    string?   OnIzlemeYapan,
    DateTime? OnIzlemeTarihi,
    // Ödeme detayı (Muhasebe.cs)
    string?   OdemeTuru,
    decimal?  OdenenTutar,
    decimal?  OdemeTutari,
    string?   OdemeVadeSuresi,
    decimal?  OdemeVadeTutari,
    DateOnly? OdemeVadeTarihi,
    string?   OdemeBelgeNo,
    string?   OdemeBankaAdi,
    DateTime? OdemeIslemTarihi,
    string?   OdemeKartTipi,
    int?      OdemeTaksitSayisi,
    string?   OdemeAciklama,
    string?   MuhasebeYapanKullanici,
    DateTime? MuhasebeTarihi,
    // Muhasebe tipi talep extras
    string?   MusteriAdi,
    decimal?  ToplamSiparis,
    decimal?  KaporaBakiyesi,
    decimal?  KalanBakiyeTalep,
    decimal?  PesinYuzde,
    decimal?  Maliyet,
    string?   MaliyetDetayi,
    decimal?  Kar,
    string?   SiparisNo,
    string?   IslemYapanKullanici,
    DateTime? IslemTarihi);
