using System.Linq.Expressions;
using CrmModern.Core.DTOs.Dashboard;
using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Repository contract for SiparisAlTablo (Order / Quote records).
/// Also manages child tables SiparisIslemTablo and DetayTablo,
/// since they share the SiparisNo string key and are always owned by the parent Order.
/// </summary>
public interface IOrderRepository : IBaseRepository<Order>
{
    /// <summary>Loads a full order by its SiparisNo, including Items and Details.</summary>
    Task<Order?> GetByNoAsync(string siparisNo);

    /// <summary>Returns all orders/quotes owned by the given user, newest first.</summary>
    Task<IReadOnlyList<Order>> GetByKullaniciAsync(int kullaniciID);

    /// <summary>
    /// Returns the next available sequential suffix for order/quote number generation.
    /// Queries MAX(SiparisAlID) + 1, matching the WinForms logic.
    /// </summary>
    Task<int> GetNextSequenceAsync();

    /// <summary>Removes all SiparisIslemTablo rows for the given SiparisNo.</summary>
    Task DeleteItemsAsync(string siparisNo);

    /// <summary>Removes all DetayTablo rows for the given SiparisNo.</summary>
    Task DeleteDetailsAsync(string siparisNo);

    /// <summary>Inserts a batch of OrderItem rows (SiparisIslemTablo).</summary>
    Task AddItemsAsync(IEnumerable<OrderItem> items);

    /// <summary>Inserts a batch of OrderDetail rows (DetayTablo).</summary>
    Task AddDetailsAsync(IEnumerable<OrderDetail> details);

    // ── Ekstra maliyet (SiparisEkMaliyet) ──────────────────────────────────────

    /// <summary>Bir siparişin ekstra maliyet kalemleri (EkMaliyetID artan).</summary>
    Task<IReadOnlyList<OrderExtraCost>> GetExtraCostsByOrderIdAsync(int siparisAlID);

    /// <summary>Tek ekstra maliyet kalemi (silme için; bulunamazsa null).</summary>
    Task<OrderExtraCost?> GetExtraCostByIdAsync(int ekMaliyetID);

    /// <summary>Ekstra maliyet kalemi ekler (SaveChanges çağrısı servise bırakılır).</summary>
    Task AddExtraCostAsync(OrderExtraCost cost);

    /// <summary>Ekstra maliyet kalemini siler (SaveChanges çağrısı servise bırakılır).</summary>
    void RemoveExtraCost(OrderExtraCost cost);

    // ── Quality Control ───────────────────────────────────────────────────────

    // ── Factory ───────────────────────────────────────────────────────────────

    /// <summary>Returns orders in production stages (Planlama/Uretim/Hazir/Lojistik/Tamamlandi), newest first.</summary>
    Task<IReadOnlyList<Order>> GetProductionStagesAsync();

    /// <summary>Promotes order from 'Planlama' → 'Uretim', sets STarih and FabrikaNot. Returns rows affected (0 = not in Planlama).</summary>
    Task<int> MoveToProductionAsync(string siparisNo, DateTime stTarih, string fabrikaNot);

    /// <summary>Promotes order from 'Uretim' → 'Hazir'. Returns rows affected.</summary>
    Task<int> MarkAsReadyAsync(string siparisNo);

    // ── Logistics ─────────────────────────────────────────────────────────────

    /// <summary>Returns orders in logistics-trackable stages (Siparis/Planlama/Uretim/Hazir/Lojistik/Tamamlandi).</summary>
    Task<IReadOnlyList<Order>> GetLogisticsStagesAsync();

    /// <summary>
    /// Promotes order from 'Hazir' → 'Lojistik', sets STarih and LojistikNot. Returns rows affected
    /// (0 = not Hazir, Kontrol not 'Onay', or LojistikOnay 'Bekliyor').
    /// </summary>
    Task<int> MoveToLogisticsAsync(string siparisNo, DateTime stTarih, string lojistikNot);

    /// <summary>
    /// Paket 3: STarih + LojistikNot setler ama SiparisMiTeklifMi'yi DEĞİŞTİRMEZ.
    /// Sevk talebi açıldığında, sipariş 'Hazir'da kalırken sevk bilgilerini saklamak için.
    /// </summary>
    Task<int> UpdateLogisticsFieldsAsync(string siparisNo, DateTime stTarih, string lojistikNot);

    /// <summary>
    /// Paket 3: 'Hazir' → 'Lojistik' aşama geçişi (STarih/LojistikNot dokunulmaz).
    /// Muhasebe sevki onayladığında çağrılır.
    /// </summary>
    Task<int> PromoteHazirToLogisticsAsync(string siparisNo);

    /// <summary>Completes an order: SiparisMiTeklifMi = 'Tamamlandi'. Returns rows affected.</summary>
    Task<int> CompleteOrderAsync(string siparisNo);

    /// <summary>Round-9 §19: 'Lojistik' → 'TamamlanmaBekliyor' (muhasebe tamamlama onayı bekler).</summary>
    Task<int> CompleteShipmentToPendingAsync(string siparisNo);

    /// <summary>Round-9 §19: 'TamamlanmaBekliyor' → 'Tamamlandi' (Burcu finalize). Returns rows affected.</summary>
    Task<int> FinalizeCompletionAsync(string siparisNo);

    // ── Search ────────────────────────────────────────────────────────────────

    /// <summary>Returns orders matching the given filter parameters. All parameters are optional.</summary>
    Task<IReadOnlyList<Order>> SearchAsync(
        string?   siparisNo,
        string?   musteriAd,
        int?      kullaniciID,
        string?   ulke,
        string?   asama,
        string?   kontrol,
        string?   odemeDurum,
        DateTime? baslangic,
        DateTime? bitis);

