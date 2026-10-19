namespace CrmModern.Core.DTOs.Currency;

/// <summary>
/// Döviz kurları — 1 birim yabancı paranın TL karşılığı (TCMB "Döviz Satış").
/// Rates anahtarları ISO kodudur: TRY (=1), EUR, USD, GBP. Kurlar alınamazsa
/// Rates boş döner; frontend elle kur girişine izin verir.
/// </summary>
public sealed record ExchangeRatesDto(
    DateOnly? Tarih,
    string    Kaynak,
    IReadOnlyDictionary<string, decimal> Rates);
