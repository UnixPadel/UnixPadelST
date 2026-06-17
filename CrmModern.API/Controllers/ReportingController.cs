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

    private string CurrentUserName =>
        User.FindFirstValue(ClaimTypes.Name) ?? "";

    // PROMPT-v5 §2 + Round-11 §3: ciro görünürlüğü olmayan roller + ad-bazlı
    // kullanıcılar. omur.caliskan rolü Gozlemci'dir (ciro gören rol), bu yüzden
    // gizleme KULLANICI ADI bazlı olmak zorunda — frontend lib/visibility.ts ile aynı.
    private bool RevenueHidden =>
        CurrentRole is "Fabrika" or "Lojistik" or "Temsilci"
        || CurrentUserName == "omur.caliskan";

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
    public async Task<IActionResult> ExportProforma(string siparisNo, [FromQuery] string lang = "tr")
    {
        // PROMPT-v5 §2: proforma fiyat içerir — Fabrika alamaz.
        if (User.IsInRole("Fabrika")) return Forbid();
        var bytes = await reportingService.ExportOrderProformaAsync(siparisNo, lang);
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

        // Round-11 §3: servis ciro karartmasını ROLE göre yapar; ad-bazlı gizleme
        // (omur.caliskan — rolü Gozlemci) için ciroyu burada da sıfırla.
        if (RevenueHidden)
            result = result with
            {
                Son30GunCiroEuro    = 0m,
                Son30GunCiroDolar   = 0m,
                Son30GunCiroTL      = 0m,
                Son30GunCiroSterlin = 0m,
            };

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

        // Round-11 §3: ciro görmeyen kullanıcı (omur.caliskan / Gozlemci) tutar görmez.
        if (RevenueHidden)
            result = result.Select(c => c with { ToplamCiro = 0m }).ToList();

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

    /// <summary>Round-8 §13 — Temsilci performans raporu (yalnız Yönetici).</summary>
    [HttpGet("rep-performance")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<RepPerformanceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRepPerformance(
        [FromQuery] DateTime? baslangic = null, [FromQuery] DateTime? bitis = null)
    {
        // Varsayılan: son 30 gün (frontend gün/hafta/ay seçicisi açık aralık gönderir).
        var end   = bitis ?? DateTime.Now;
        var start = baslangic ?? end.AddDays(-30);
        var result = await reportingService.GetRepPerformanceAsync(start, end);
        return Ok(ApiResponse<IReadOnlyList<RepPerformanceDto>>.Ok(result));
    }

    /// <summary>§19 — Tek temsilcinin detaylı analizi (ülke/ürün/aylık kırılım, AOV).</summary>
    [HttpGet("rep-performance/{kullaniciID:int}/detail")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<RepDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRepDetail(int kullaniciID,
        [FromQuery] DateTime? baslangic = null, [FromQuery] DateTime? bitis = null)
    {
        var end   = bitis ?? DateTime.Now;
        var start = baslangic ?? end.AddDays(-30);
        var result = await reportingService.GetRepDetailAsync(kullaniciID, start, end);
        return Ok(ApiResponse<RepDetailDto>.Ok(result));
    }

    /// <summary>§19 — Temsilci için 5-sayfalık markalı Excel raporu (doğrudan indirilebilir).</summary>
    [HttpGet("rep-performance/{kullaniciID:int}/export")]
    [Authorize(Roles = "Yonetici")]
    public async Task<IActionResult> ExportRepReport(int kullaniciID,
        [FromQuery] DateTime? baslangic = null, [FromQuery] DateTime? bitis = null)
    {
        var end   = bitis ?? DateTime.Now;
        var start = baslangic ?? end.AddDays(-30);
        var bytes = await reportingService.ExportRepReportAsync(kullaniciID, start, end);
        var filename = $"temsilci_raporu_{kullaniciID}_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
        return File(bytes, ContentType, filename);
    }
}