    // ── Accounting ────────────────────────────────────────────────────────────

    /// <summary>Returns orders with Kontrol = 'Onay', newest first (Muhasebe screen).</summary>
    Task<IReadOnlyList<Order>> GetAccountingOrdersAsync();

    // ── Quality Control ───────────────────────────────────────────────────────

    /// <summary>
    /// Kalite Kontrol listesi: bekleyen (Kontrol='Kontrol') TÜM kayıtlar +
    /// <paramref name="approvedSince"/> tarihinden sonra onaylanan (Kontrol='Onay',
    /// SiparisOnaylari'nda 'Onaylandi' audit'i) kayıtlar, en yeni önce.
    /// </summary>
    Task<IReadOnlyList<Order>> GetQualityControlListAsync(DateTime approvedSince);

    /// <summary>
    /// Sets Kontrol = 'Onay'. If the order is a 'Teklif', also promotes it to 'Siparis'.
    /// Returns the number of rows affected (0 = not found or already approved).
    /// </summary>
    Task<int> ApproveQualityControlAsync(string siparisNo);

    /// <summary>
    /// Sets Kontrol = 'Reddet' and writes the rejection note.
    /// Only allowed when Kontrol &lt;&gt; 'Onay'.
    /// Returns the number of rows affected.
    /// </summary>
    Task<int> RejectQualityControlAsync(string siparisNo, string red);

    /// <summary>
    /// Faz 7 — Topbar global arama. SiparisNo/TeklifNo/MusteriAd/MAdres üzerinde LIKE.
    /// En yeni N sipariş döner.
    /// </summary>
    Task<IReadOnlyList<Order>> QuickFindAsync(string query, int limit);

    // ── Dashboard (Faz 7) ─────────────────────────────────────────────────────

    /// <summary>Son N gün içinde oluşturulan sipariş sayısı (Teklif değil, Siparis ve sonrası).</summary>
    Task<int> CountSiparisInLastDaysAsync(int days);

    /// <summary>Son N gün içinde ParaTipi başına ciro toplamı (Teklif değil, Siparis ve sonrası).</summary>
    Task<IReadOnlyDictionary<string, decimal>> SumCiroByCurrencyInLastDaysAsync(int days);

    /// <summary>Kontrol = 'Kontrol' olan bekleyen kontrol sayısı.</summary>
    Task<int> CountBekleyenKontrolAsync();

    /// <summary>SiparisMiTeklifMi 'Uretim' olan sipariş sayısı.</summary>
    Task<int> CountUretimdekiAsync();

    /// <summary>SiparisMiTeklifMi 'Hazir' veya 'Lojistik' olan sipariş sayısı.</summary>
    Task<int> CountSevkiyatBekleyenAsync();

    /// <summary>OdemeDurum 'Ödeme Bekleniyor' veya null/boş olan sipariş sayısı (Teklif hariç).</summary>
    Task<int> CountOdemeBekleyenAsync();

    /// <summary>Belirli kullanıcının açık (Tamamlandi/Iptal olmayan) sipariş sayısı.</summary>
    Task<int> CountAcikSiparisByKullaniciAsync(int kullaniciID);

    /// <summary>Son N ay sipariş trendi (ay başına sayı + ParaTipi bazlı ciro).</summary>
    Task<IReadOnlyList<OrderTrendPointDto>> GetOrdersByMonthAsync(int months);

    /// <summary>SiparisMiTeklifMi bazında grup sayıları (pie/donut).</summary>
    Task<IReadOnlyList<StageDistributionDto>> GetOrdersByStageAsync();

    /// <summary>Son N günde en çok ciro yapan müşteriler (bar). Teklif hariç.</summary>
    Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(int days, int limit);

    /// <summary>Son N günde ParaTipi başına sipariş sayısı + ciro (Teklif hariç).</summary>
    Task<IReadOnlyList<CurrencyDistributionDto>> GetCurrencyDistributionAsync(int days);

    /// <summary>Round-8 §13 — Tarih aralığındaki (silinmemiş) sipariş başlık satırları;
    /// Temsilci performans raporu servis tarafında bunları gruplar.</summary>
    Task<IReadOnlyList<Order>> GetOrdersInRangeAsync(DateTime start, DateTime end);

    /// <summary>§19 — Tek temsilcinin tarih aralığındaki (silinmemiş) siparişleri (detay rapor).</summary>
    Task<IReadOnlyList<Order>> GetRepReportOrdersAsync(int kullaniciID, DateTime start, DateTime end);

    /// <summary>§19 — Verilen sipariş numaralarına ait SiparisIslemTablo kalemleri (toplu yükleme).</summary>
    Task<IReadOnlyList<OrderItem>> GetItemsForOrdersAsync(IReadOnlyCollection<string> siparisNolar);

    // ── İç denetim (workflow) ─────────────────────────────────────────────────

    /// <summary>
    /// OrderWorkflow adım koşuluna (ve opsiyonel daraltmaya) uyan siparişlerin
    /// başlık alanları, en yeni önce. Blob/parasal kolonlar yüklenmez.
    /// </summary>
    Task<IReadOnlyList<Order>> GetWorkflowHeadersAsync(
        Expression<Func<Order, bool>> predicate,
        Expression<Func<Order, bool>>? narrow,
        int? kullaniciID);

    /// <summary>Tek siparişin iş akışı başlık alanları; bulunamazsa null.</summary>
    Task<Order?> GetWorkflowHeaderAsync(string siparisNo);

    /// <summary>Round-8 §10 — müşterinin (id veya ad eşleşmesiyle) herhangi bir
    /// siparişi/teklifi var mı? Müşteri silmeden önce güvenlik kontrolü.</summary>
    Task<bool> AnyByCustomerAsync(int musteriId, string musteriAd);
}
