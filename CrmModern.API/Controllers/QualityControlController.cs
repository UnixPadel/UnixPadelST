using System.Security.Claims;
using CrmModern.API.Authorization;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.DTOs.QualityControl;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// WinForms Kontrol / KontrolRed formlarının REST karşılığı.
/// PROMPT-v4 §1: tüm bölüm yalnız elshan.rasulov kullanıcı adına açık —
/// rol bazlı değil (Yonetici dahil hiçbir rol geçemez). İstisna: history.
/// </summary>
[ApiController]
[Route("api/quality-control")]
[Authorize]
public sealed class QualityControlController(IQualityControlService qc) : ControllerBase
{
    // PurchaseController.FinalApproverUser kalıbı — kullanıcı adı bazlı yetki.
    private const string ControlUser = "elshan.rasulov";

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    private string? CurrentUserName => User.FindFirstValue(ClaimTypes.Name);

    // Süper-admin (admin) de elshan.rasulov ile aynı yetkiye sahiptir.
    private bool IsControlUser => CurrentUserName == ControlUser || User.IsSuperAdmin();

    [HttpGet]
    [HttpGet("pending")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<QualityControlListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPending()
    {
        if (!IsControlUser) return Forbid();
        var result = await qc.GetPendingAsync();
        return Ok(ApiResponse<IReadOnlyList<QualityControlListDto>>.Ok(result));
    }

    [HttpGet("{siparisNo}")]
    [ProducesResponseType(typeof(ApiResponse<OrderDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(string siparisNo)
    {
        if (!IsControlUser) return Forbid();
        var result = await qc.GetByIdAsync(siparisNo);
        return Ok(ApiResponse<OrderDetailDto>.Ok(result));
    }

    /// <summary>Bilerek geniş: diğer ekranların timeline'ı kullanıyor (PROMPT-v4 §1 istisnası).</summary>
    [HttpGet("{siparisNo}/history")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<OrderApprovalDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory(string siparisNo)
    {
        var result = await qc.GetControlHistoryAsync(siparisNo);
        return Ok(ApiResponse<IReadOnlyList<OrderApprovalDto>>.Ok(result));
    }

    /// <summary>POST + PUT (geriye uyum: Faz 1-3 PUT kullanıyordu).</summary>
    [HttpPost("{siparisNo}/approve")]
    [HttpPut("{siparisNo}/approve")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(string siparisNo, [FromBody] QcApproveDto? dto)
    {
        if (!IsControlUser) return Forbid();
        await qc.ApproveAsync(siparisNo, CurrentUserId, dto?.KontrolNot);
        return Ok(ApiResponse<object>.Ok(null!, "Başarıyla onaylandı!"));
    }

    [HttpPost("{siparisNo}/reject")]
    [HttpPut("{siparisNo}/reject")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(string siparisNo, [FromBody] RejectDto dto)
    {
        if (!IsControlUser) return Forbid();
        await qc.RejectAsync(siparisNo, CurrentUserId, dto.Red);
        return Ok(ApiResponse<object>.Ok(null!, "Sipariş reddedildi."));
    }
}
