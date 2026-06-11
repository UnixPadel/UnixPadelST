using CrmModern.Core.DTOs.Order;
using CrmModern.Core.DTOs.QualityControl;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business operations for the Kontrol / KontrolRed WinForms screens.
/// Maps to QualityControlController endpoints.
/// </summary>
public interface IQualityControlService
{
    Task<IReadOnlyList<QualityControlListDto>> GetPendingAsync();

    /// <summary>Sipariş tam detay (header + items + details). Kontrol formu detay paneli için.</summary>
    Task<OrderDetailDto> GetByIdAsync(string siparisNo);

    /// <summary>SiparisOnaylari audit log (kim ne zaman onayladı/reddetti).</summary>
    Task<IReadOnlyList<OrderApprovalDto>> GetControlHistoryAsync(string siparisNo);

    /// <summary>
    /// QC Onay (PROMPT-v4 §5.1): Order.Kontrol='Onay', Teklif/Siparis doğrudan
    /// 'Planlama'ya taşınır (Fabrika kuyruğu), SiparisOnaylari'na audit satırı yazılır.
    /// </summary>
    Task ApproveAsync(string siparisNo, int currentUserId, string? kontrolNot);

    /// <summary>
    /// QC Red: Order.Kontrol='Reddet', Order.Red=red,
    /// SiparisOnaylari'na audit satırı yazılır.
    /// </summary>
    Task RejectAsync(string siparisNo, int currentUserId, string red);
}
