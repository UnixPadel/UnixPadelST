namespace CrmModern.Core.DTOs.WarehouseStock;

/// <summary>Liste satırı — bir mal kalemi ve hesaplanmış kalan miktarı.</summary>
public sealed record StockItemListDto(
    int       Id,
    int?      BeyannameId,
    string?   BeyannameNo,
    string    Konum,
    string    MalAdi,
    string?   TicariTanim,
    decimal   Miktar,
    decimal   Kalan,
    string    Birim,
    decimal?  KapAdedi,
    decimal?  KalanKap,
    string?   KapCinsi,
    string    Durum,            // Bekliyor | Kismen | Tamam
    DateTime  OlusturmaTarihi,
    DateTime? SonCikisTarihi,
    // 40+ ergonomi K5 — yalnız ?includeDeleted=true listesinde (ve silinmiş kalemin detayında) true olabilir.
    bool      Silindi       = false,
    DateTime? SilinmeTarihi = null);

/// <summary>Konum filtresi sayaçları (arama + "tamamlananlar" filtresi uygulanmış küme üzerinde).</summary>
public sealed record StockCountsDto(int Tumu, int Antrepo, int Depo);

public sealed record StockListDto(IReadOnlyList<StockItemListDto> Items, StockCountsDto Sayac);

public sealed record BeyannameOzetDto(
    int       Id,
    string?   No,
    DateTime? TescilTarihi,
    string?   RejimKodu,
    string?   GumrukIdaresi,
    string?   Gonderici,
    string?   Alici,
    string?   Doviz,
    decimal?  FaturaTutari,
    string    Kaynak,
    bool      BelgeVar,
    string?   BelgeAdi,
    string?   YukleyenAd,
    DateTime  YuklemeTarihi);

public sealed record StockExitDto(
    int       Id,
    decimal   Miktar,
    decimal?  KapAdedi,
    DateTime  Tarih,
    string?   Not,
    int       GirenKullaniciId,
    string?   GirenAd,
    DateTime  KayitZamani,
    DateTime? GeriAlinmaZamani,
    string?   GeriAlanAd,
    bool      GeriAlinabilir);

public sealed record StockItemDetailDto(
    StockItemListDto             Item,
    string?                      Gtip,
    string?                      MenseUlke,
    decimal?                     BrutKg,
    decimal?                     NetKg,
    int?                         KalemNo,
    decimal?                     KalemFiyati,
    BeyannameOzetDto?            Beyanname,
    IReadOnlyList<StockExitDto>  Cikislar,
    int                          GeriAlmaSuresiGun);

public sealed record StockDocumentDto(byte[] Veri, string Ad, string Tip);
