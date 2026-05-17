using CrmModern.Core.DTOs.Product;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic for the AnaUrun + Bilesen + Recete WinForms screens.
/// </summary>
public interface IProductCatalogService
{
    // ── Categories (AnaUrun) ──────────────────────────────────────────────
    Task<IReadOnlyList<ProductCatalogCategoryDto>> GetCategoriesAsync();
    Task CreateCategoryAsync(CreateCategoryDto dto);
    Task UpdateCategoryAsync(int kategoriId, UpdateCategoryDto dto);
    Task DeleteCategoryAsync(int kategoriId);

    // ── Components (Bilesen) ──────────────────────────────────────────────
    Task<IReadOnlyList<ProductCatalogComponentDto>> GetComponentsAsync();
    Task CreateComponentAsync(CreateComponentDto dto);
    Task UpdateComponentAsync(int bilesenId, UpdateComponentDto dto);
    Task DeleteComponentAsync(int bilesenId);

    // ── Recipe (Recete — DELETE-then-INSERT pattern preserved) ────────────
    Task<ProductCatalogCategoryDto> GetRecipeAsync(int kategoriId);
    Task UpdateRecipeAsync(int kategoriId, UpdateRecipeDto dto);

    // ── Attributes (OznitelikTablo) ──────────────────────────────────────
    Task<IReadOnlyList<AttributeDto>> GetAttributesAsync(int? bilesenId = null);
    Task<AttributeDto>                CreateAttributeAsync(CreateAttributeDto dto);
    Task                              UpdateAttributeAsync(int oznitelikId, UpdateAttributeDto dto);
    Task                              DeleteAttributeAsync(int oznitelikId);
}
