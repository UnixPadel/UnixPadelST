namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Generic read/write contract — all concrete repos implement this.
/// </summary>
public interface IBaseRepository<T> where T : class
{
    Task<T?>            GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task                AddAsync(T entity);
    void                Update(T entity);
    void                Remove(T entity);
}
