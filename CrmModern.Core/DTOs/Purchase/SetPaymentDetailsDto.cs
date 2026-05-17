namespace CrmModern.Core.DTOs.Purchase;

/// <summary>
/// SatinAlmaTakipForm "Kaydet" akışı.
/// OdemeTuru'na göre alt-alanlar zorunlu olur (validation servis seviyesinde).
/// Hard-coded OdemeTuru değerleri (WinForms birebir):
///   "Peşin" | "Vadeli" | "Mal Mukabili" | "Çek / Senet" | "Havale / EFT" | "Kredi Kartı / Banka Kartı"
/// </summary>
public sealed record SetPaymentDetailsDto(
    string    OdemeTuru,

    // Peşin / Vadeli / Mal Mukabili → OdenenTutar
    decimal?  OdenenTutar,
    // Çek / Senet / Havale / Kart → OdemeTutari
    decimal?  OdemeTutari,

    // Vadeli
    string?   OdemeVadeSuresi,
    decimal?  OdemeVadeTutari,

    // Çek / Senet
    DateOnly? OdemeVadeTarihi,
    string?   OdemeBelgeNo,

    // Havale / EFT
    string?   OdemeBankaAdi,
    DateTime? OdemeIslemTarihi,

    // Kredi/Banka Kartı
    string?   OdemeKartTipi,
    int?      OdemeTaksitSayisi,

    // Mal Mukabili
    string?   OdemeAciklama);
