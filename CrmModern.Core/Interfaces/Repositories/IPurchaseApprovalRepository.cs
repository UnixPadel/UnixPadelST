using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IPurchaseApprovalRepository : IBaseRepository<PurchaseApproval>
{
    /// <summary>Tek shot INSERT — UoW.SaveChanges'a bağlı değil.</summary>
    Task AddLogAsync(PurchaseApproval entry);

    /// <summary>Talep ID için aşama tarihçesi (eski → yeni).</summary>
    Task<IReadOnlyList<PurchaseApproval>> GetHistoryAsync(int talepId);
}
