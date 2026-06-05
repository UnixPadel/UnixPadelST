using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Factory;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/factory")]
[Authorize]
public sealed class FactoryController(IFactoryService factoryService, IOrderService orderService) : ControllerBase
{
    /// <summary>
    /// Returns orders in production stages (Planlama/Uretim/Hazir/Lojistik/Tamamlandi).
    /// Maps to the Fabrika form DataGrid.
    /// </summary>
    /// <remarks>
    /// Faz-fix 2.2 — Fabrika.cs araButtonInTab_Click filtreleri port edildi:
    /// SiparisNo, MusteriAd, MUlke, KullaniciID (Temsilci), Asama,
    /// BaslangicTarih, BitisTarih.
    /// </remarks>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<FactoryOrderListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders([FromQuery] OrderFilterDto filter)
    {
        var result = await factoryService.GetProductionOrdersAsync(filter);
        return Ok(ApiResponse<IReadOnlyList<FactoryOrderListDto>>.Ok(result));
    }

    /// <summary>
    /// Moves a Planlama order to Uretim stage with FabrikaNot.
    /// Maps to FabrikaYontim.Onayla_Click.
    /// </summary>
    [HttpPut("{siparisNo}/move-to-production")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MoveToProduction(string siparisNo, [FromBody] MoveToProductionDto dto)
    {
        await factoryService.MoveToProductionAsync(siparisNo, dto.STarih, dto.FabrikaNot);
        return Ok(ApiResponse<object>.Ok(null!, "Üretime alındı."));
    }

    /// <summary>
    /// Moves a Uretim order to Hazir stage.
    /// Maps to the Fabrika form "Hazır Aşaması" button.
    /// </summary>
    [HttpPut("{siparisNo}/mark-ready")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkReady(string siparisNo)
    {
        await factoryService.MarkAsReadyAsync(siparisNo);
        return Ok(ApiResponse<object>.Ok(null!, "Hazır aşamasına alındı."));
    }

    // ── Faz 3 devir: çoklu filtre + döviz toplam + Excel + ek dosya ─────────
    // (OrderService delegasyonu — Fabrika.cs'in advanced özellikleri)

    /// <summary>Üretim aşamasındaki siparişler için döviz toplamı.</summary>
    [HttpGet("totals")]
    [Authorize(Roles = "Yonetici,Fabrika,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<OrderTotalsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTotals([FromQuery] OrderFilterDto filter)
    {
        var result = await orderService.GetTotalsByCurrencyAsync(filter);
        return Ok(ApiResponse<OrderTotalsDto>.Ok(result));
    }

    /// <summary>Sipariş Excel raporu (Fabrika ekranındaki "Excel İndir").</summary>
    [HttpGet("{siparisNo}/excel")]
    [Authorize(Roles = "Yonetici,Fabrika,Muhasebe")]
    public async Task<IActionResult> Excel(string siparisNo)
    {
        var bytes = await orderService.GenerateExcelAsync(siparisNo);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"siparis_{siparisNo}.xlsx");
    }

    /// <summary>Ek/MuhasebeEk dosya indirme (Fabrika ekranındaki "Ek İndir").</summary>
    [HttpGet("{siparisNo}/attachments/{type}")]
    [Authorize(Roles = "Yonetici,Fabrika,Muhasebe,Gozlemci")]
    public async Task<IActionResult> DownloadAttachment(string siparisNo, string type)
    {
        var data = await orderService.GetAttachmentAsync(siparisNo, type);
        if (data is null || data.Length == 0)
            return NotFound(ApiResponse<object>.Fail("Ek bulunamadı."));
        return File(data, "application/octet-stream", $"{type}_{siparisNo}.bin");
    }
}
