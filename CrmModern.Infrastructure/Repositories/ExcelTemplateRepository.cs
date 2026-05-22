using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class ExcelTemplateRepository(AppDbContext context)
    : BaseRepository<ExcelTemplate>(context), IExcelTemplateRepository
{
    private DbSet<ExcelTemplate> Set => _context.Set<ExcelTemplate>();

    public async Task<byte[]?> GetLatestBytesAsync()
    {
        var row = await Set
            .AsNoTracking()
            .OrderByDescending(t => t.ID)
            .Select(t => new { t.Excel })
            .FirstOrDefaultAsync();
        return row?.Excel;
    }
}
