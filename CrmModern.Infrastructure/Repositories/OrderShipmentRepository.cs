using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class OrderShipmentRepository(AppDbContext context)
    : BaseRepository<OrderShipment>(context), IOrderShipmentRepository
{
    public async Task<IReadOnlyList<OrderShipment>> GetBySiparisNoAsync(string siparisNo) =>
        await _context.SiparisTeslimatTablo
            .AsNoTracking()
            .Where(s => s.SiparisNo == siparisNo)
            .ToListAsync();

    public async Task DeleteBySiparisNoAsync(string siparisNo)
    {
        // BIREBIR WinForms pattern: önce kalan adresleri temizle, sonra yenilerini ekle
        var rows = await _context.SiparisTeslimatTablo
            .Where(s => s.SiparisNo == siparisNo)
            .ToListAsync();
        _context.SiparisTeslimatTablo.RemoveRange(rows);
    }
}
