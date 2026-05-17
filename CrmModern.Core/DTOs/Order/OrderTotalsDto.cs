namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Fabrika.cs'deki "döviz bazlı toplam bakiye" — 4 kart için.
/// Eksik döviz tipleri 0 döner.
/// </summary>
public sealed record OrderTotalsDto(
    decimal Euro,
    decimal Dolar,
    decimal TL,
    decimal Sterlin,
    int     OrderCount);
