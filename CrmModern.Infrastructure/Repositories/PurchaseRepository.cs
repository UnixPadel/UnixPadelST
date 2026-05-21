using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class PurchaseRepository(AppDbContext context)
    : BaseRepository<PurchaseRequest>(context), IPurchaseRepository
{
    public async Task<IReadOnlyList<PurchaseRequest>> GetByDepartmanAsync(string departman) =>
        await _context.SatinAlmaTalep
            .AsNoTracking()
            .Where(p => p.Departman == departman)
            .OrderByDescending(p => p.TalepID)
            .ToListAsync();

    public async Task<IReadOnlyList<PurchaseRequest>> GetPendingAsync() =>
        await _context.SatinAlmaTalep
            .AsNoTracking()
            .Where(p => p.Durum == "Onay Bekliyor")
            .OrderByDescending(p => p.TalepID)
            .ToListAsync();

    public async Task<IReadOnlyList<PurchaseRequest>> GetHistoryAsync(int page, int pageSize) =>
        await _context.SatinAlmaTalep
            .AsNoTracking()
            .Where(p => p.Durum == "Onaylandı" || p.Durum == "Reddedildi")
            .OrderByDescending(p => p.TalepID)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

    public async Task<int> ApproveAsync(int talepId, string islemYapanKullanici, DateTime islemTarihi) =>
        await _context.SatinAlmaTalep
            .Where(p => p.TalepID == talepId && p.Durum == "Onay Bekliyor")
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Durum,                "Onaylandı")
                .SetProperty(p => p.IslemYapanKullanici,  islemYapanKullanici)
                .SetProperty(p => p.IslemTarihi,          (DateTime?)islemTarihi));

    public async Task<int> RejectAsync(int talepId, string redNotu, string islemYapanKullanici, DateTime islemTarihi) =>
        await _context.SatinAlmaTalep
            .Where(p => p.TalepID == talepId && p.Durum == "Onay Bekliyor")
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Durum,                "Reddedildi")
                .SetProperty(p => p.RedNotu,              redNotu)
                .SetProperty(p => p.IslemYapanKullanici,  islemYapanKullanici)
                .SetProperty(p => p.IslemTarihi,          (DateTime?)islemTarihi));

    public async Task<PurchaseRequest?> GetMuhasebeBySiparisNoAsync(string siparisNo) =>
        await _context.SatinAlmaTalep
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.SiparisNo == siparisNo && p.TalepTipi == "Muhasebe");

    public async Task<IReadOnlyList<PurchaseRequest>> GetByStatusesAsync(string[] statuses, string? talepTipi)
    {
        var q = _context.SatinAlmaTalep.AsNoTracking().AsQueryable();
        if (statuses is { Length: > 0 })
            q = q.Where(p => statuses.Contains(p.Durum));
        if (!string.IsNullOrWhiteSpace(talepTipi))
            q = q.Where(p => (p.TalepTipi ?? "SatinAlma") == talepTipi);
        return await q.OrderByDescending(p => p.TalepID).ToListAsync();
    }

    public async Task<IReadOnlyList<PurchaseRequest>> GetByTalepEdenAsync(string kullaniciAdi) =>
        await _context.SatinAlmaTalep
            .AsNoTracking()
            .Where(p => p.TalepEdenKullaniciAdi == kullaniciAdi)
            .OrderByDescending(p => p.TalepID)
            .ToListAsync();

    public Task<int> CountPendingAsync() =>
        _context.SatinAlmaTalep.AsNoTracking().CountAsync(p => p.Durum == "Onay Bekliyor");

    public async Task<IReadOnlyList<PurchaseRequest>> QuickFindAsync(string query, int limit)
    {
        var q = $"%{query}%";
        return await _context.SatinAlmaTalep
            .AsNoTracking()
            .Where(p => EF.Functions.Like(p.UrunAdi, q)
                     || (p.TalepEdenKullaniciAdi != null && EF.Functions.Like(p.TalepEdenKullaniciAdi, q))
                     || (p.Departman != null && EF.Functions.Like(p.Departman, q)))
            .OrderByDescending(p => p.TalepID)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PurchaseRequest>> SearchAsync(
        string? talepEden, string? departman, string? durum, string? talepTipi,
        DateTime? baslangic, DateTime? bitis)
    {
        var q = _context.SatinAlmaTalep.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(talepEden))
            q = q.Where(p => p.TalepEdenKullaniciAdi != null && p.TalepEdenKullaniciAdi.Contains(talepEden));
        if (!string.IsNullOrWhiteSpace(departman))
            q = q.Where(p => p.Departman == departman);
        if (!string.IsNullOrWhiteSpace(durum))
            q = q.Where(p => p.Durum == durum);
        if (!string.IsNullOrWhiteSpace(talepTipi))
            q = q.Where(p => (p.TalepTipi ?? "SatinAlma") == talepTipi);
        if (baslangic.HasValue)
            q = q.Where(p => p.TalepTarihi >= baslangic.Value);
        if (bitis.HasValue)
            q = q.Where(p => p.TalepTarihi <= bitis.Value);

        return await q.OrderByDescending(p => p.TalepID).ToListAsync();
    }
}
