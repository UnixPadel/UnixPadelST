using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Repository contract for BilesenBilgileri (components / parts).
/// </summary>
public interface IComponentRepository : IBaseRepository<Component>
{
    /// <summary>
    /// Returns all components with their Attributes pre-loaded.
    /// Used to populate the OznitelikTablo comboboxes in the order form.
    /// </summary>
    Task<IReadOnlyList<Component>> GetAllWithAttributesAsync();

    /// <summary>
    /// Returns only components that have a non-NULL Fiyat, ordered by name.
    /// Filters at the database level — safe even when legacy rows have NULL Fiyat.
    /// Used by the product catalog to list priceable components.
    /// </summary>
    Task<IReadOnlyList<Component>> GetAllPricedAsync();

    /// <summary>Faz 7 — Topbar global arama. BilesenAdi üzerinde LIKE.</summary>
    Task<IReadOnlyList<Component>> QuickFindAsync(string query, int limit);
}
