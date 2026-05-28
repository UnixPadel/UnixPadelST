using CrmModern.Core.DTOs.Audit;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// Faz 8 — Genel audit log (EklemeGecmisi tablosu).
/// Yalnız Yönetici görüntüleyebilir.
/// </summary>
[ApiController]
[Route("api/audit")]
[Authorize(Roles = "Yonetici")]
public sealed class AuditController(IAuditService auditService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AuditEntryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string?   action      = null,
        [FromQuery] string?   entityType  = null,
        [FromQuery] int?      kullaniciID = null,
        [FromQuery] DateTime? baslangic   = null,
        [FromQuery] DateTime? bitis       = null,
        [FromQuery] int       limit       = 200)
    {
        var result = await auditService.SearchAsync(action, entityType, kullaniciID,
                                                    baslangic, bitis, limit);
        return Ok(ApiResponse<IReadOnlyList<AuditEntryDto>>.Ok(result));
    }
}
