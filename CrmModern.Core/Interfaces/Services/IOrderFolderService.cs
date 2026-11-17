using CrmModern.Core.DTOs.Order;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Muhasebe Klasörü — siparişin muhasebe ekleri (SiparisMuhasebeEk, çok dosya)
/// + eski tek-blob ekler (SiparisAlTablo.MuhasebeEk / Ek). Yetki kontrolleri
/// controller'dadır; servis yalnız veriyi yönetir.
/// </summary>
public interface IOrderFolderService
{
    /// <summary>Sipariş/teklif numarasından klasörün siparişini bulur (yoksa NotFoundException).</summary>
    Task<OrderFolderRef> ResolveAsync(string siparisNo);

    Task<(IReadOnlyList<OrderFolderFileDto> Dosyalar,
          OrderFolderLegacyFileDto? OncekiMuhasebeEk,
          OrderFolderLegacyFileDto? SaticiEk)> GetContentAsync(OrderFolderRef order, bool includeDeleted = false);

    Task<OrderFolderFileDto> UploadAsync(OrderFolderRef order, string ad, string tip, byte[] veri, int kullaniciId);

    Task<OrderFolderFileDataDto?> GetFileAsync(OrderFolderRef order, int ekId);

    /// <summary>kind: "muhasebe" (eski Muhasebe Ek) | "satici" (Satıcı Ek).</summary>
    Task<OrderFolderFileDataDto?> GetLegacyFileAsync(OrderFolderRef order, string kind);

    /// <summary>40+ ergonomi K5 — yumuşak silme (Silindi bayrağı; blob korunur).</summary>
    Task DeleteAsync(OrderFolderRef order, int ekId, int kullaniciId);

    /// <summary>Yumuşak silinen dosyayı geri yükler (silinmemişse fileNotDeleted).</summary>
    Task<OrderFolderFileDto> RestoreAsync(OrderFolderRef order, int ekId, int kullaniciId);

    /// <summary>Eski tek blob'u silinmiş bir klasör dosyasına kopyalayıp kolonu boşaltır;
    /// geri yüklenebilmesi için yeni satırın EkID'sini döner.</summary>
    Task<int> DeleteLegacyMuhasebeEkAsync(OrderFolderRef order, int kullaniciId);

    /// <summary>SiparisNo → muhasebe eki sayısı (yalnız en az bir eki olan siparişler).</summary>
    Task<IReadOnlyDictionary<string, int>> GetCountsAsync();
}
