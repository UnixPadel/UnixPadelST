using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class DeliveryAddressRepository(AppDbContext context)
    : BaseRepository<DeliveryAddress>(context), IDeliveryAddressRepository
{
    public async Task<bool> TeslimAlanAdiExistsAsync(string teslimAlanAdi) =>
        await _context.TeslimatBilgisiTablo
            .AnyAsync(a => a.TeslimAlanAdi == teslimAlanAdi);
}
