namespace CrmModern.Core.DTOs.Accounting;

public sealed record TransactionFilterDto(
    string?   SiparisNo,
    string?   MusteriAd,
    int?      KullaniciID,
    DateTime? BaslangicTarih,
    DateTime? BitisTarih,
    int       Page     = 1,
    int       PageSize = 50);

public sealed record TransactionListItemDto(
    int      ID,
    string   SiparisNo,
    int      MusteriID,
    string?  MusteriAd,
    int      KullaniciID,
    string?  Kullanici,
    string?  ParaTipi,
    decimal? OdenenMiktar,
    DateTime Tarih);

public sealed record TransactionPageDto(
    IReadOnlyList<TransactionListItemDto> Items,
    int TotalCount, int Page, int PageSize);
