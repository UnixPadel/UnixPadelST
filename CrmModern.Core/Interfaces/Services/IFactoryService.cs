using CrmModern.Core.DTOs.Factory;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic for the Fabrika + FabrikaYontim WinForms screens.
/// </summary>
public interface IFactoryService
{
    Task<IReadOnlyList<FactoryOrderListDto>> GetProductionOrdersAsync(string? asama = null);
    Task MoveToProductionAsync(string siparisNo, DateTime stTarih, string fabrikaNot);
    Task MarkAsReadyAsync(string siparisNo);
}
