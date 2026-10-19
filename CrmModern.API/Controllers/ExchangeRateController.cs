using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Currency;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// Güncel döviz kurları (TCMB, TL bazlı) — sipariş ekranında TL / Euro / Dolar /
/// Sterlin çevirisi için. Tüm authenticated kullanıcılara açık.
/// </summary>
[ApiController]
[Route("api/exchange-rates")]
[Authorize]
public sealed class ExchangeRateController(IExchangeRateService exchangeRateService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<ExchangeRatesDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var result = await exchangeRateService.GetRatesAsync(ct);
        return Ok(ApiResponse<ExchangeRatesDto>.Ok(result));
    }
}
