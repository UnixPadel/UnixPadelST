using System.Security.Claims;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Dashboard;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// Excel export endpoints + Faz 7 dashboard endpoint'leri.
/// Excel kısmı Muhasebe.cs / Kontrol.cs excelYazOzet_Click handler'larının karşılığı.
/// Dashboard kısmı WinForms'ta yorum satırı olan grafiklerin modern UI uyarlamasıdır.
/// </summary>
[ApiController]
[Route("api/reporting")]
[Authorize]
public sealed class ReportingController(IReportingService reportingService) : ControllerBase
{
    private const string ContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? "Temsilci";

    // PROMPT-v5 §2: ciro görünürlüğü olmayan roller — ReportingService
    // .GetDashboardKpisAsync içindeki revenueHidden setiyle birebir aynı.
    private bool RevenueHidden => CurrentRole is "Fabrika" or "Lojistik" or "Temsilci";

    /// <summary>
    /// Exports all approved accounting orders to Excel.
    /// Maps to Muhasebe.cs "Özet Excel" export.
    /// GET /api/reporting/accounting/export
    /// </summary>
    [HttpGet("accounting/export")]
    public async Task<IActionResult> ExportAccounting()
    {
        // PROMPT-v5 §2: rapor sipariş tutarları içerir — Fabrika alamaz.
        if (User.IsInRole("Fabrika")) return Forbid();
        var bytes = await reportingService.ExportAccountingOrdersAsync();
        var filename = $"muhasebe_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
        return File(bytes, ContentType, filename);
    }

    /// <summary>
    /// Exports a single order proforma to Excel.
    /// Maps to Kontrol.cs / Muhasebe.cs excelYazOzet_Click (single order).
    /// GET /api/reporting/orders/{siparisNo}/proforma
    /// </summary>
    [HttpGet("orders/{siparisNo}/proforma")]
    public async Task<IActionResult> ExportProforma(string siparisNo)
    {
        // PROMPT-v5 §2: proforma fiyat içerir — Fabrika alamaz.
        if (User.IsInRole("Fabrika")) return Forbid();
        var bytes = await reportingService.ExportOrderProformaAsync(siparisNo);
        var filename = $"proforma_{siparisNo}_{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes, ContentType, filename);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FAZ 7 — DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Rol bazlı KPI sayıları (kart widget'ları).</summary>
    [HttpGet("dashboard/kpis")]
    [ProducesResponseType(typeof(ApiResponse<DashboardKpiDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboardKpis()
    {
        var result = await reportingService.GetDashboardKpisAsync(CurrentUserId, CurrentRole);
        return Ok(ApiResponse<DashboardKpiDto>.Ok(result));
    }

    /// <summary>Son N ay sipariş trendi (area/line chart).</summary>
    [HttpGet("dashboard/orders-by-month")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<OrderTrendPointDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrdersByMonth([FromQuery] int months = 12)
    {
        var result = await reportingService.GetOrdersByMonthAsync(months);

        // PROMPT-v5 §2: trend noktaları aylık ciro taşır — ciro görmeyen roller
        // (Fabrika dahil) yalnız sipariş sayısını alır. (Servis cache'i rol
        // bağımsız olduğu için karartma controller'da yapılır.)
        if (RevenueHidden)
            result = result
                .Select(p => p with { CiroEuro = 0m, CiroDolar = 0m, CiroTL = 0m, CiroSterlin = 0m })
                .ToList();

        return Ok(ApiResponse<IReadOnlyList<OrderTrendPointDto>>.Ok(result));
    }

    /// <summary>Aşama dağılımı (pie/donut chart).</summary>
    [HttpGet("dashboard/orders-by-stage")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<StageDistributionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrdersByStage()
    {
        var result = await reportingService.GetOrdersByStageAsync();
        return Ok(ApiResponse<IReadOnlyList<StageDistributionDto>>.Ok(result));
    }

    /// <summary>Top N müşteri (bar chart, Yonetici görür).</summary>
    [HttpGet("dashboard/top-customers")]
    [Authorize(Roles = "Yonetici,Muhasebe,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<TopCustomerDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTopCustomers([FromQuery] int days = 90, [FromQuery] int limit = 10)
    {
        var result = await reportingService.GetTopCustomersAsync(days, limit);
        return Ok(ApiResponse<IReadOnlyList<TopCustomerDto>>.Ok(result));
    }

    /// <summary>Para birimi dağılımı.</summary>
    [HttpGet("dashboard/currency-distribution")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CurrencyDistributionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrencyDistribution([FromQuery] int days = 90)
    {
        var result = await reportingService.GetCurrencyDistributionAsync(days);

        // PROMPT-v5 §2: ToplamCiro parasal — ciro görmeyen roller yalnız adet görür.
        if (RevenueHidden)
            result = result.Select(c => c with { ToplamCiro = 0m }).ToList();

        return Ok(ApiResponse<IReadOnlyList<CurrencyDistributionDto>>.Ok(result));
    }
}
