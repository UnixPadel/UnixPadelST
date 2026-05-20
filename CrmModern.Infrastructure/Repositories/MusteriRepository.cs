using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class MusteriRepository(AppDbContext context)
    : BaseRepository<Musteri>(context), IMusteriRepository
{
    public async Task<IEnumerable<Musteri>> GetAllWithUlkeAsync() =>
        await _dbSet
            .Include(m => m.Ulke)
            .OrderBy(m => m.MusteriAd)
            .ToListAsync();

    public async Task<bool> MusteriAdExistsAsync(string musteriAd) =>
        await _dbSet.AnyAsync(m => m.MusteriAd == musteriAd);

    public async Task<IReadOnlyList<Musteri>> QuickFindAsync(string query, int limit)
    {
        var q = $"%{query}%";
        return await _context.MusteriBilgileri
            .AsNoTracking()
            .Where(m => EF.Functions.Like(m.MusteriAd, q)
                     || EF.Functions.Like(m.Telefon, q)
                     || EF.Functions.Like(m.E_Mail, q)
                     || EF.Functions.Like(m.VATNumarasi, q))
            .OrderBy(m => m.MusteriAd)
            .Take(limit)
            .ToListAsync();
    }
}
