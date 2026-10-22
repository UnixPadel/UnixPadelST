using CrmModern.Core.DTOs.Workflow;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;
using CrmModern.Core.Workflow;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// İç denetim — her departman ekranı, siparişin neden henüz kendisine düşmediğini
/// görür; yalnız bir önceki adım (OrderWorkflow.Screens). Parasal alan dönmez.
/// </summary>
internal sealed class WorkflowService(IUnitOfWork uow) : IWorkflowService
{
    public async Task<IReadOnlyList<WaitingOrderDto>> GetWaitingAsync(string screen, int? onlyKullaniciId)
    {
        if (!OrderWorkflow.Screens.TryGetValue(screen, out var def))
            throw new BusinessException($"Bilinmeyen ekran: {screen}");

        var step   = def.Upstream;
        var orders = await uow.Orders.GetWorkflowHeadersAsync(step.Predicate, def.Narrow, onlyKullaniciId);
        if (orders.Count == 0) return [];

        var since = await LoadApprovalDatesAsync(orders, step);

        var userIds = orders.Select(o => o.KullaniciID).Distinct().ToList();
        var users   = (await uow.Kullanicilar.GetAllAsync())
            .Where(u => userIds.Contains(u.KullaniciID))
            .ToDictionary(u => u.KullaniciID, u => $"{u.Ad} {u.Soyad}".Trim());

        return orders
            .Select(o => new WaitingOrderDto(
                o.SiparisNo, o.MusteriAd, o.MUlke, o.SiparisMiTeklifMi,
                step.Code, step.Department,
                WaitingSince(o, step, since),
                users.TryGetValue(o.KullaniciID, out var name) ? name : null))
            .ToList()
            .AsReadOnly();
    }

    public async Task<OrderWorkflowStatusDto> GetOrderStatusAsync(string siparisNo, int? onlyKullaniciId)
    {
        var order = await uow.Orders.GetWorkflowHeaderAsync(siparisNo);
        if (order is null || (onlyKullaniciId is int uid && order.KullaniciID != uid))
            throw new NotFoundException("Sipariş", siparisNo);

        var step = OrderWorkflow.CurrentStep(order);
        if (step is null)
            return new OrderWorkflowStatusDto(order.SiparisNo, order.SiparisMiTeklifMi, null, null, null);

        var since = await LoadApprovalDatesAsync([order], step);
        return new OrderWorkflowStatusDto(
            order.SiparisNo, order.SiparisMiTeklifMi, step.Code, step.Department,
            WaitingSince(order, step, since));
    }

    private async Task<IReadOnlyDictionary<string, DateTime?>> LoadApprovalDatesAsync(
        IReadOnlyList<Order> orders, WorkflowStep step) =>
        step.SinceApproval is null
            ? new Dictionary<string, DateTime?>()
            : await uow.OrderApprovals.GetApprovalDatesAsync(
                orders.Select(o => o.SiparisNo).Distinct().ToList(), step.SinceApproval);

    // Bekleme başlangıcı: ilgili onay kaydı → aşama tarihi (STarih) → revizyon → oluşturma.
    private static DateTime? WaitingSince(Order o, WorkflowStep step, IReadOnlyDictionary<string, DateTime?> approvals)
    {
        if (approvals.TryGetValue(o.SiparisNo, out var approved) && approved is not null) return approved;
        if (step.SinceStageDate && o.STarih is not null) return o.STarih;
        return o.DegisiklikTarihi ?? o.Tarih;
    }
}
