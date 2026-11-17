using CrmModern.Core.DTOs.WarehouseStock;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Antrepo &amp; Depo Stokları — tek liste (beyannameli ya da beyannamesiz mallar),
/// kısmi/tam çıkış işareti ve geri alma.
/// </summary>
public interface IWarehouseStockService
{
    /// <summary>Belgeyi Gemini ile okur, KAYDETMEZ. Okuma başarısızsa hata atmaz (Basarili=false).</summary>
    Task<AnalyzeResultDto> AnalyzeAsync(byte[] data, string mimeType, CancellationToken ct = default);

    /// <summary>includeDeleted=true: yumuşak silinen kalemler de (silindi=true, listenin sonunda) döner;
    /// sayaçlar her zaman yalnız silinmemiş kalemleri sayar.</summary>
    Task<StockListDto> GetItemsAsync(string? konum, bool tamamlananlar, string? q, bool includeDeleted = false);

    Task<StockItemDetailDto> GetItemDetailAsync(int id, int currentUserId, bool isManager);

    /// <summary>Beyanname + kalemleri (ya da beyannamesiz kalemleri) kaydeder; belge isteğe bağlı.</summary>
    Task<CreateStockResultDto> CreateAsync(
        CreateStockRequest req, byte[]? belge, string? belgeAdi, string? belgeTip, int currentUserId);

    Task UpdateItemAsync(int id, UpdateStockItemRequest req, int currentUserId);

    /// <summary>Yalnız aktif çıkışı olmayan kalem silinir. 40+ ergonomi K5 — yumuşak silme
    /// (Silindi bayrağı; global query filter ile tüm sorgulardan düşer).</summary>
    Task DeleteItemAsync(int id, int currentUserId);

    /// <summary>Yumuşak silinen kalemi geri yükler (silinmemişse stockItemNotDeleted).</summary>
    Task RestoreItemAsync(int id, int currentUserId);

    /// <summary>"Araca yüklendi" işaretler; stok eksiye düşmez (transaction + satır kilidi).</summary>
    Task<int> AddExitAsync(int itemId, AddStockExitRequest req, int currentUserId);

    /// <summary>Çıkışı geri alır: giren kişi veya Yönetici, WarehouseStockRules.CikisGeriAlmaSuresiGun içinde.</summary>
    Task UndoExitAsync(int exitId, int currentUserId, bool isManager);

    Task<StockDocumentDto?> GetDocumentAsync(int beyannameId);
}
