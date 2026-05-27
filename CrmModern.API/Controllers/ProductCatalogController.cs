using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Product;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// AnaUrun + Bilesen + Recete + Oznitelik (WinForms) ekranlarının REST karşılığı.
/// Yazma yetkisi yalnız Yonetici (Form3.cs satır 156–179: yalnız Yonetici'de
/// kategoriEkle/bilesenEkle/anaUrunButton/iliskilendirTabButton enable).
/// Okuma tüm authenticated kullanıcılarda.
/// </summary>
[ApiController]
[Route("api/product-catalog")]
[Authorize]
public sealed class ProductCatalogController(IProductCatalogService productCatalogService) : ControllerBase
{
    // ── Categories (AnaUrun) ──────────────────────────────────────────────────

    [HttpGet("categories")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ProductCatalogCategoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories()
    {
        var result = await productCatalogService.GetCategoriesAsync();
        return Ok(ApiResponse<IReadOnlyList<ProductCatalogCategoryDto>>.Ok(result));
    }

    [HttpPost("categories")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        await productCatalogService.CreateCategoryAsync(dto);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<object>.Ok(null!, "Kategori oluşturuldu."));
    }

    [HttpPut("categories/{kategoriId:int}")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCategory(int kategoriId, [FromBody] UpdateCategoryDto dto)
    {
        await productCatalogService.UpdateCategoryAsync(kategoriId, dto);
        return Ok(ApiResponse<object>.Ok(null!, "Kategori güncellendi."));
    }

    [HttpDelete("categories/{kategoriId:int}")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCategory(int kategoriId)
    {
        await productCatalogService.DeleteCategoryAsync(kategoriId);
        return NoContent();
    }

    // ── Components (Bilesen) ──────────────────────────────────────────────────

    [HttpGet("components")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ProductCatalogComponentDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetComponents()
    {
        var result = await productCatalogService.GetComponentsAsync();
        return Ok(ApiResponse<IReadOnlyList<ProductCatalogComponentDto>>.Ok(result));
    }

    [HttpPost("components")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateComponent([FromBody] CreateComponentDto dto)
    {
        await productCatalogService.CreateComponentAsync(dto);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<object>.Ok(null!, "Bileşen oluşturuldu."));
    }

    [HttpPut("components/{bilesenId:int}")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateComponent(int bilesenId, [FromBody] UpdateComponentDto dto)
    {
        await productCatalogService.UpdateComponentAsync(bilesenId, dto);
        return Ok(ApiResponse<object>.Ok(null!, "Bileşen güncellendi."));
    }

    [HttpDelete("components/{bilesenId:int}")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteComponent(int bilesenId)
    {
        await productCatalogService.DeleteComponentAsync(bilesenId);
        return NoContent();
    }

    // ── Attributes (OznitelikTablo) ───────────────────────────────────────────

    [HttpGet("attributes")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AttributeDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAttributes([FromQuery] int? bilesenId)
    {
        var result = await productCatalogService.GetAttributesAsync(bilesenId);
        return Ok(ApiResponse<IReadOnlyList<AttributeDto>>.Ok(result));
    }

    [HttpPost("attributes")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<AttributeDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateAttribute([FromBody] CreateAttributeDto dto)
    {
        var created = await productCatalogService.CreateAttributeAsync(dto);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<AttributeDto>.Ok(created, "Öznitelik oluşturuldu."));
    }

    [HttpPut("attributes/{oznitelikId:int}")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAttribute(int oznitelikId, [FromBody] UpdateAttributeDto dto)
    {
        await productCatalogService.UpdateAttributeAsync(oznitelikId, dto);
        return Ok(ApiResponse<object>.Ok(null!, "Öznitelik güncellendi."));
    }

    [HttpDelete("attributes/{oznitelikId:int}")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAttribute(int oznitelikId)
    {
        await productCatalogService.DeleteAttributeAsync(oznitelikId);
        return NoContent();
    }

    // ── Recipe (Recete) ───────────────────────────────────────────────────────

    [HttpGet("categories/{kategoriId:int}/recipe")]
    [ProducesResponseType(typeof(ApiResponse<ProductCatalogCategoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRecipe(int kategoriId)
    {
        var result = await productCatalogService.GetRecipeAsync(kategoriId);
        return Ok(ApiResponse<ProductCatalogCategoryDto>.Ok(result));
    }

    /// <summary>
    /// Reçete fiyatı ve kalem listesini atomik olarak günceller (DELETE-then-INSERT pattern,
    /// Recete.cs iliskilendirButton ile birebir).
    /// </summary>
    [HttpPut("categories/{kategoriId:int}/recipe")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRecipe(int kategoriId, [FromBody] UpdateRecipeDto dto)
    {
        await productCatalogService.UpdateRecipeAsync(kategoriId, dto);
        return Ok(ApiResponse<object>.Ok(null!, "Reçete güncellendi."));
    }
}
