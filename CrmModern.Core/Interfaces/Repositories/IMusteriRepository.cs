using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IMusteriRepository : IBaseRepository<Musteri>
{
    /// <summary>Returns all customers with their Ulke navigation property loaded.
    /// 40+ ergonomi K5 — varsayılan: yumuşak silinen müşteriler hariç.</summary>
    Task<IEnumerable<Musteri>> GetAllWithUlkeAsync(bool includeDeleted = false);

    /// <summary>Ada göre müşteri (silinmiş olsa da) — yeni kayıt çakışma kontrolü için.</summary>
    Task<Musteri?> GetByMusteriAdAsync(string musteriAd);

    Task<bool> MusteriAdExistsAsync(string musteriAd);

    /// <summary>Faz 7 — Topbar global arama. MusteriAd/Telefon/E_Mail/VATNumarasi üzerinde LIKE.</summary>
    Task<IReadOnlyList<Musteri>> QuickFindAsync(string query, int limit);
}
