using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class ProductCategoryRepository(AppDbContext context)
    : BaseRepository<ProductCategory>(context), IProductCategoryRepository
{
    public async Task<IReadOnlyList<ProductCategory>> GetAllWithComponentsAsync() =>
        await _context.UrunKategorileri
            .AsNoTracking()
            .Include(c => c.CategoryComponents)
                .ThenInclude(cc => cc.Component)
            .OrderBy(c => c.KategoriAdi)
            .ToListAsync();

    public async Task<ProductCategory?> GetWithComponentsAsync(int kategoriID) =>
        await _context.UrunKategorileri
            .AsNoTracking()
            .Include(c => c.CategoryComponents)
                .ThenInclude(cc => cc.Component)
                    // PROMPT-v3 §2.1: arayüz sözleşmesi Component.Attributes'ı da
                    // vaat eder — eksik Include Öznitelik'lerin boş gelmesine yol açıyordu.
                    .ThenInclude(c => c!.Attributes)
            .FirstOrDefaultAsync(c => c.KategoriID == kategoriID);

    public async Task<IReadOnlyList<ProductCategory>> QuickFindAsync(string query, int limit)
    {
        var q = $"%{query}%";
        return await _context.UrunKategorileri
            .AsNoTracking()
            .Where(c => EF.Functions.Like(c.KategoriAdi, q))
            .OrderBy(c => c.KategoriAdi)
            .Take(limit)
            .ToListAsync();
    }
}
