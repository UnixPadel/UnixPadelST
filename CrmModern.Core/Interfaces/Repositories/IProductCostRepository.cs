using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>UrunMaliyetTablo — Faz 3'te SADECE OKU (material-cost endpoint).</summary>
public interface IProductCostRepository : IBaseRepository<ProductCost>
{
    Task<IReadOnlyList<ProductCost>> GetBySiparisNoAsync(string siparisNo);
}
