using CrmModern.Core.DTOs.Purchase;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class PurchaseAttachmentRepository(AppDbContext context)
    : BaseRepository<PurchaseAttachment>(context), IPurchaseAttachmentRepository
{
    public async Task<PurchaseAttachment?> GetByTalepAsync(int talepId) =>
        await _context.SatinAlmaTalepEk
            .AsNoTracking()
            .Where(e => e.TalepID == talepId)
            .OrderByDescending(e => e.EkID)
            .FirstOrDefaultAsync();

    public async Task<PurchaseAttachmentInfoDto?> GetInfoByTalepAsync(int talepId) =>
        await _context.SatinAlmaTalepEk
            .AsNoTracking()
            .Where(e => e.TalepID == talepId)
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
}
