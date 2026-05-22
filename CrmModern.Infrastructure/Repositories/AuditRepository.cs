using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class AuditRepository(AppDbContext context)
    : BaseRepository<AuditEntry>(context), IAuditRepository
{
    public async Task AddLogAsync(AuditEntry entry)
    {
        await _context.Set<AuditEntry>().AddAsync(entry);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<AuditEntry>> SearchAsync(
        string? action, string? entityType, int? kullaniciID,
        DateTime? baslangic, DateTime? bitis, int limit)
    {
        var q = _context.Set<AuditEntry>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(action))     q = q.Where(a => a.Action == action);
        if (!string.IsNullOrWhiteSpace(entityType)) q = q.Where(a => a.EntityType == entityType);
        if (kullaniciID.HasValue)                   q = q.Where(a => a.KullaniciID == kullaniciID);
        if (baslangic.HasValue)                     q = q.Where(a => a.EklemeTarihi >= baslangic.Value);
        if (bitis.HasValue)                         q = q.Where(a => a.EklemeTarihi <= bitis.Value);

        return await q.OrderByDescending(a => a.EklemeID).Take(limit).ToListAsync();
    }
}
