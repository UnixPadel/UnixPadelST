using System.Security.Claims;
using CrmModern.API.Authorization;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Workflow;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// İç denetim — "önceki aşamada bekleyenler" ve siparişin güncel adımı.
/// Parasal alan içermediği için tüm oturum açmış roller okur (Fabrika dahil);
/// Temsilci yalnız kendi siparişlerini görür (OrderController kuralı).
/// </summary>
[ApiController]
[Route("api/workflow")]
[Authorize]
public sealed class WorkflowController(IWorkflowService workflowService) : ControllerBase
{
    private const string ControlUser = "elshan.rasulov";

    private int? OwnOrdersOnly =>
        User.IsInRole("Temsilci")
        && User.FindFirstValue(ClaimTypes.Name) != ControlUser
        && !User.IsSuperAdmin()
            ? int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new InvalidOperationException("KullaniciID claim missing."))
            : null;

    /// <summary>Ekranın bir önceki adımında bekleyen siparişler (ör. logistics-ready → Muhasebe lojistik onayı).</summary>
    [HttpGet("waiting/{screen}")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<WaitingOrderDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetWaiting(string screen)
    {
        var result = await workflowService.GetWaitingAsync(screen, OwnOrdersOnly);
        return Ok(ApiResponse<IReadOnlyList<WaitingOrderDto>>.Ok(result));
    }

    /// <summary>Siparişin şu an beklediği adım (sipariş detayı / "bu ekranda değil" ipucu).</summary>
    [HttpGet("order/{no}")]
    [ProducesResponseType(typeof(ApiResponse<OrderWorkflowStatusDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrderStatus(string no)
    {
        var result = await workflowService.GetOrderStatusAsync(no, OwnOrdersOnly);
        return Ok(ApiResponse<OrderWorkflowStatusDto>.Ok(result));
    }
}
