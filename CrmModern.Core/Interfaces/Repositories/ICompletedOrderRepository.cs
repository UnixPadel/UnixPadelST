using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface ICompletedOrderRepository : IBaseRepository<CompletedOrder>
{
    Task<CompletedOrder?> GetBySiparisNoAsync(string siparisNo);
}
