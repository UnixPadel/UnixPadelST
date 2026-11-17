using CrmModern.Core.DTOs.Purchase;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class PurchaseAttachmentRepository(AppDbContext context)
    : BaseRepository<PurchaseAttachment>(context), IPurchaseAttachmentRepository
{
    // 40+ ergonomi K5 — yumuşak silinen ek (Silindi) indirme/meta için "yok" sayılır.
    public async Task<PurchaseAttachment?> GetByTalepAsync(int talepId) =>
        await _context.SatinAlmaTalepEk
            .AsNoTracking()
            .Where(e => e.TalepID == talepId && !e.Silindi)
            .OrderByDescending(e => e.EkID)
            .FirstOrDefaultAsync();

    public async Task<PurchaseAttachmentInfoDto?> GetInfoByTalepAsync(int talepId) =>
        await _context.SatinAlmaTalepEk
            .AsNoTracking()
            .Where(e => e.TalepID == talepId && !e.Silindi)
            .OrderByDescending(e => e.EkID)
            // Select projeksiyonu Veri (blob) kolonunu sorguya DAHİL ETMEZ.
            .Select(e => new PurchaseAttachmentInfoDto(e.TalepID, e.Ad, e.Tip, e.Tarih, e.YukleyenKullaniciAdi))
            .FirstOrDefaultAsync();

    public async Task DeleteByTalepAsync(int talepId)
    {
        var rows = await _context.SatinAlmaTalepEk
            .Where(e => e.TalepID == talepId)
            .ToListAsync();
        if (rows.Count > 0)
            _context.SatinAlmaTalepEk.RemoveRange(rows);
    }

    public async Task<int> SoftDeleteByTalepAsync(int talepId, int? silenKullaniciId)
    {
        var now = DateTime.Now;
        return await _context.SatinAlmaTalepEk
            .Where(e => e.TalepID == talepId && !e.Silindi)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Silindi, true)
                .SetProperty(e => e.SilinmeTarihi, now)
                .SetProperty(e => e.SilenKullaniciID, silenKullaniciId));
    }

    public async Task<bool?> GetLatestDeletedStateAsync(int talepId) =>
        await _context.SatinAlmaTalepEk
            .AsNoTracking()
            .Where(e => e.TalepID == talepId)
            .OrderByDescending(e => e.EkID)
            .Select(e => (bool?)e.Silindi)
            .FirstOrDefaultAsync();

    public async Task<int> RestoreByTalepAsync(int talepId) =>
        await _context.SatinAlmaTalepEk
            .Where(e => e.TalepID == talepId && e.Silindi)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Silindi, false)
                .SetProperty(e => e.SilinmeTarihi, (DateTime?)null)
                .SetProperty(e => e.SilenKullaniciID, (int?)null));
}
