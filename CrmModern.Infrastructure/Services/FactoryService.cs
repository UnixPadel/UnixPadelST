using CrmModern.Core.DTOs.Factory;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Business logic for the Fabrika + FabrikaYontim WinForms screens.
/// MoveToProduction:  Planlama → Uretim  (FabrikaYontim.Onayla_Click)
/// MarkAsReady:       Uretim   → Hazir   (Fabrika "Hazır Aşaması" button)
/// </summary>
internal sealed class FactoryService(IUnitOfWork uow) : IFactoryService
{
    public async Task<IReadOnlyList<FactoryOrderListDto>> GetProductionOrdersAsync(string? asama = null)
    {
        var orders = await uow.Orders.GetProductionStagesAsync();
        // Paket 2 — opsiyonel aşama filtresi (Fabrika sayfası dropdown)
        if (!string.IsNullOrWhiteSpace(asama))
            orders = orders.Where(o => o.SiparisMiTeklifMi == asama).ToList().AsReadOnly();
        return orders
            .Select(o => new FactoryOrderListDto(
                o.SiparisNo, o.MusteriAd, o.MUlke,
                o.SiparisMiTeklifMi, o.FabrikaNot, o.STarih, o.Tarih))
            .ToList()
            .AsReadOnly();
    }

    public async Task MoveToProductionAsync(string siparisNo, DateTime stTarih, string fabrikaNot)
    {
        if (string.IsNullOrWhiteSpace(fabrikaNot))
            throw new BusinessException("FabrikaNot cannot be empty.");

        int rows = await uow.Orders.MoveToProductionAsync(siparisNo, stTarih, fabrikaNot);

        if (rows == 0)
        {
            var exists = await uow.Orders.GetByNoAsync(siparisNo);
            if (exists is null)
                throw new NotFoundException("Order", siparisNo);

            throw new BusinessException(
                $"Order '{siparisNo}' is not in 'Planlama' stage and cannot be moved to production.");
        }
    }

    public async Task MarkAsReadyAsync(string siparisNo)
    {
        int rows = await uow.Orders.MarkAsReadyAsync(siparisNo);

        if (rows == 0)
        {
            var exists = await uow.Orders.GetByNoAsync(siparisNo);
            if (exists is null)
                throw new NotFoundException("Order", siparisNo);

            throw new BusinessException(
                $"Order '{siparisNo}' is not in 'Uretim' stage and cannot be marked as ready.");
        }
    }
}
