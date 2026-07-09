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
    Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingPaymentAsync();
    Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingFinalApprovalAsync();

    // ── Talep oluştur ─────────────────────────────────────────────────────
    /// <summary>Talebi oluşturur ve yeni TalepID'yi döndürür (ek dosya yüklemesi için).</summary>
    Task<int> CreateAsync(CreatePurchaseRequestDto dto);

    // ── Ek dosya (SatinAlmaTalepEk) ───────────────────────────────────────
    /// <summary>Talebe dosya ekle (talep başına tek ek — öncekini değiştirir).</summary>
    Task UploadAttachmentAsync(int talepId, string ad, string tip, byte[] veri, string? yukleyen);
    /// <summary>Ek meta verisi (blob YOK) — yoksa null.</summary>
    Task<PurchaseAttachmentInfoDto?> GetAttachmentInfoAsync(int talepId);
    /// <summary>Ek indirme verisi (bayt + ad + tip) — yoksa null.</summary>
    Task<PurchaseAttachmentDataDto?> GetAttachmentAsync(int talepId);
    /// <summary>Talebin ek dosyasını kaldır.</summary>
    Task DeleteAttachmentAsync(int talepId);

    // ── Aşama 2: muhasebe ödeme detayı ────────────────────────────────────
    Task SetPaymentDetailsAsync(int talepId, SetPaymentDetailsDto dto, string currentUserName);

    // ── Aşama 3: nihai onay (elshan.rasulov) ──────────────────────────────
    /// <summary>RULE 4: TalepTipi='SatinAlma' AND OdemeTuru IS NULL → BusinessException.</summary>
    Task FinalApproveAsync(int talepId, string currentUserName, string? aciklama);
    Task FinalRejectAsync (int talepId, string currentUserName, string redNotu);

    // ── PROMPT-v7 §2: override onayı (elshan.rasulov tek-tık kısa devre) ──
    /// <summary>Tüm aşamaları atlayıp Durum='Onaylandı' yapar. Reddedilmiş talep override edilemez.</summary>
    Task OverrideApproveAsync(int talepId, string currentUserName, string? aciklama);

    // Geriye uyum
    Task ApproveAsync(int talepId, string islemYapanKullanici);
    Task RejectAsync (int talepId, string redNotu, string islemYapanKullanici);

    // ── Faz 8.4 — onay tarihçesi ─────────────────────────────────────────
    Task<IReadOnlyList<PurchaseApprovalDto>> GetApprovalHistoryAsync(int talepId);
}
