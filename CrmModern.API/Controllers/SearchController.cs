using System.Security.Claims;
using CrmModern.API.Security;
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

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

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
        // PROMPT-v2 §6: Temsilci yalnız kendi siparişlerini arar — istemci
        // kullaniciID gönderse bile kendi id'sine zorlanır.
        if (User.IsInRole("Temsilci"))
            kullaniciID = CurrentUserId;

        var filter = new SearchFilterDto(
            siparisNo, musteriAd, kullaniciID, ulke,
            asama, kontrol, odemeDurum, baslangic, bitis);

        var result = await searchService.SearchAsync(filter);

        // PROMPT-v5 §2: Fabrika arama sonuçlarında sipariş parası göremez
        // (ToplamFiyat/Kaparo/KalanBakiye/OdenenMiktar karartılır).
        if (User.IsInRole("Fabrika"))
            result = result.Select(OrderDtoSanitizer.StripPricesForFactory).ToList();

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
        // PROMPT-v2 §6/§7: Temsilci için kullanıcı id'sini geçiriyoruz; servis
        // sipariş + müşteri sonuçlarını rol bazında kısıtlar.
        var result = await searchService.UnifiedSearchAsync(
            q ?? string.Empty,
            CurrentRole,
            User.IsInRole("Temsilci") ? CurrentUserId : null);
        return Ok(ApiResponse<UnifiedSearchResultDto>.Ok(result));
    }
}
