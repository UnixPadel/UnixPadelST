using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Repository contract for TeslimatBilgisiTablo (reusable delivery address book).
/// </summary>
public interface IDeliveryAddressRepository : IBaseRepository<DeliveryAddress>
{
    /// <summary>
    /// Returns true if a row with the given TeslimAlanAdi already exists.
    /// Used to skip duplicate inserts — matching the WinForms upsert logic.
    /// </summary>
    Task<bool> TeslimAlanAdiExistsAsync(string teslimAlanAdi);
}
