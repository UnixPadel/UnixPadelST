using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Repository contract for SatinAlmaTalep (purchase / accounting approval requests).
/// </summary>
public interface IPurchaseRepository : IBaseRepository<PurchaseRequest>
{
    Task<IReadOnlyList<PurchaseRequest>> GetByDepartmanAsync(string departman);
    Task<IReadOnlyList<PurchaseRequest>> GetPendingAsync();
    Task<IReadOnlyList<PurchaseRequest>> GetHistoryAsync(int page, int pageSize);

    /// <summary>Belirli durum(lar)daki SatinAlma tipi talepler (Faz 6 aşama listeleri).</summary>
    Task<IReadOnlyList<PurchaseRequest>> GetByStatusesAsync(string[] statuses, string? talepTipi);

    /// <summary>Bir kullanıcının kendi talepleri (TalepEdenKullaniciAdi).</summary>
    Task<IReadOnlyList<PurchaseRequest>> GetByTalepEdenAsync(string kullaniciAdi);

    /// <summary>Çoklu filtre + sayfa için baz sorgu (TumTalepForm portu).</summary>
    Task<IReadOnlyList<PurchaseRequest>> SearchAsync(
        string?   talepEden,
        string?   departman,
        string?   durum,
        string?   talepTipi,
        DateTime? baslangic,
        DateTime? bitis,
        int?      talepNo = null);

    Task<int> ApproveAsync(int talepId, string islemYapanKullanici, DateTime islemTarihi);
    Task<int> RejectAsync(int talepId, string redNotu, string islemYapanKullanici, DateTime islemTarihi);

    Task<PurchaseRequest?> GetMuhasebeBySiparisNoAsync(string siparisNo);

    /// <summary>
    /// Birden çok sipariş için Muhasebe talebi — tek sorgu (SiparisNo → talep).
    /// Liste ekranlarında sipariş başına GetMuhasebeBySiparisNoAsync çağırmak
    /// (N+1) uzak DB'de her satıra bir gidiş-dönüş ekliyordu.
    /// </summary>
    Task<IReadOnlyDictionary<string, PurchaseRequest>> GetMuhasebeBySiparisNolarAsync(
        IReadOnlyCollection<string> siparisNolar);

    /// <summary>Onay Bekliyor durumundaki toplam talep sayısı (dashboard KPI).</summary>
    Task<int> CountPendingAsync();

    /// <summary>
    /// Faz 7 — Topbar global arama. UrunAdi/TalepEdenKullaniciAdi/Departman üzerinde LIKE.
    /// <paramref name="onlyTalepEden"/> doluysa yalnız o kullanıcının talepleri aranır.
    /// </summary>
    Task<IReadOnlyList<PurchaseRequest>> QuickFindAsync(string query, int limit, string? onlyTalepEden = null);

    // ── Round-9 §9 — çok kalemli talep satırları (SatinAlmaTalepKalem) ───────
    Task AddLinesAsync(IEnumerable<PurchaseRequestLine> lines);
    Task<IReadOnlyList<PurchaseRequestLine>> GetLinesByTalepIdAsync(int talepId);
}
