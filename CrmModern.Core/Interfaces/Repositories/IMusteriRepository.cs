using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IMusteriRepository : IBaseRepository<Musteri>
{
    /// <summary>Returns all customers with their Ulke navigation property loaded.</summary>
    Task<IEnumerable<Musteri>> GetAllWithUlkeAsync();

    Task<bool> MusteriAdExistsAsync(string musteriAd);

    /// <summary>Faz 7 — Topbar global arama. MusteriAd/Telefon/E_Mail/VATNumarasi üzerinde LIKE.</summary>
    Task<IReadOnlyList<Musteri>> QuickFindAsync(string query, int limit);
}
