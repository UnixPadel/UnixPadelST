using CrmModern.Core.DTOs.Logistics;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Lojistik + LojistikYontim + LojistikGecmis WinForms ekranları.
/// </summary>
public interface ILogisticsService
{
    /// <summary>Geniş kapsam (Faz 3): Siparis/Planlama/Uretim/Hazir/Lojistik/Tamamlandi.</summary>
    Task<IReadOnlyList<LogisticsOrderListDto>> GetLogisticsOrdersAsync();

    /// <summary>Sevkiyata aday liste: Hazir + Kontrol=Onay.</summary>
    Task<IReadOnlyList<LogisticsOrderListDto>> GetReadyForShipmentAsync();

    /// <summary>
    /// Round-9 §19: Sevk oluştur. LojistikTablo INSERT + Order Hazir → Lojistik
    /// (STarih/LojistikNot setlenir) + SiparisOnaylari UPSERT. Ayrı muhasebe sevk
    /// onay gate'i kaldırıldı.
    /// </summary>
    Task MoveToLogisticsAsync(string siparisNo, MoveToLogisticsDto dto);

    /// <summary>
    /// Round-9 §19: Sevki tamamla (sevkID): Order Lojistik → 'TamamlanmaBekliyor'
    /// (muhasebe tamamlama onayı bekler). Nihai 'Tamamlandi' FinalizeCompletion'da yazılır.
    /// </summary>
    Task CompleteShipmentAsync(int sevkId, int currentUserId, string? not);

    /// <summary>Sevki iptal et: LojistikTablo DELETE + Order rollback ('Hazir').</summary>
    Task CancelShipmentAsync(int sevkId, int currentUserId, string sebep);

    /// <summary>Geriye uyum: siparişNo ile tamamla.</summary>
    Task CompleteOrderAsync(string siparisNo);

    Task<IReadOnlyList<LogisticsHistoryDto>> GetHistoryAsync(string? siparisNo, string? firmaAdi);

    /// <summary>SELECT DISTINCT FirmaAdi (LojistikYontim dropdown).</summary>
    Task<IReadOnlyList<string>> GetCarriersAsync();

    /// <summary>SELECT DISTINCT LojistikCesit (taşıma türü dropdown).</summary>
    Task<IReadOnlyList<string>> GetCesitlerAsync();
}
