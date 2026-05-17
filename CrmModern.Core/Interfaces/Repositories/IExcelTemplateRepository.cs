using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// ExcelIndir tablosu — proforma şablonu BLOB'unu okur.
/// WinForms: `SELECT Excel FROM ExcelIndir LIMIT 1`.
/// </summary>
public interface IExcelTemplateRepository : IBaseRepository<ExcelTemplate>
{
    /// <summary>En son yüklenen şablonun byte içeriği. Tablo boşsa null.</summary>
    Task<byte[]?> GetLatestBytesAsync();
}
