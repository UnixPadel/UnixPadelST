namespace CrmModern.Core.DTOs.Order;

public sealed record MaterialCostLineDto(
    int      KategoriID,
    string?  KategoriAdi,
    decimal  Malzeme,
    decimal  Iscilik,
    decimal  Nakliye,
    decimal  Diger,
    decimal  Toplam);

public sealed record MaterialCostDto(
    string   SiparisNo,
    decimal  GenelToplam,
    IReadOnlyList<MaterialCostLineDto> Kategoriler);

public sealed record ExpandRecipeRequest(int KategoriID, int Adet);
