namespace CrmModern.Core.DTOs.Dashboard;

/// <summary>
/// Para birimi başına sipariş sayısı + toplam ciro.
/// ParaTipi: Euro | Dolar | TL | Sterlin
/// </summary>
public sealed record CurrencyDistributionDto(
    string ParaTipi,
    int SiparisSayisi,
    decimal ToplamCiro);
