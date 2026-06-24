using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class LogisticsOfferRepository(AppDbContext context)
    : BaseRepository<LogisticsOffer>(context), ILogisticsOfferRepository
{
    public async Task<IReadOnlyList<LogisticsOffer>> GetByOrderAsync(string siparisNo) =>
        await _context.LojistikTeklifTablo
            .AsNoTracking()
            .Where(o => o.SiparisNo == siparisNo)
            .OrderByDescending(o => o.OlusturmaTarihi)
            .ToListAsync();

    public async Task<IReadOnlyList<LogisticsOffer>> GetTrackedByOrderAsync(string siparisNo) =>
        await _context.LojistikTeklifTablo
            .Where(o => o.SiparisNo == siparisNo)
            .ToListAsync();

    public async Task<LogisticsOffer?> GetApprovedAsync(string siparisNo) =>
        await _context.LojistikTeklifTablo
            .AsNoTracking()
            .Where(o => o.SiparisNo == siparisNo && o.Durum == "Onaylandi")
            .OrderByDescending(o => o.OnayTarihi)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyDictionary<string, LogisticsOffer>> GetApprovedForOrdersAsync(
        IReadOnlyCollection<string> siparisNolar)
    {
        if (siparisNolar.Count == 0)
            return new Dictionary<string, LogisticsOffer>();

        var rows = await _context.LojistikTeklifTablo
            .AsNoTracking()
            .Where(o => o.Durum == "Onaylandi" && siparisNolar.Contains(o.SiparisNo))
            .ToListAsync();

        // Aynı siparişte tek 'Onaylandi' beklenir; yine de en güncel onay kazanır.
        return rows
            .GroupBy(o => o.SiparisNo)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.OnayTarihi).First());
    }

    public async Task<IReadOnlyDictionary<string, int>> GetOfferCountsAsync(
        IReadOnlyCollection<string> siparisNolar)
    {
        if (siparisNolar.Count == 0)
            return new Dictionary<string, int>();

        var rows = await _context.LojistikTeklifTablo
            .AsNoTracking()
            .Where(o => siparisNolar.Contains(o.SiparisNo))
            .GroupBy(o => o.SiparisNo)
            .Select(g => new { SiparisNo = g.Key, Count = g.Count() })
            .ToListAsync();

        return rows.ToDictionary(r => r.SiparisNo, r => r.Count);
    }
}
