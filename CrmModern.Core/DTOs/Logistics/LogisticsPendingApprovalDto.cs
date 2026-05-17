namespace CrmModern.Core.DTOs.Logistics;

/// <summary>
/// Paket 3: Lojistik talebi açılıp Muhasebe onayını bekleyen sevkler.
/// Order='Hazir' + LojistikTablo'da satır VAR durumu.
/// </summary>
public sealed record LogisticsPendingApprovalDto(
    int       SevkId,
    string    SiparisNo,
    string    MusteriAd,
    string?   MUlke,
    string    FirmaAdi,
    string    LojistikCesit,
    decimal   Fiyat,
    string?   LNot,
    string?   LojistikNot,
    DateTime? STarih,
    int       KullaniciAdi);
