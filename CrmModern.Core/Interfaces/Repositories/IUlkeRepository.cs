using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IUlkeRepository : IBaseRepository<Ulke>
{
    Task<bool> UlkeAdExistsAsync(string ulkeAdi);
}
