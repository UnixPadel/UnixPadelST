namespace CrmModern.Core.DTOs.Logistics;

/// <summary>Lojistik teklif girişi (Lojistik/Yönetici). Mevcut sevk alanlarıyla aynı.</summary>
public sealed record SubmitLogisticsOfferRequest(
    string  FirmaAdi,
    string  LojistikCesit,
    decimal Fiyat,
    string? Aciklama);
