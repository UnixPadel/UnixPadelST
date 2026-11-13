using System.Security.Claims;
using CrmModern.API.Authorization;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Inbox;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// E-10 — Bekleyen İşler özeti: Ana Sayfa "Sıradaki işlerin" paneli ve menü
/// rozeti tek istekle beslenir. Kuyruklar kimliğe göre sunucuda belirlenir
/// (<see cref="Core.Inbox.InboxQueues"/>); yalnız sayı + en eski tarih döner.
/// </summary>
[ApiController]
[Route("api/inbox")]
[Authorize]
public sealed class InboxController(IInboxService inbox) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiResponse<InboxSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary()
    {
        var result = await inbox.GetSummaryAsync(
            CurrentUserId,
            User.FindFirstValue(ClaimTypes.Role),
            User.FindFirstValue(ClaimTypes.Name),
            User.IsSuperAdmin());
        return Ok(ApiResponse<InboxSummaryDto>.Ok(result));
    }
}
