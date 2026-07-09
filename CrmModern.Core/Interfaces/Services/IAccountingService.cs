using CrmModern.Core.DTOs.Accounting;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic for the Muhasebe + MuhasebeGecmis WinForms screens.
/// </summary>
public interface IAccountingService
{
    Task<IReadOnlyList<AccountingOrderListDto>>  GetAccountingOrdersAsync();
    Task<AccountingOrderListDto>                 GetOrderAccountingDetailAsync(string siparisNo);
    Task<IReadOnlyList<AccountingTransactionDto>> GetTransactionsForOrderAsync(string siparisNo);

    /// <summary>
    /// Yeni tahsilat. MuhasebeIslemTablo INSERT + Order.OdenenMiktar = SUM + Order.OdemeDurum güncelle.
    /// WinForms birebir: OdemeDurum ∈ {'Beklemede', 'Ödendi'}.
    /// </summary>
    Task<AccountingTransactionDto> AddTransactionAsync(AddTransactionDto dto, int currentUserId);

    Task<IReadOnlyList<AccountingTransactionDto>> GetTransactionHistoryAsync();
    Task<TransactionPageDto>     GetTransactionHistoryPagedAsync(TransactionFilterDto filter);

    Task<CustomerBalanceDto>     GetCustomerBalanceAsync(int musteriId);

    /// <summary>ClosedXML fallback xlsx (ExcelIndir BLOB template Faz 8'e).</summary>
    Task<byte[]> GenerateAccountingExcelAsync(TransactionFilterDto filter);

    /// <summary>SiparisAlTablo.MuhasebeEk = byte[]. Faz 3'teki blok bu metodla kaldırıldı.</summary>
    Task UploadMuhasebeEkAsync(string siparisNo, byte[] data, int currentUserId);

    // ── PROMPT.md ACCOUNTING #14 ─────────────────────────────────────────────

    /// <summary>
    /// Muhasebe ekranı "Talep Gönder": SatinAlmaTalep (TalepTipi='Muhasebe')
    /// için upsert. Aynı SiparisNo'lu Muhasebe-talep varsa güncelle ve Durum'u
    /// 'Onay Bekliyor' yap (re-arm); yoksa yeni satır ekle.
    ///
    /// Server-side türetilen alanlar:
    ///   UrunAdi               = "{MusteriAd} Muhasebe"
    ///   Departman             = "Muhasebe"
    ///   TalepEdenKullaniciAdi = mevcut JWT kullanıcı adı
    ///   Kar                   = ToplamSiparis - Maliyet  (ToplamSiparis varsa)
    /// </summary>
    Task SubmitMaliyetTalepAsync(string siparisNo, SubmitMaliyetTalepDto dto, string currentUserName);

    /// <summary>
    /// PROMPT-v6 §1 — Burcu ekranı "Cari Onayla" butonu: SiparisAlTablo durumunu
    /// 'Siparis' → 'Planlama' yap. Yalnız Kontrol='Onay' olanlar geçer; aksi
    /// halde BusinessException. SiparisOnaylari'na 'MuhasebeOnaylandi' audit yazar.
    /// <para>
    /// pesinat (> 0 ise) aşama geçişiyle aynı çağrıda 1. Peşinat tahsilatı olarak
    /// MuhasebeIslemTablo'ya işlenir. Maliyet'e ASLA yazılmaz. İdempotent no-op
    /// dallarında (zaten Planlama) peşinat da tekrar yazılmaz.
    /// </para>
    /// </summary>
    Task ApproveMuhasebeAndMoveToPlanningAsync(string siparisNo, int currentUserId,
        decimal? pesinat = null, DateTime? pesinatTarihi = null);

    /// <summary>
    /// PROMPT-v6 §1 — Burcu ekranı "Lojistik Onayla" butonu: Hazir +
    /// LojistikOnay='Bekliyor' → 'Onay'. SiparisOnaylari'na 'LojistikOnaylandi'
    /// audit yazar. Zaten 'Onay'/NULL ise idempotent no-op.
    /// <para>
    /// pesinat (> 0 ise) aşama geçişiyle aynı çağrıda 2. Peşinat tahsilatı olarak
    /// MuhasebeIslemTablo'ya işlenir. Maliyet'e ASLA yazılmaz. İdempotent no-op
    /// dallarında (zaten Onay/NULL) peşinat da tekrar yazılmaz.
    /// </para>
    /// </summary>
    Task ApproveLogisticsAsync(string siparisNo, int currentUserId,
        decimal? pesinat = null, DateTime? pesinatTarihi = null);

    /// <summary>
    /// Round-9 §19 — "Tamamlanmayı Bekleyen" finalize: Pesinat (>0 ise) tahsilat
    /// olarak işlenir, FinalMaliyet SatinAlmaTalep.Maliyet'e yazılır (Maliyet
    /// Reçetesi okur), sipariş 'TamamlanmaBekliyor' → 'Tamamlandi' yapılır +
    /// TamamlandiTablo / SiparisOnaylari audit.
    /// </summary>
    Task FinalizeCompletionAsync(string siparisNo, FinalizeCompletionDto dto,
        int currentUserId, string currentUserName);

    // ── Ekstra maliyet kalemleri ───────────────────────────────────────────────

    /// <summary>Siparişin ekstra maliyet kalemleri (açıklama + tutar), eklenme sırasına göre.</summary>
    Task<IReadOnlyList<OrderExtraCostDto>> GetExtraCostsAsync(string siparisNo);

    /// <summary>
    /// Yeni ekstra maliyet kalemi ekler. Tutarı ToplamFiyat/BrutToplamFiyat'a eklenir
    /// ve proformada ayrı satır olarak görünür. Yalnız cari/lojistik onay penceresinde
    /// (SiparisMiTeklifMi ∈ Siparis/Planlama/Hazir) izinlidir.
    /// </summary>
    Task<OrderExtraCostDto> AddExtraCostAsync(string siparisNo, CreateExtraCostDto dto, int currentUserId);

    /// <summary>Ekstra maliyet kalemini siler; tutarını sipariş toplamından düşer.</summary>
    Task DeleteExtraCostAsync(int ekMaliyetId, int currentUserId);
}
