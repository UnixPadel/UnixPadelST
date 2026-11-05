using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class CompletedOrderRepository(AppDbContext context)
    : BaseRepository<CompletedOrder>(context), ICompletedOrderRepository
{
    public async Task<CompletedOrder?> GetBySiparisNoAsync(string siparisNo) =>
        await _context.TamamlandiTablo
            .AsNoTracking()
            .Where(c => c.SiparisNo == siparisNo)
            .OrderByDescending(c => c.ID)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyDictionary<string, CompletedOrder>> GetLatestBySiparisNolarAsync(
        IReadOnlyCollection<string> siparisNolar)
    {
        if (siparisNolar.Count == 0)
            return new Dictionary<string, CompletedOrder>();

        var rows = await _context.TamamlandiTablo
            .AsNoTracking()
            .Where(c => c.SiparisNo != null && siparisNolar.Contains(c.SiparisNo))
            .OrderByDescending(c => c.ID)
            .ToListAsync();

        var dict = new Dictionary<string, CompletedOrder>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in rows)
        {
            if (r.SiparisNo != null && !dict.ContainsKey(r.SiparisNo))
                dict[r.SiparisNo] = r;
        }
        return dict;
    }
}
