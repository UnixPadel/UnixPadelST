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
            .FirstOrDefaultAsync(c => c.SiparisNo == siparisNo);
}
