using CrmModern.Core.DTOs.Purchase;
using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>SatinAlmaTalepEk erişimi. Talep başına tek ek (yeni yükleme öncekini siler).</summary>
public interface IPurchaseAttachmentRepository : IBaseRepository<PurchaseAttachment>
{
    /// <summary>Talebin ek dosyası — TAM (blob dahil), indirme için. Yumuşak silinen ek yok sayılır.</summary>
    Task<PurchaseAttachment?> GetByTalepAsync(int talepId);

    /// <summary>Talebin ek meta verisi — blob YÜKLEMEZ (projeksiyon). Yumuşak silinen ek yok sayılır.</summary>
    Task<PurchaseAttachmentInfoDto?> GetInfoByTalepAsync(int talepId);

    /// <summary>Talebin tüm ek satırlarını (silinmişler dahil) kalıcı siler — yalnız yeni yükleme öncesi.</summary>
    Task DeleteByTalepAsync(int talepId);

    /// <summary>40+ ergonomi K5 — talebin silinmemiş ekini bayraklar (blob korunur); etkilenen satır sayısı.</summary>
    Task<int> SoftDeleteByTalepAsync(int talepId, int? silenKullaniciId);

    /// <summary>Talebin en son ek satırının Silindi durumu (blob yüklemez); ek hiç yoksa null.</summary>
    Task<bool?> GetLatestDeletedStateAsync(int talepId);

    /// <summary>Talebin yumuşak silinmiş ekini geri yükler (bayrağı kaldırır); etkilenen satır sayısı.</summary>
    Task<int> RestoreByTalepAsync(int talepId);
}
