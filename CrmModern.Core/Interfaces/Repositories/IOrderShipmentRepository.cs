using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IOrderShipmentRepository : IBaseRepository<OrderShipment>
{
    Task<IReadOnlyList<OrderShipment>> GetBySiparisNoAsync(string siparisNo);
    Task DeleteBySiparisNoAsync(string siparisNo);
}
