using CrmModern.Core.DTOs.Currency;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Sipariş ekranındaki para birimi çevirisi için güncel kurlar (TL bazlı).
/// Bileşen kataloğu TL (BilesenBilgileri.Currency = 'TRY') tutulurken siparişler
/// çoğunlukla Euro — bileşen birim fiyatları bu kurlarla sipariş para birimine çevrilir.
/// </summary>
public interface IExchangeRateService
{
    Task<ExchangeRatesDto> GetRatesAsync(CancellationToken ct = default);
}
