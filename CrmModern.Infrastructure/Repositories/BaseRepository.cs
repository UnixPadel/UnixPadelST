using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal abstract class BaseRepository<T>(AppDbContext context) : IBaseRepository<T>
    where T : class
{
    protected readonly AppDbContext _context  = context;
    protected readonly DbSet<T>     _dbSet    = context.Set<T>();

    public async Task<T?>            GetByIdAsync(int id)      => await _dbSet.FindAsync(id);
    public async Task<IEnumerable<T>> GetAllAsync()            => await _dbSet.ToListAsync();
    public async Task                AddAsync(T entity)        => await _dbSet.AddAsync(entity);
    public void                      Update(T entity)          => _dbSet.Update(entity);
    public void                      Remove(T entity)          => _dbSet.Remove(entity);
}
