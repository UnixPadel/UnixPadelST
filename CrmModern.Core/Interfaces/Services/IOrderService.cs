using CrmModern.Core.DTOs.Order;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic contract for the Order / Quote module.
/// All DB table/column names preserved — only the C# class names are English.
/// </summary>
public interface IOrderService
{
    // ── List ──────────────────────────────────────────────────────────────
    // PROMPT-v4 §6.2: allUsers=true (yalnız elshan.rasulov) tüm siparişleri döner.
    Task<IReadOnlyList<OrderListDto>> GetMyOrdersAsync(int kullaniciID, string? asama = null, bool allUsers = false);
    Task<OrderListPageDto>            GetOrdersAsync(OrderFilterDto filter);

    // ── Single record ─────────────────────────────────────────────────────
    Task<OrderDetailDto>            GetByNoAsync(string no);
    Task<IReadOnlyList<OrderApprovalDto>> GetApprovalHistoryAsync(string siparisNo);

    // ── Create ────────────────────────────────────────────────────────────
    Task<string> CreateQuoteAsync(int kullaniciID, CreateOrderDto dto);
    Task<string> CreateOrderAsync(int kullaniciID, CreateOrderDto dto);

    // ── Revize / Clone ────────────────────────────────────────────────────
    Task<string> ReviseAsync(int kullaniciID, string eskiNo, CreateOrderDto dto);
    Task<string> CloneFromExistingAsync(int kullaniciID, string sourceNo);

    // ── Status transitions ────────────────────────────────────────────────
    Task ConvertToOrderAsync(string teklifNo);
    Task SubmitForApprovalAsync(string siparisNo, int kullaniciID);
    Task ApproveOrderAsync(string siparisNo, int kullaniciID, string? aciklama);
    Task RejectOrderAsync(string siparisNo, int kullaniciID, string aciklama);

    // ── PROMPT-v4 §5.4 / §5.5 — Kontrol ekranı mutasyonları ───────────────
    Task UpdatePaidAmountAsync(string siparisNo, decimal odenenMiktar);
    Task UpdateStageAsync(string siparisNo, UpdateStageDto dto);

    // ── Recipe expansion (SiparisForm "Reçeteden Aç") ─────────────────────
    Task ExpandRecipeAsync(string siparisNo, int kategoriID, int adet);

    // ── Cost & totals ────────────────────────────────────────────────────
    Task<MaterialCostDto>  ComputeMaterialCostAsync(string siparisNo);
    Task<OrderTotalsDto>   GetTotalsByCurrencyAsync(OrderFilterDto filter);

    // ── Attachments (Ek + MuhasebeEk BLOB) ────────────────────────────────
    Task UploadAttachmentAsync(string siparisNo, string type, byte[] data);
    Task<byte[]?> GetAttachmentAsync(string siparisNo, string type);

    // ── Excel export (ExcelIndir BLOB template + placeholder fill) ────────
    Task<byte[]> GenerateExcelAsync(string siparisNo);

    // ── Catalog helpers ───────────────────────────────────────────────────
    Task<IReadOnlyList<ProductCategoryDto>> GetCategoriesAsync();
    Task<IReadOnlyList<ComponentDto>>       GetComponentsByCategoryAsync(int kategoriID);
    Task<IReadOnlyList<DeliveryAddressDto>> GetDeliveryAddressesAsync();
}
