using CrmModern.Core.DTOs.Factory;
using CrmModern.Core.DTOs.Order;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic for the Fabrika + FabrikaYontim WinForms screens.
/// </summary>
public interface IFactoryService
{
    Task<IReadOnlyList<FactoryOrderListDto>> GetProductionOrdersAsync(OrderFilterDto filter);
    Task MoveToProductionAsync(string siparisNo, DateTime stTarih, string fabrikaNot);
    Task MarkAsReadyAsync(string siparisNo);
}
