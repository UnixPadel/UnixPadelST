using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class StockRepository(AppDbContext context)
    : BaseRepository<StockEntry>(context), IStockRepository
{
    public async Task<StockEntry?> GetByUrunAsync(string urun) =>
        await _context.StokTablo
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Urun == urun);
}
