using System.Security.Claims;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Search;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public sealed class SearchController(ISearchService searchService) : ControllerBase
{
    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? "Temsilci";
    /// <summary>
    /// Searches orders/quotes with optional filters.
    /// All parameters are optional — omitting all returns every record.
    /// Maps to the Ara form DataGrid (SiparisAlTablo JOIN KullaniciBilgileri with KaparoFiyat/KalanBakiye).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<SearchResultDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string?   siparisNo   = null,
        [FromQuery] string?   musteriAd   = null,
        [FromQuery] int?      kullaniciID = null,
        [FromQuery] string?   ulke        = null,
        [FromQuery] string?   asama       = null,
        [FromQuery] string?   kontrol     = null,
        [FromQuery] string?   odemeDurum  = null,
        [FromQuery] DateTime? baslangic   = null,
        [FromQuery] DateTime? bitis       = null)
    {
        var filter = new SearchFilterDto(
            siparisNo, musteriAd, kullaniciID, ulke,
            asama, kontrol, odemeDurum, baslangic, bitis);

        var result = await searchService.SearchAsync(filter);
        return Ok(ApiResponse<IReadOnlyList<SearchResultDto>>.Ok(result));
    }

    /// <summary>
    /// Faz 7 — Topbar global arama. Tek query → Sipariş/Müşteri/Bileşen/Kategori/Kullanıcı/Satın Alma.
    /// Rol bazlı filtre uygulanır; en az 2 karakter gerekir.
    /// </summary>
    [HttpGet("unified")]
    [ProducesResponseType(typeof(ApiResponse<UnifiedSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UnifiedSearch([FromQuery] string q)
    {
        var result = await searchService.UnifiedSearchAsync(q ?? string.Empty, CurrentRole);
        return Ok(ApiResponse<UnifiedSearchResultDto>.Ok(result));
    }
}
