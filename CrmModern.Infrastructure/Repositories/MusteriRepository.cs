using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class MusteriRepository(AppDbContext context)
    : BaseRepository<Musteri>(context), IMusteriRepository
{
    // 40+ ergonomi K5 — silinen müşteriler yalnız "Silinenleri göster" ile gelir.
    public async Task<IEnumerable<Musteri>> GetAllWithUlkeAsync(bool includeDeleted = false) =>
        await _dbSet
            .Include(m => m.Ulke)
            .Where(m => includeDeleted || !m.Silindi)
            .OrderBy(m => m.MusteriAd)
            .ToListAsync();

    // Silinmiş müşteriler de sayılır: ad, geri yüklemede çakışmasın diye serbest kalmaz.
    public async Task<bool> MusteriAdExistsAsync(string musteriAd) =>
        await _dbSet.AnyAsync(m => m.MusteriAd == musteriAd);

    public async Task<Musteri?> GetByMusteriAdAsync(string musteriAd) =>
        await _dbSet.AsNoTracking().FirstOrDefaultAsync(m => m.MusteriAd == musteriAd);

    public async Task<IReadOnlyList<Musteri>> QuickFindAsync(string query, int limit)
    {
        var q = $"%{query}%";
        return await _context.MusteriBilgileri
            .AsNoTracking()
            // 40+ ergonomi K5 — silinen müşteriler global aramada görünmez.
            .Where(m => !m.Silindi
                     && (EF.Functions.Like(m.MusteriAd, q)
                     || EF.Functions.Like(m.Telefon, q)
                     || EF.Functions.Like(m.E_Mail, q)
                     || EF.Functions.Like(m.VATNumarasi, q)))
            .OrderBy(m => m.MusteriAd)
            .Take(limit)
            .ToListAsync();
    }
}
