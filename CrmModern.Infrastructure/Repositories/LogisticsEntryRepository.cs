using CrmModern.Core.DTOs.Logistics;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class LogisticsEntryRepository(AppDbContext context)
    : BaseRepository<LogisticsEntry>(context), ILogisticsEntryRepository
{
    public async Task<IReadOnlyList<LogisticsEntry>> SearchAsync(string? siparisNo, string? firmaAdi)
    {
        var q = _context.LojistikTablo.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(siparisNo))
            q = q.Where(l => l.SiparisNo.Contains(siparisNo));

        if (!string.IsNullOrWhiteSpace(firmaAdi))
            q = q.Where(l => l.FirmaAdi.Contains(firmaAdi));

        return await q.OrderByDescending(l => l.ID).ToListAsync();
    }

    public async Task<IReadOnlyList<string>> GetDistinctCarriersAsync() =>
        await _context.LojistikTablo
            .AsNoTracking()
            .Where(l => l.FirmaAdi != null && l.FirmaAdi != "")
            .Select(l => l.FirmaAdi)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();

    public async Task<IReadOnlyList<string>> GetDistinctCesitlerAsync() =>
        await _context.LojistikTablo
            .AsNoTracking()
            .Where(l => l.LojistikCesit != null && l.LojistikCesit != "")
            .Select(l => l.LojistikCesit)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();

    public async Task<IReadOnlyList<LogisticsHistoryDto>> SearchHistoryAsync(string? siparisNo, string? firmaAdi)
    {
        // PROMPT.md OBSERVER #18: KullaniciBilgileri ile sol-join — Ad/Soyad
        // history satırlarıyla aynı sorguda gelsin (N+1 önlenir).
        var q =
            from l in _context.LojistikTablo.AsNoTracking()
            join o in _context.SiparisAlTablo.AsNoTracking()
                on l.SiparisNo equals o.SiparisNo into og
            from o in og.DefaultIfEmpty()
            join k in _context.KullaniciBilgileri.AsNoTracking()
                on l.KullaniciAdi equals k.KullaniciID into kg
            from k in kg.DefaultIfEmpty()
            select new
            {
                l,
                Stage = o != null ? o.SiparisMiTeklifMi : null,
                Ad    = k != null ? k.Ad    : null,
                Soyad = k != null ? k.Soyad : null,
            };

        if (!string.IsNullOrWhiteSpace(siparisNo))
            q = q.Where(x => x.l.SiparisNo.Contains(siparisNo));

        if (!string.IsNullOrWhiteSpace(firmaAdi))
            q = q.Where(x => x.l.FirmaAdi.Contains(firmaAdi));

        return await q
            .OrderByDescending(x => x.l.ID)
            .Select(x => new LogisticsHistoryDto(
                x.l.ID, x.l.SiparisNo, x.l.FirmaAdi, x.l.LojistikCesit,
                x.l.Fiyat, x.l.LNot, x.l.KullaniciAdi, x.Stage,
                ((x.Ad ?? "") + " " + (x.Soyad ?? "")).Trim()))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<LogisticsPendingApprovalDto>> GetPendingApprovalAsync() =>
        await (
            from l in _context.LojistikTablo.AsNoTracking()
            join o in _context.SiparisAlTablo.AsNoTracking()
                on l.SiparisNo equals o.SiparisNo
            where o.SiparisMiTeklifMi == "Hazir"
            orderby l.ID descending
            select new LogisticsPendingApprovalDto(
                l.ID,
                l.SiparisNo,
                o.MusteriAd,
                o.MUlke,
                l.FirmaAdi,
                l.LojistikCesit,
                l.Fiyat,
                l.LNot,
                o.LojistikNot,
                o.STarih,
                l.KullaniciAdi))
        .ToListAsync();
}
