namespace CrmModern.Core.Entities;

/// <summary>
/// StokTablo — basit ürün stok kaydı. Faz 3'te SADECE OKU; yazma akışı Faz 4 (üretim).
/// </summary>
public sealed class StockEntry
{
    public int    ID    { get; set; }
    public string Urun  { get; set; } = string.Empty;
    public int    Adet  { get; set; }
}
