using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class ComponentRepository(AppDbContext context)
    : BaseRepository<Component>(context), IComponentRepository
{
    public async Task<IReadOnlyList<Component>> GetAllWithAttributesAsync() =>
        await _context.BilesenBilgileri
            .AsNoTracking()
            .Include(c => c.Attributes)
            .OrderBy(c => c.BilesenAdi)
            .ToListAsync();

    public async Task<IReadOnlyList<Component>> GetAllPricedAsync() =>
        await _context.BilesenBilgileri
            .AsNoTracking()
            .Where(c => c.Fiyat != null)
            .OrderBy(c => c.BilesenAdi)
            .ToListAsync();

    public async Task<IReadOnlyList<Component>> QuickFindAsync(string query, int limit)
    {
        var q = $"%{query}%";
        return await _context.BilesenBilgileri
            .AsNoTracking()
            .Where(c => EF.Functions.Like(c.BilesenAdi, q))
            .OrderBy(c => c.BilesenAdi)
            .Take(limit)
            .ToListAsync();
    }
}
