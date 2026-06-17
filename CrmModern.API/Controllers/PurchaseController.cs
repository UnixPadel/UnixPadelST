using System.Security.Claims;
using CrmModern.API.Authorization;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Purchase;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/purchase")]
[Authorize]
public sealed class PurchaseController(IPurchaseService purchaseService) : ControllerBase
{
    // WinForms birebir özel kullanıcı adları (rol değil)
    private const string PreApproverUser  = "omur.caliskan";
    private const string FinalApproverUser = "elshan.rasulov";

    private string CurrentUserName =>
        User.FindFirstValue(ClaimTypes.Name)
            ?? throw new InvalidOperationException("Kullanıcı adı claim eksik.");

    private bool IsRole(string role) => User.IsInRole(role);

    // ─────────────────────────────────────────────────────────────────────────
    // Listeler
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByDepartman(
        [FromQuery] string departman,
        [FromQuery] bool   isGozlemci = false)
    {
        var result = await purchaseService.GetByDepartmanAsync(departman, isGozlemci);
        return Ok(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>.Ok(result));
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyRequests()
    {
        var result = await purchaseService.GetMyRequestsAsync(CurrentUserName);
        return Ok(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>.Ok(result));
    }

    /// <summary>SatinAlmaTumTalepForm portu — yetki: elshan veya Yonetici/Gozlemci.</summary>
    [HttpGet("all")]
    public async Task<IActionResult> GetAll([FromQuery] PurchaseRequestFilterDto filter)
    {
        // Yetki: elshan kullanıcısı, Yonetici veya Gozlemci
        if (CurrentUserName != FinalApproverUser && !IsRole("Yonetici") && !IsRole("Gozlemci"))
            return Forbid();
        var result = await purchaseService.GetAllAsync(filter);
        return Ok(ApiResponse<PurchaseRequestPageDto>.Ok(result));
    }

    [HttpGet("{talepId:int}")]
    public async Task<IActionResult> GetById(int talepId)
    {
        var result = await purchaseService.GetByIdAsync(talepId);
        return Ok(ApiResponse<PurchaseRequestDetailDto>.Ok(result));
    }

    /// <summary>Faz 8.4 — talep onay/red tarihçesi (TalepOnaylari log).</summary>
    [HttpGet("{talepId:int}/history")]
    public async Task<IActionResult> GetApprovalHistory(int talepId)
    {
        var result = await purchaseService.GetApprovalHistoryAsync(talepId);
        return Ok(ApiResponse<IReadOnlyList<PurchaseApprovalDto>>.Ok(result));
    }

    /// <summary>Aşama 1 bekleyenleri (Bekliyor/Onay Bekliyor + SatinAlma).</summary>
    [HttpGet("pending-preapproval")]
    public async Task<IActionResult> GetPendingPreApproval()
    {
        if (CurrentUserName != PreApproverUser && !IsRole("Yonetici"))
            return Forbid();
        var result = await purchaseService.GetPendingPreApprovalAsync();
        return Ok(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>.Ok(result));
    }

    /// <summary>Aşama 2 bekleyenleri (Ön Onaylandı + OdemeTuru IS NULL).</summary>
    [HttpGet("pending-payment")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    public async Task<IActionResult> GetPendingPayment()
    {
        var result = await purchaseService.GetPendingPaymentAsync();
        return Ok(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>.Ok(result));
    }

    /// <summary>Aşama 3 bekleyenleri (Muhasebe Tamamlandı / Onay Bekliyor dual source).</summary>
    [HttpGet("pending-final")]
    public async Task<IActionResult> GetPendingFinal()
    {
        if (CurrentUserName != FinalApproverUser && !IsRole("Yonetici"))
            return Forbid();
        var result = await purchaseService.GetPendingFinalApprovalAsync();
        return Ok(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>.Ok(result));
    }

    /// <summary>Geriye uyum: Durum='Onay Bekliyor'.</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var result = await purchaseService.GetPendingAsync();
        return Ok(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>.Ok(result));
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var result = await purchaseService.GetHistoryAsync(page, pageSize);
        return Ok(ApiResponse<IReadOnlyList<PurchaseRequestListDto>>.Ok(result));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPost]
    [Authorize(Roles = "Yonetici,Lojistik,Fabrika,Gozlemci,Temsilci")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseRequestDto dto)
    {
        await purchaseService.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<object>.Ok(null!, "Talep oluşturuldu."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Aşama 1: ön onay (omur.caliskan VEYA Yonetici)
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPost("{talepId:int}/preapprove")]
    public async Task<IActionResult> PreApprove(int talepId, [FromBody] ApprovalActionDto? dto)
    {
        if (CurrentUserName != PreApproverUser && !IsRole("Yonetici"))
            return Forbid();
        await purchaseService.PreApproveAsync(talepId, CurrentUserName, dto?.Aciklama);
        return Ok(ApiResponse<object>.Ok(null!, "Ön onaylandı."));
    }

    [HttpPost("{talepId:int}/prereject")]
    public async Task<IActionResult> PreReject(int talepId, [FromBody] RejectPurchaseDto dto)
    {
        if (CurrentUserName != PreApproverUser && !IsRole("Yonetici"))
            return Forbid();
        await purchaseService.PreRejectAsync(talepId, CurrentUserName, dto.RedNotu);
        return Ok(ApiResponse<object>.Ok(null!, "Reddedildi."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Aşama 2: muhasebe ödeme detayı
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPost("{talepId:int}/payment-details")]
    [Authorize(Roles = "Yonetici,Muhasebe")]
    public async Task<IActionResult> SetPaymentDetails(int talepId, [FromBody] SetPaymentDetailsDto dto)
    {
        await purchaseService.SetPaymentDetailsAsync(talepId, dto, CurrentUserName);
        return Ok(ApiResponse<object>.Ok(null!, "Ödeme detayı kaydedildi (Muhasebe Tamamlandı)."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Aşama 3: nihai onay (elshan.rasulov VEYA Yonetici) — Rule 4
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPost("{talepId:int}/final-approve")]
    public async Task<IActionResult> FinalApprove(int talepId, [FromBody] ApprovalActionDto? dto)
    {
        if (CurrentUserName != FinalApproverUser && !IsRole("Yonetici"))
            return Forbid();
        await purchaseService.FinalApproveAsync(talepId, CurrentUserName, dto?.Aciklama);
        return Ok(ApiResponse<object>.Ok(null!, "Onaylandı."));
    }

    [HttpPost("{talepId:int}/final-reject")]
    public async Task<IActionResult> FinalReject(int talepId, [FromBody] RejectPurchaseDto dto)
    {
        if (CurrentUserName != FinalApproverUser && !IsRole("Yonetici"))
            return Forbid();
        await purchaseService.FinalRejectAsync(talepId, CurrentUserName, dto.RedNotu);
        return Ok(ApiResponse<object>.Ok(null!, "Reddedildi."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROMPT-v7 §2: Override onayı — tüm aşamaları atlayan tek-tık kısa devre.
    // Gate YALNIZ elshan.rasulov (Yonetici rolü DEĞİL — nihai onaydan farkı bu).
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPost("{talepId:int}/override-approve")]
    public async Task<IActionResult> OverrideApprove(int talepId, [FromBody] ApprovalActionDto? dto)
    {
        // §24 — Admin de override onayı yapabilir (elshan kalıbına ek).
        if (CurrentUserName != FinalApproverUser && !User.IsSuperAdmin())
            return Forbid();
        await purchaseService.OverrideApproveAsync(talepId, CurrentUserName, dto?.Aciklama);
        return Ok(ApiResponse<object>.Ok(null!, "Talep onaylandı (override)."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Geriye uyum (Faz 5 öncesi tek-aşama yöntemleri)
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPut("{talepId:int}/approve")]
    public async Task<IActionResult> Approve(int talepId, [FromQuery] string islemYapanKullanici)
    {
        await purchaseService.ApproveAsync(talepId, islemYapanKullanici);
        return Ok(ApiResponse<object>.Ok(null!, "Talep onaylandı."));
    }

    [HttpPut("{talepId:int}/reject")]
    public async Task<IActionResult> Reject(int talepId,
        [FromQuery] string islemYapanKullanici, [FromBody] RejectPurchaseDto dto)
    {
        await purchaseService.RejectAsync(talepId, dto.RedNotu, islemYapanKullanici);
        return Ok(ApiResponse<object>.Ok(null!, "Talep reddedildi."));
    }
}
