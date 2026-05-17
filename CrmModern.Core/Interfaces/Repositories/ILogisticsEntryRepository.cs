using CrmModern.Core.DTOs.Logistics;
using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Repository contract for LojistikTablo (logistics shipment entries).
/// </summary>
public interface ILogisticsEntryRepository : IBaseRepository<LogisticsEntry>
{
    /// <summary>Returns all entries, optionally filtered by SiparisNo and/or FirmaAdi.</summary>
    Task<IReadOnlyList<LogisticsEntry>> SearchAsync(string? siparisNo, string? firmaAdi);

    /// <summary>
    /// Paket 3: SearchAsync gibi ama her satıra Order.SiparisMiTeklifMi join'li olarak döner.
    /// History sayfasında durum rozeti (Muhasebe Onayı Bekliyor / Sevk Yolda / Tamamlandı) için.
    /// </summary>
    Task<IReadOnlyList<LogisticsHistoryDto>> SearchHistoryAsync(string? siparisNo, string? firmaAdi);

    /// <summary>LojistikYontim.cs satır 41: SELECT DISTINCT FirmaAdi FROM LojistikTablo.</summary>
    Task<IReadOnlyList<string>> GetDistinctCarriersAsync();

    /// <summary>SELECT DISTINCT LojistikCesit FROM LojistikTablo (taşıma türü dropdown).</summary>
    Task<IReadOnlyList<string>> GetDistinctCesitlerAsync();

    /// <summary>
    /// Paket 3: Muhasebe onayı bekleyen sevkler — LojistikTablo JOIN SiparisAlTablo
    /// WHERE Order.SiparisMiTeklifMi = 'Hazir'.
    /// </summary>
    Task<IReadOnlyList<LogisticsPendingApprovalDto>> GetPendingApprovalAsync();
}
