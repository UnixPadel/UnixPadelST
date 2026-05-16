namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to ExcelIndir — schema unchanged.
/// WinForms karşılığı: Fabrika.cs / Kontrol.cs / Muhasebe.cs içinde
/// `SELECT Excel FROM ExcelIndir LIMIT 1` ile çekilen BLOB proforma şablonu.
/// Yalnızca 2 kolon: ID (PK auto_increment), Excel (mediumblob).
/// </summary>
public sealed class ExcelTemplate
{
    public int    ID    { get; set; }
    public byte[] Excel { get; set; } = Array.Empty<byte>();
}
