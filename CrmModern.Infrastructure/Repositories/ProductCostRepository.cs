using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class ProductCostRepository(AppDbContext context)
    : BaseRepository<ProductCost>(context), IProductCostRepository
{
    public async Task<IReadOnlyList<ProductCost>> GetBySiparisNoAsync(string siparisNo) =>
        await _context.UrunMaliyetTablo
            .AsNoTracking()
            .Where(p => p.SiparisNo == siparisNo)
            .OrderBy(p => p.GirisTarih)
            .ToListAsync();
}
