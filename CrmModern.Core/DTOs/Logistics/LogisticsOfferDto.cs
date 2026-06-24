namespace CrmModern.Core.DTOs.Logistics;

/// <summary>Tek bir lojistik teklifi (görüntüleme). Kullanıcı adları çözümlenmiş gelir.</summary>
public sealed record LogisticsOfferDto(
    int       TeklifID,
    string    SiparisNo,
    int       KullaniciID,
    string?   KullaniciAdSoyad,
    string    FirmaAdi,
    string    LojistikCesit,
    decimal   Fiyat,
    string?   Aciklama,
    string    Durum,
    DateTime  OlusturmaTarihi,
    int?      OnayKullaniciID,
    string?   OnayKullaniciAdSoyad,
    DateTime? OnayTarihi,
    string?   RedNotu);
