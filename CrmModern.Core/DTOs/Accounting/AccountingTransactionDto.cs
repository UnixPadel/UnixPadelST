namespace CrmModern.Core.DTOs.Accounting;

public sealed record AccountingTransactionDto(
    int      ID,
    string   SiparisNo,
    int      MusteriID,
    int      KullaniciID,
    decimal? OdenenMiktar,
    DateTime Tarih);
