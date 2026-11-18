using System.Security.Claims;
using CrmModern.API.Authorization;
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
    private const string ControlUser = "elshan.rasulov";

    // Round-11 §3 — ad bazlı parasal gizleme (bkz. OrderController, web lib/visibility.ts).
    private static readonly string[] HideMoneyUsers = { "omur.caliskan" };

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? "Temsilci";

    private string? CurrentUserName => User.FindFirstValue(ClaimTypes.Name);

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    /// <summary>Satış Temsilcisi yalnız kendi kayıtlarını arar (WorkflowController kuralı).</summary>
    private int? OwnOrdersOnly =>
        User.IsInRole("Temsilci") && CurrentUserName != ControlUser && !User.IsSuperAdmin()
            ? CurrentUserId
            : null;

    private bool HidesMoney =>
        User.IsInRole("Fabrika") || (CurrentUserName is not null && HideMoneyUsers.Contains(CurrentUserName));

    /// <summary>
    /// Tek kutudan sipariş ve teklif araması. Sonuç, siparişin beklediği adımı taşır.
    /// Para görmeyen kullanıcıda tutar alanları boş döner ve tutarla eşleşme yapılmaz.
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType(typeof(ApiResponse<OrderSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> FindOrders(
        [FromQuery] string?   q         = null,
        [FromQuery] string?   tur       = null,
        [FromQuery] string?   asama     = null,
        [FromQuery] string?   kontrol   = null,
        [FromQuery] string?   ulke      = null,
        [FromQuery] DateTime? baslangic = null,
        [FromQuery] DateTime? bitis     = null)
    {
        var result = await searchService.FindOrdersAsync(new OrderSearchRequest(
            q, tur, asama, kontrol, ulke, baslangic, bitis,
            OnlyKullaniciId: OwnOrdersOnly,
            CanSeeMoney: !HidesMoney));
        return Ok(ApiResponse<OrderSearchResultDto>.Ok(result));
    }

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
        if (OwnOrdersOnly is int ownId)
            kullaniciID = ownId;

        var filter = new SearchFilterDto(
            siparisNo, musteriAd, kullaniciID, ulke,
            asama, kontrol, odemeDurum, baslangic, bitis);

        var result = await searchService.SearchAsync(filter);

        // PROMPT-v5 §2 + Round-11 §3: para görmeyen kullanıcı arama sonuçlarında
        // ToplamFiyat/Kaparo/KalanBakiye/OdenenMiktar göremez.
        if (HidesMoney)
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
        // PROMPT-v2 §6/§7: kısıtlı kullanıcının id'sini geçiriyoruz; servis sipariş +
        // müşteri sonuçlarını buna göre daraltır.
        var result = await searchService.UnifiedSearchAsync(
            q ?? string.Empty,
            CurrentRole,
            OwnOrdersOnly,
            !HidesMoney);
        return Ok(ApiResponse<UnifiedSearchResultDto>.Ok(result));
    }
}
