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
    /// Paket 3: Sevk talebi oluştur. LojistikTablo INSERT + Order.STarih/LojistikNot UPDATE
    /// (Order.SiparisMiTeklifMi DEĞİŞMEZ — Muhasebe onayı bekleniyor) + SiparisOnaylari UPSERT
    /// durum='LojistikOnayBekliyor'.
    /// </summary>
    Task MoveToLogisticsAsync(string siparisNo, MoveToLogisticsDto dto);

    /// <summary>Paket 3: Muhasebe onayı bekleyen sevk talepleri listesi.</summary>
    Task<IReadOnlyList<LogisticsPendingApprovalDto>> GetPendingMuhasebeApprovalAsync();

    /// <summary>
    /// Paket 3: Muhasebe sevk talebini onaylar.
    /// Order: Hazir → Lojistik + SiparisOnaylari UPSERT durum='LojistikOnaylandi'.
    /// </summary>
    Task MuhasebeApproveLogisticsAsync(int sevkId, int currentUserId, string? aciklama);

    /// <summary>
    /// Paket 3: Muhasebe sevk talebini reddeder.
    /// LojistikTablo DELETE + Order='Hazir' kalır + SiparisOnaylari UPSERT durum='LojistikReddedildi'.
    /// </summary>
    Task MuhasebeRejectLogisticsAsync(int sevkId, int currentUserId, string redNotu);

    /// <summary>Sevki tamamla (sevkID üzerinden): Order='Tamamlandi' + TamamlandiTablo audit.</summary>
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
