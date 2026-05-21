using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class PurchaseApprovalRepository(AppDbContext context)
    : BaseRepository<PurchaseApproval>(context), IPurchaseApprovalRepository
{
    public async Task AddLogAsync(PurchaseApproval entry)
    {
        await _context.Set<PurchaseApproval>().AddAsync(entry);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<PurchaseApproval>> GetHistoryAsync(int talepId) =>
        await _context.Set<PurchaseApproval>()
            .AsNoTracking()
            .Where(p => p.TalepID == talepId)
            .OrderBy(p => p.OnayID)
            .ToListAsync();
}
