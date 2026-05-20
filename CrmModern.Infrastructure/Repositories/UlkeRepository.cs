using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class UlkeRepository(AppDbContext context)
    : BaseRepository<Ulke>(context), IUlkeRepository
{
    public async Task<bool> UlkeAdExistsAsync(string ulkeAdi) =>
        await _dbSet.AnyAsync(u => u.UlkeAdi == ulkeAdi);
}
