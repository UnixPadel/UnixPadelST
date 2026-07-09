namespace CrmModern.Core.DTOs.Accounting;

/// <summary>
/// Sipariş/teklife eklenmiş bir ekstra maliyet kalemi (okuma).
/// </summary>
public sealed record OrderExtraCostDto(
    int      EkMaliyetID,
    string   Aciklama,
    decimal  Tutar,
    DateTime EklenmeTarihi,
    int?     KullaniciID);

/// <summary>
/// Yeni ekstra maliyet kalemi ekleme gövdesi (açıklama + tutar).
/// </summary>
public sealed record CreateExtraCostDto(
    string  Aciklama,
    decimal Tutar);
