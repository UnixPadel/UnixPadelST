using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>StokTablo — Faz 3'te SADECE OKU.</summary>
public interface IStockRepository : IBaseRepository<StockEntry>
{
    Task<StockEntry?> GetByUrunAsync(string urun);
}
