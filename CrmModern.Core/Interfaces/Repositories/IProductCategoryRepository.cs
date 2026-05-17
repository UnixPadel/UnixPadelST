using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Repository contract for UrunKategorileri (product categories).
/// </summary>
public interface IProductCategoryRepository : IBaseRepository<ProductCategory>
{
    /// <summary>
    /// Returns all categories with their CategoryComponents and nested Components
    /// pre-loaded, ready for the order form dropdowns.
    /// </summary>
    Task<IReadOnlyList<ProductCategory>> GetAllWithComponentsAsync();

    /// <summary>
    /// Returns a single category with its CategoryComponents and Component.Attributes
    /// fully loaded — used when the user selects a category in the order form.
    /// </summary>
    Task<ProductCategory?> GetWithComponentsAsync(int kategoriID);

    /// <summary>Faz 7 — Topbar global arama. KategoriAdi üzerinde LIKE.</summary>
    Task<IReadOnlyList<ProductCategory>> QuickFindAsync(string query, int limit);
}
