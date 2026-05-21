using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class OrderApprovalRepository(AppDbContext context)
    : BaseRepository<OrderApproval>(context), IOrderApprovalRepository
{
    public async Task<IReadOnlyList<OrderApproval>> GetBySiparisNoAsync(string siparisNo) =>
        await _context.SiparisOnaylari
            .AsNoTracking()
            .Where(o => o.SiparisNo == siparisNo)
            .OrderBy(o => o.OnayTarih)
            .ToListAsync();

    public async Task UpsertAsync(string siparisNo, int kullaniciID, string durum, string? aciklama)
    {
        // Tracked çek — UPDATE için Tracking gerekli.
        var existing = await _context.SiparisOnaylari
            .FirstOrDefaultAsync(o => o.SiparisNo == siparisNo && o.KullaniciID == kullaniciID);

        if (existing is not null)
        {
            existing.OnayDurumu = durum;
            existing.Aciklama   = aciklama;
            existing.OnayTarih  = DateTime.Now;   // WinForms birebir: lokal saat
        }
        else
        {
            await _context.SiparisOnaylari.AddAsync(new OrderApproval
            {
                SiparisNo   = siparisNo,
                KullaniciID = kullaniciID,
                OnayDurumu  = durum,
                Aciklama    = aciklama,
                OnayTarih   = DateTime.Now,
            });
        }
    }
}
