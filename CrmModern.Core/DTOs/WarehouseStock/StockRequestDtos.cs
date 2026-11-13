namespace CrmModern.Core.DTOs.WarehouseStock;

/// <summary>Kaydetme isteği — otomatik okunup onaylanan ya da elle girilen taslak.</summary>
public sealed record CreateStockRequest(
    string                       Konum,
    string?                      BeyannameNo,
    DateTime?                    TescilTarihi,
    string?                      RejimKodu,
    string?                      GumrukIdaresi,
    string?                      Gonderici,
    string?                      Alici,
    string?                      Doviz,
    decimal?                     FaturaTutari,
    decimal?                     Kur,
    string?                      Kaynak,        // Otomatik | Elle
    string?                      HamJson,
    IReadOnlyList<CreateStockItemRequest> Kalemler);

public sealed record CreateStockItemRequest(
    int?      KalemNo,
    string    MalAdi,
    string?   TicariTanim,
    decimal   Miktar,
    string    Birim,
    decimal?  KapAdedi,
    string?   KapCinsi,
    string?   Gtip,
    string?   MenseUlke,
    decimal?  BrutKg,
    decimal?  NetKg,
    decimal?  KalemFiyati);

/// <summary>Kalem düzenleme (konum, kısa ad, miktar, birim, kap).</summary>
public sealed record UpdateStockItemRequest(
    string    Konum,
    string    MalAdi,
    decimal   Miktar,
    string    Birim,
    decimal?  KapAdedi,
    string?   KapCinsi);

/// <summary>
/// "Araca yüklendi" işareti. <c>Tamami=true</c> → kalanın tamamı (kap dahil).
/// Aksi halde <c>Miktar</c> zorunlu, <c>KapAdedi</c> isteğe bağlı.
/// </summary>
public sealed record AddStockExitRequest(
    bool      Tamami,
    decimal?  Miktar,
    decimal?  KapAdedi,
    DateTime? Tarih,
    string?   Not);

public sealed record CreateStockResultDto(int BeyannameId, IReadOnlyList<int> KalemIds);
