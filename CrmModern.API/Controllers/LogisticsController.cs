using System.Security.Claims;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Logistics;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/logistics")]
[Authorize]
public sealed class LogisticsController(ILogisticsService logisticsService) : ControllerBase
{
    // Paket 3: rol değil kullanıcı adı bazlı global gözlemci.
    private const string GlobalObserverUser = "elshan.rasulov";

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    private string? CurrentUserName => User.FindFirstValue(ClaimTypes.Name);

    /// <summary>
    /// Paket 3: Lojistik okuma yetkisi (rol VEYA kullanıcı adı). Yazma işlemleri
    /// için yine `[Authorize(Roles=...)]` kullanılır; elshan asla yazamaz.
    /// </summary>
    private bool CanReadLogistics() =>
        User.IsInRole("Yonetici") || User.IsInRole("Lojistik") ||
        User.IsInRole("Gozlemci") || User.IsInRole("Muhasebe") ||
        CurrentUserName == GlobalObserverUser;

    /// <summary>Geniş kapsam (Faz 3 davranışı, geriye uyum) + Paket 3 read genişlemesi.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<LogisticsOrderListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders()
    {
        if (!CanReadLogistics()) return Forbid();
        var result = await logisticsService.GetLogisticsOrdersAsync();
        return Ok(ApiResponse<IReadOnlyList<LogisticsOrderListDto>>.Ok(result));
    }

    /// <summary>Sevkiyata aday liste (Hazir + Kontrol=Onay) — Lojistik.cs portu.</summary>
    [HttpGet("ready")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<LogisticsOrderListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReady()
    {
        var result = await logisticsService.GetReadyForShipmentAsync();
        return Ok(ApiResponse<IReadOnlyList<LogisticsOrderListDto>>.Ok(result));
    }

    /// <summary>Sevkiyat oluştur. Geriye uyum için iki path: yeni `POST /api/logistics` ve eski `PUT /{no}/move-to-logistics`.</summary>
    [HttpPost]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateShipment([FromBody] CreateShipmentRequest req)
    {
        await logisticsService.MoveToLogisticsAsync(req.SiparisNo, new MoveToLogisticsDto(
            req.STarih, req.LojistikNot ?? string.Empty, CurrentUserId,
            req.FirmaAdi, req.LojistikCesit, req.Fiyat, req.LNot));
        return Ok(ApiResponse<object>.Ok(null!, "Sevkiyat oluşturuldu."));
    }

    [HttpPut("{siparisNo}/move-to-logistics")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MoveToLogistics(string siparisNo, [FromBody] MoveToLogisticsDto dto)
    {
        await logisticsService.MoveToLogisticsAsync(siparisNo, dto);
        return Ok(ApiResponse<object>.Ok(null!, "Lojistik aşamasına alındı."));
    }

    /// <summary>Sevki tamamla (sevkID) — TamamlandiTablo audit.</summary>
    [HttpPost("{sevkId:int}/complete")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CompleteShipment(int sevkId, [FromBody] CompleteShipmentDto? dto)
    {
        await logisticsService.CompleteShipmentAsync(sevkId, CurrentUserId, dto?.Not);
        return Ok(ApiResponse<object>.Ok(null!, "Sevkiyat tamamlandı."));
    }

    /// <summary>Sevki iptal et — LojistikTablo DELETE + Order rollback.</summary>
    [HttpPost("{sevkId:int}/cancel")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CancelShipment(int sevkId, [FromBody] CancelShipmentDto dto)
    {
        await logisticsService.CancelShipmentAsync(sevkId, CurrentUserId, dto.Sebep);
        return Ok(ApiResponse<object>.Ok(null!, "Sevkiyat iptal edildi."));
    }

    /// <summary>Geriye uyum: PUT /{siparisNo}/complete (Faz 3 öncesi).</summary>
    [HttpPut("{siparisNo}/complete")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CompleteByOrder(string siparisNo)
    {
        await logisticsService.CompleteOrderAsync(siparisNo);
        return Ok(ApiResponse<object>.Ok(null!, "Sipariş tamamlandı."));
    }

    [HttpGet("history")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<LogisticsHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory([FromQuery] string? siparisNo, [FromQuery] string? firmaAdi)
    {
        if (!CanReadLogistics()) return Forbid();
        var result = await logisticsService.GetHistoryAsync(siparisNo, firmaAdi);
        return Ok(ApiResponse<IReadOnlyList<LogisticsHistoryDto>>.Ok(result));
    }

    [HttpGet("carriers")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<string>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCarriers()
    {
        var result = await logisticsService.GetCarriersAsync();
        return Ok(ApiResponse<IReadOnlyList<string>>.Ok(result));
    }

    [HttpGet("cesitler")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<string>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCesitler()
    {
        var result = await logisticsService.GetCesitlerAsync();
        return Ok(ApiResponse<IReadOnlyList<string>>.Ok(result));
    }
}

public sealed record CreateShipmentRequest(
    string   SiparisNo,
    string   FirmaAdi,
    string   LojistikCesit,
    decimal  Fiyat,
    string?  LNot,
    DateTime STarih,
    string?  LojistikNot);

public sealed record CompleteShipmentDto(string? Not);
public sealed record CancelShipmentDto(string Sebep);
