using CrmModern.Core.DTOs.Workflow;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>İç denetim: ekranın bir önceki adımında bekleyen siparişler ve siparişin güncel adımı.</summary>
public interface IWorkflowService
{
    /// <param name="screen">OrderWorkflow.Screens anahtarı; bilinmiyorsa BusinessException.</param>
    /// <param name="onlyKullaniciId">Temsilci kısıtı (yalnız kendi siparişleri).</param>
    Task<IReadOnlyList<WaitingOrderDto>> GetWaitingAsync(string screen, int? onlyKullaniciId);

    Task<OrderWorkflowStatusDto> GetOrderStatusAsync(string siparisNo, int? onlyKullaniciId);
}
