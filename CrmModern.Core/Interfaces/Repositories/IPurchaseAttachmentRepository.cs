using CrmModern.Core.DTOs.Purchase;
using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>SatinAlmaTalepEk erişimi. Talep başına tek ek (yeni yükleme öncekini siler).</summary>
public interface IPurchaseAttachmentRepository : IBaseRepository<PurchaseAttachment>
{
    /// <summary>Talebin ek dosyası — TAM (blob dahil), indirme için.</summary>
    Task<PurchaseAttachment?> GetByTalepAsync(int talepId);

    /// <summary>Talebin ek meta verisi — blob YÜKLEMEZ (projeksiyon).</summary>
    Task<PurchaseAttachmentInfoDto?> GetInfoByTalepAsync(int talepId);

    /// <summary>Talebin tüm ek satırlarını siler (upsert / silme için).</summary>
    Task DeleteByTalepAsync(int talepId);
}
