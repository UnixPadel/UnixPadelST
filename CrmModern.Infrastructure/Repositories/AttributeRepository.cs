using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using EntityAttribute = CrmModern.Core.Entities.Attribute;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class AttributeRepository(AppDbContext context)
    : BaseRepository<EntityAttribute>(context), IAttributeRepository
{
    public async Task<IReadOnlyList<EntityAttribute>> GetByComponentAsync(int bilesenId) =>
        await _context.OznitelikTablo
            .AsNoTracking()
            .Where(a => a.BilesenID == bilesenId)
            .OrderBy(a => a.OznitelikAdı)
            .ToListAsync();
}
