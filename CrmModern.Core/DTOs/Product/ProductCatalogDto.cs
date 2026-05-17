namespace CrmModern.Core.DTOs.Product;

public sealed record ProductCatalogCategoryDto(
    int     KategoriID,
    string  KategoriAdi,
    int Fiyat,
    IReadOnlyList<CategoryComponentDto> Components);

public sealed record CategoryComponentDto(
    int     BilesenID,
    string  BilesenAdi,
    string? Birim,
    int Fiyat,
    int     Adet);

public sealed record ProductCatalogComponentDto(
    int     BilesenID,
    string  BilesenAdi,
    string? Birim,
    int Fiyat);

public sealed record CreateCategoryDto(string KategoriAdi);

public sealed record UpdateCategoryDto(string KategoriAdi);

public sealed record CreateComponentDto(string BilesenAdi, string? Birim);

public sealed record UpdateComponentDto(string BilesenAdi, string? Birim, int Fiyat);

public sealed record UpdateRecipeDto(
    int Fiyat,
    IReadOnlyList<RecipeComponentDto> Components);

public sealed record RecipeComponentDto(int BilesenID, int Adet);

// ── Attributes (OznitelikTablo) ──────────────────────────────────────────────

public sealed record AttributeDto(int OznitelikID, int BilesenID, string OznitelikAdı);

public sealed record CreateAttributeDto(int BilesenID, string OznitelikAdı);

public sealed record UpdateAttributeDto(string OznitelikAdı);
