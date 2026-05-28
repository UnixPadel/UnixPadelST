using System.Security.Claims;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.DTOs.QualityControl;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// WinForms Kontrol / KontrolRed formlarının REST karşılığı.
/// Yetki: Yonetici (Form3.cs satır 156-179).
/// </summary>
[ApiController]
[Route("api/quality-control")]
[Authorize(Roles = "Yonetici")]
public sealed class QualityControlController(IQualityControlService qc) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    [HttpGet]
    [HttpGet("pending")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<QualityControlListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPending()
    {
        var result = await qc.GetPendingAsync();
        return Ok(ApiResponse<IReadOnlyList<QualityControlListDto>>.Ok(result));
    }

    [HttpGet("{siparisNo}")]
    [ProducesResponseType(typeof(ApiResponse<OrderDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(string siparisNo)
    {
        var result = await qc.GetByIdAsync(siparisNo);
        return Ok(ApiResponse<OrderDetailDto>.Ok(result));
    }

    [HttpGet("{siparisNo}/history")]
    [Authorize]   // history herkese açık (Yonetici override yok)
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
        await qc.ApproveAsync(siparisNo, CurrentUserId, dto?.KontrolNot);
        return Ok(ApiResponse<object>.Ok(null!, "Başarıyla onaylandı."));
    }

    [HttpPost("{siparisNo}/reject")]
    [HttpPut("{siparisNo}/reject")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(string siparisNo, [FromBody] RejectDto dto)
    {
        await qc.RejectAsync(siparisNo, CurrentUserId, dto.Red);
        return Ok(ApiResponse<object>.Ok(null!, "Sipariş reddedildi."));
    }
}
