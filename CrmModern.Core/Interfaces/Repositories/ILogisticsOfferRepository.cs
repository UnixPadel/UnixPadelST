using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// LojistikTeklifTablo erişimi. Sipariş bazında teklif listeleme + onaylı teklif
/// çözümleme (sevk ön-doldurma ve muhasebe lojistik onay kartı için).
/// </summary>
public interface ILogisticsOfferRepository : IBaseRepository<LogisticsOffer>
{
    /// <summary>Siparişin tüm teklifleri (en yeni önce) — salt okuma (görüntüleme).</summary>
    Task<IReadOnlyList<LogisticsOffer>> GetByOrderAsync(string siparisNo);

    /// <summary>Siparişin tüm teklifleri — TRACKED (onay/iptal mutasyonu için).</summary>
    Task<IReadOnlyList<LogisticsOffer>> GetTrackedByOrderAsync(string siparisNo);

    /// <summary>Siparişin onaylı tek teklifi (yoksa null).</summary>
    Task<LogisticsOffer?> GetApprovedAsync(string siparisNo);

    /// <summary>Verilen siparişler için onaylı teklifleri toplu döndürür (SiparisNo → onaylı teklif).</summary>
    Task<IReadOnlyDictionary<string, LogisticsOffer>> GetApprovedForOrdersAsync(
        IReadOnlyCollection<string> siparisNolar);

    /// <summary>Verilen siparişler için teklif sayılarını toplu döndürür (SiparisNo → adet).</summary>
    Task<IReadOnlyDictionary<string, int>> GetOfferCountsAsync(
        IReadOnlyCollection<string> siparisNolar);
}
