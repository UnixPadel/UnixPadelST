using System.Security.Claims;
using CrmModern.Core.DTOs.Accounting;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/accounting")]
[Authorize]
public sealed class AccountingController(IAccountingService accountingService) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    private string CurrentUserName =>
        User.FindFirstValue(ClaimTypes.Name)
            ?? throw new InvalidOperationException("Kullanıcı adı claim eksik.");

    // PROMPT-v4 §1/§4.4 — Kontrol ekranı Muhasebe Geçmişi okuması için
    // kullanıcı adı bazlı istisna (rol değil).
    private const string ControlUser = "elshan.rasulov";

    [HttpGet("orders")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AccountingOrderListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders()
    {
        var result = await accountingService.GetAccountingOrdersAsync();
        return Ok(ApiResponse<IReadOnlyList<AccountingOrderListDto>>.Ok(result));
    }

    [HttpGet("orders/{siparisNo}")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    [ProducesResponseType(typeof(ApiResponse<AccountingOrderListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrderDetail(string siparisNo)
    {
        var result = await accountingService.GetOrderAccountingDetailAsync(siparisNo);
        return Ok(ApiResponse<AccountingOrderListDto>.Ok(result));
    }

    // PROMPT-v4 §4.4: rol seti aynen korunur + elshan.rasulov okuma istisnası.
    [HttpGet("orders/{siparisNo}/transactions")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AccountingTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransactionsForOrder(string siparisNo)
    {
        if (!User.IsInRole("Yonetici") && !User.IsInRole("Muhasebe") &&
            !User.IsInRole("Gozlemci") && CurrentUserName != ControlUser)
            return Forbid();
        var result = await accountingService.GetTransactionsForOrderAsync(siparisNo);
        return Ok(ApiResponse<IReadOnlyList<AccountingTransactionDto>>.Ok(result));
    }

    /// <summary>
    /// Yeni tahsilat: MuhasebeIslemTablo INSERT + Order.OdenenMiktar(SUM) + Order.OdemeDurum (Beklemede|Ödendi).
    /// </summary>
    [HttpPost("transactions")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    [ProducesResponseType(typeof(ApiResponse<AccountingTransactionDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddTransaction([FromBody] AddTransactionDto dto)
    {
        var created = await accountingService.AddTransactionAsync(dto, CurrentUserId);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<AccountingTransactionDto>.Ok(created, "Tahsilat kaydedildi."));
    }

    /// <summary>Geriye uyum: eski endpoint düz liste.</summary>
    [HttpGet("transactions")]
    [Authorize(Roles = "Yonetici,Muhasebe,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AccountingTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransactions()
    {
        var result = await accountingService.GetTransactionHistoryAsync();
        return Ok(ApiResponse<IReadOnlyList<AccountingTransactionDto>>.Ok(result));
    }

    [HttpGet("transactions/history")]
    [Authorize(Roles = "Yonetici,Muhasebe,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<TransactionPageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransactionHistory([FromQuery] TransactionFilterDto filter)
    {
        var result = await accountingService.GetTransactionHistoryPagedAsync(filter);
        return Ok(ApiResponse<TransactionPageDto>.Ok(result));
    }

    [HttpGet("customers/{musteriId:int}/balance")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    [ProducesResponseType(typeof(ApiResponse<CustomerBalanceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerBalance(int musteriId)
    {
        var result = await accountingService.GetCustomerBalanceAsync(musteriId);
        return Ok(ApiResponse<CustomerBalanceDto>.Ok(result));
    }

    [HttpGet("excel")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    public async Task<IActionResult> Excel([FromQuery] TransactionFilterDto filter)
    {
        var bytes = await accountingService.GenerateAccountingExcelAsync(filter);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "muhasebe.xlsx");
    }

    /// <summary>
    /// PROMPT.md ACCOUNTING #14 — Muhasebe ekranı "Talep Gönder" butonu.
    /// SatinAlmaTalep (TalepTipi='Muhasebe') için upsert.
    /// </summary>
    [HttpPost("orders/{siparisNo}/maliyet")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SubmitMaliyet(string siparisNo, [FromBody] SubmitMaliyetTalepDto dto)
    {
        await accountingService.SubmitMaliyetTalepAsync(siparisNo, dto, CurrentUserName);
        return Ok(ApiResponse<object>.Ok(null!, "Muhasebe talebi gönderildi (Onay Bekliyor)."));
    }

    /// <summary>
    /// PROMPT.md ACCOUNTING #14 — Muhasebe ekranı "Muhasebe Onayla" butonu.
    /// Siparis → Planlama. Kontrol='Onay' AND SiparisMiTeklifMi='Siparis' guards.
    /// </summary>
    [HttpPut("orders/{siparisNo}/approve-and-move-to-planning")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApproveMuhasebeAndMoveToPlanning(string siparisNo)
    {
        await accountingService.ApproveMuhasebeAndMoveToPlanningAsync(siparisNo);
        return Ok(ApiResponse<object>.Ok(null!, "Muhasebe onayı verildi — sipariş Planlama aşamasında."));
    }

    /// <summary>MuhasebeEk yükle (Faz 3 blok kaldırıldı, yetki: Yonetici, Muhasebe).</summary>
    [HttpPost("orders/{siparisNo}/muhasebe-ek")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    public async Task<IActionResult> UploadMuhasebeEk(string siparisNo, IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("Dosya boş."));
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        await accountingService.UploadMuhasebeEkAsync(siparisNo, ms.ToArray(), CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "MuhasebeEk yüklendi."));
    }
}
