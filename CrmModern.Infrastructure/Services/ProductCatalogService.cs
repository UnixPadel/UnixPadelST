using CrmModern.Core.DTOs.Product;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;
using EntityAttribute = CrmModern.Core.Entities.Attribute;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Business logic for the AnaUrun + Bilesen + Recete WinForms screens.
/// UpdateRecipe atomically updates category price + replaces component list
/// (mirrors Recete form's iliskilendirButton: DELETE all + INSERT new rows).
/// </summary>
internal sealed class ProductCatalogService(IUnitOfWork uow) : IProductCatalogService
{
    public async Task<IReadOnlyList<ProductCatalogCategoryDto>> GetCategoriesAsync()
    {
        var cats = await uow.ProductCategories.GetAllWithComponentsAsync();
        return cats.Select(MapCategory).ToList().AsReadOnly();
    }

    public async Task CreateCategoryAsync(CreateCategoryDto dto)
    {
        var entity = new ProductCategory { KategoriAdi = dto.KategoriAdi, Fiyat = 0 };
        await uow.ProductCategories.AddAsync(entity);
        await uow.SaveChangesAsync();
    }

    public async Task UpdateCategoryAsync(int kategoriId, UpdateCategoryDto dto)
    {
        var entity = await uow.ProductCategories.GetByIdAsync(kategoriId)
            ?? throw new NotFoundException("ProductCategory", kategoriId);
        entity.KategoriAdi = dto.KategoriAdi;
        uow.ProductCategories.Update(entity);
        await uow.SaveChangesAsync();
    }

    public async Task DeleteCategoryAsync(int kategoriId)
    {
        var entity = await uow.ProductCategories.GetByIdAsync(kategoriId)
            ?? throw new NotFoundException("ProductCategory", kategoriId);
        uow.ProductCategories.Remove(entity);
        await uow.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<ProductCatalogComponentDto>> GetComponentsAsync()
    {
        var comps = await uow.Components.GetAllPricedAsync();
        return comps
            .Select(c => new ProductCatalogComponentDto(c.BilesenID, c.BilesenAdi, c.Birim, c.Fiyat!.Value))
            .ToList()
            .AsReadOnly();
    }

    public async Task CreateComponentAsync(CreateComponentDto dto)
    {
        var entity = new Component { BilesenAdi = dto.BilesenAdi, Birim = dto.Birim, Fiyat = 0 };
        await uow.Components.AddAsync(entity);
        await uow.SaveChangesAsync();
    }

    public async Task UpdateComponentAsync(int bilesenId, UpdateComponentDto dto)
    {
        var entity = await uow.Components.GetByIdAsync(bilesenId)
            ?? throw new NotFoundException("Component", bilesenId);

        entity.BilesenAdi = dto.BilesenAdi;
        entity.Birim      = dto.Birim;
        entity.Fiyat      = dto.Fiyat;
        uow.Components.Update(entity);
        await uow.SaveChangesAsync();
    }

    public async Task DeleteComponentAsync(int bilesenId)
    {
        var entity = await uow.Components.GetByIdAsync(bilesenId)
            ?? throw new NotFoundException("Component", bilesenId);
        uow.Components.Remove(entity);
        await uow.SaveChangesAsync();
    }

    public async Task<ProductCatalogCategoryDto> GetRecipeAsync(int kategoriId)
    {
        var cat = await uow.ProductCategories.GetWithComponentsAsync(kategoriId)
            ?? throw new NotFoundException("ProductCategory", kategoriId);

        return MapCategory(cat);
    }

    public async Task UpdateRecipeAsync(int kategoriId, UpdateRecipeDto dto)
    {
        var cat = await uow.ProductCategories.GetWithComponentsAsync(kategoriId)
            ?? throw new NotFoundException("ProductCategory", kategoriId);

        // Update price
        cat.Fiyat = dto.Fiyat;

        // Replace component list: remove all existing, add new rows
        cat.CategoryComponents.Clear();
        foreach (var c in dto.Components)
        {
            cat.CategoryComponents.Add(new CategoryComponent
            {
                KategoriID = kategoriId,
                BilesenID  = c.BilesenID,
                Adet       = c.Adet
            });
        }

        uow.ProductCategories.Update(cat);
        await uow.SaveChangesAsync();
    }

    // ── Attributes (OznitelikTablo) ──────────────────────────────────────────

    public async Task<IReadOnlyList<AttributeDto>> GetAttributesAsync(int? bilesenId = null)
    {
        var list = bilesenId.HasValue
            ? await uow.Attributes.GetByComponentAsync(bilesenId.Value)
            : (await uow.Attributes.GetAllAsync()).ToList();

        return list
            .Select(a => new AttributeDto(a.OznitelikID, a.BilesenID, a.OznitelikAdı))
            .ToList()
            .AsReadOnly();
    }

    public async Task<AttributeDto> CreateAttributeAsync(CreateAttributeDto dto)
    {
        // Bileşenin var olduğunu doğrula — DB FK zaten zorlar ama erken/temiz hata için
        _ = await uow.Components.GetByIdAsync(dto.BilesenID)
            ?? throw new NotFoundException("Component", dto.BilesenID);

        var entity = new EntityAttribute { BilesenID = dto.BilesenID, OznitelikAdı = dto.OznitelikAdı };
        await uow.Attributes.AddAsync(entity);
        await uow.SaveChangesAsync();
        return new AttributeDto(entity.OznitelikID, entity.BilesenID, entity.OznitelikAdı);
    }

    public async Task UpdateAttributeAsync(int oznitelikId, UpdateAttributeDto dto)
    {
        var entity = await uow.Attributes.GetByIdAsync(oznitelikId)
            ?? throw new NotFoundException("Attribute", oznitelikId);
        entity.OznitelikAdı = dto.OznitelikAdı;
        uow.Attributes.Update(entity);
        await uow.SaveChangesAsync();
    }

    public async Task DeleteAttributeAsync(int oznitelikId)
    {
        var entity = await uow.Attributes.GetByIdAsync(oznitelikId)
            ?? throw new NotFoundException("Attribute", oznitelikId);
        uow.Attributes.Remove(entity);
        await uow.SaveChangesAsync();
    }

    private static ProductCatalogCategoryDto MapCategory(ProductCategory cat) =>
        new(
            cat.KategoriID,
            cat.KategoriAdi,
            cat.Fiyat,
            cat.CategoryComponents
                .Select(cc => new CategoryComponentDto(
                    cc.BilesenID,
                    cc.Component?.BilesenAdi ?? string.Empty,
                    cc.Component?.Birim,
                    cc.Component?.Fiyat ?? 0,
                    cc.Adet))
                .ToList()
                .AsReadOnly());
}
