using CrmModern.Core.DTOs.Factory;
using CrmModern.Core.DTOs.Order;
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
    // Faz-fix 2.2 — Fabrika.cs `araButtonInTab_Click` filtrelerinin portu.
    // OrderFilterDto kullanır (OrdersPage ile aynı DTO).
    public async Task<IReadOnlyList<FactoryOrderListDto>> GetProductionOrdersAsync(OrderFilterDto filter)
    {
        var orders = await uow.Orders.GetProductionStagesAsync();

        if (!string.IsNullOrWhiteSpace(filter.Asama))
            orders = orders.Where(o => o.SiparisMiTeklifMi == filter.Asama).ToList().AsReadOnly();

        if (!string.IsNullOrWhiteSpace(filter.SiparisNo))
            orders = orders.Where(o => o.SiparisNo.Contains(filter.SiparisNo, StringComparison.OrdinalIgnoreCase))
                .ToList().AsReadOnly();

        if (!string.IsNullOrWhiteSpace(filter.MusteriAd))
            orders = orders.Where(o => o.MusteriAd.Contains(filter.MusteriAd, StringComparison.OrdinalIgnoreCase))
                .ToList().AsReadOnly();

        if (!string.IsNullOrWhiteSpace(filter.MUlke))
            orders = orders.Where(o => o.MUlke != null && o.MUlke.Contains(filter.MUlke, StringComparison.OrdinalIgnoreCase))
                .ToList().AsReadOnly();

        if (filter.KullaniciID is int uid && uid > 0)
            orders = orders.Where(o => o.KullaniciID == uid).ToList().AsReadOnly();

        if (filter.BaslangicTarih is DateTime b)
            orders = orders.Where(o => o.Tarih >= b).ToList().AsReadOnly();

        if (filter.BitisTarih is DateTime e)
            orders = orders.Where(o => o.Tarih <= e).ToList().AsReadOnly();

        // Temsilci adı için tek seferlik join (Kullanici tablosu); legacy
        // sorgusu CONCAT(Ad, ' ', Soyad) AS Kullanici döndürüyordu.
        var userIds = orders.Select(o => o.KullaniciID).Distinct().ToList();
        var users   = (await uow.Kullanicilar.GetAllAsync())
            .Where(u => userIds.Contains(u.KullaniciID))
            .ToDictionary(u => u.KullaniciID, u => $"{u.Ad} {u.Soyad}".Trim());

        // Round-8 §11 — Cari onay tarihini SiparisOnaylari'ndan toplu çek;
        // STarih (başlangıç) bozulmadan Fabrika listesine taşınır.
        var siparisNolar = orders.Select(o => o.SiparisNo).Distinct().ToList();
        var cariOnayTarihleri = await uow.OrderApprovals
            .GetApprovalDatesAsync(siparisNolar, "MuhasebeOnaylandi");

        return orders
            .Select(o => new FactoryOrderListDto(
                o.SiparisNo, o.MusteriAd, o.MUlke,
                o.SiparisMiTeklifMi, o.FabrikaNot, o.STarih, o.Tarih,
                o.KullaniciID,
                users.TryGetValue(o.KullaniciID, out var name) ? name : null,
                cariOnayTarihleri.TryGetValue(o.SiparisNo, out var cot) ? cot : null))
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
