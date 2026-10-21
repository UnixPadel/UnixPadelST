using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class AccountingRepository(AppDbContext context)
    : BaseRepository<AccountingTransaction>(context), IAccountingRepository
{
    public async Task<IReadOnlyList<AccountingTransaction>> GetAllOrderedAsync() =>
        await _context.MuhasebeIslemTablo
            .AsNoTracking()
            .OrderByDescending(a => a.Tarih)
            .ToListAsync();

    public async Task<IReadOnlyList<AccountingTransaction>> SearchAsync(
        string? siparisNo, int? kullaniciID, DateTime? baslangic, DateTime? bitis)
    {
        var q = _context.MuhasebeIslemTablo.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(siparisNo))
            q = q.Where(t => t.SiparisNo.Contains(siparisNo));
        if (kullaniciID is > 0)
            q = q.Where(t => t.KullaniciID == kullaniciID.Value);
        if (baslangic.HasValue)
            q = q.Where(t => t.Tarih >= baslangic.Value);
        if (bitis.HasValue)
            q = q.Where(t => t.Tarih <= bitis.Value);

        return await q.OrderByDescending(t => t.Tarih).ToListAsync();
    }

    public async Task<decimal> GetSumBySiparisNoAsync(string siparisNo) =>
        await _context.MuhasebeIslemTablo
            .AsNoTracking()
            .Where(t => t.SiparisNo == siparisNo)
            .SumAsync(t => t.OdenenMiktar ?? 0m);

    public async Task<IReadOnlyList<AccountingTransaction>> GetByCustomerAsync(int musteriId) =>
        await _context.MuhasebeIslemTablo
            .AsNoTracking()
            .Where(t => t.MusteriID == musteriId)
            .OrderByDescending(t => t.Tarih)
            .ToListAsync();

    public async Task<IReadOnlyList<AccountingTransaction>> GetBySiparisNoAsync(
        string siparisNo, bool includeCancelled = false)
    {
        var q = _context.MuhasebeIslemTablo.AsNoTracking();
        if (includeCancelled)
            q = q.IgnoreQueryFilters();
        return await q
            .Where(t => t.SiparisNo == siparisNo)
            .OrderByDescending(t => t.Tarih)
            .ToListAsync();
    }

    public async Task<AccountingTransaction?> GetForUpdateAsync(int id) =>
        await _context.MuhasebeIslemTablo
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.ID == id);
}
