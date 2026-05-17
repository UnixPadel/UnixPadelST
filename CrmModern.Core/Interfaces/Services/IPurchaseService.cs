using CrmModern.Core.DTOs.Purchase;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Faz 6: 3-aşamalı satın alma onay zinciri + dinamik ödeme paneli.
/// </summary>
public interface IPurchaseService
{
    // ── Liste & detay ─────────────────────────────────────────────────────
    Task<IReadOnlyList<PurchaseRequestListDto>> GetByDepartmanAsync(string departman, bool isGozlemci);
    Task<IReadOnlyList<PurchaseRequestListDto>> GetMyRequestsAsync(string kullaniciAdi);
    Task<PurchaseRequestPageDto>                GetAllAsync(PurchaseRequestFilterDto filter);
    Task<PurchaseRequestDetailDto>              GetByIdAsync(int talepId);

    // Geriye uyum
    Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingAsync();
    Task<IReadOnlyList<PurchaseRequestListDto>> GetHistoryAsync(int page, int pageSize);

    // ── Aşama bazlı listeler ──────────────────────────────────────────────
    Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingPreApprovalAsync();
    Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingPaymentAsync();
    Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingFinalApprovalAsync();

    // ── Talep oluştur ─────────────────────────────────────────────────────
    Task CreateAsync(CreatePurchaseRequestDto dto);

    // ── Aşama 1: ön onay (omur.caliskan) ──────────────────────────────────
    Task PreApproveAsync(int talepId, string currentUserName, string? aciklama);
    Task PreRejectAsync (int talepId, string currentUserName, string redNotu);

    // ── Aşama 2: muhasebe ödeme detayı ────────────────────────────────────
    Task SetPaymentDetailsAsync(int talepId, SetPaymentDetailsDto dto, string currentUserName);

    // ── Aşama 3: nihai onay (elshan.rasulov) ──────────────────────────────
    /// <summary>RULE 4: TalepTipi='SatinAlma' AND OdemeTuru IS NULL → BusinessException.</summary>
    Task FinalApproveAsync(int talepId, string currentUserName, string? aciklama);
    Task FinalRejectAsync (int talepId, string currentUserName, string redNotu);

    // Geriye uyum
    Task ApproveAsync(int talepId, string islemYapanKullanici);
    Task RejectAsync (int talepId, string redNotu, string islemYapanKullanici);

    // ── Faz 8.4 — onay tarihçesi ─────────────────────────────────────────
    Task<IReadOnlyList<PurchaseApprovalDto>> GetApprovalHistoryAsync(int talepId);
}
