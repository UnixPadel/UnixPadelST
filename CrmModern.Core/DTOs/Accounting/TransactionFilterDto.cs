namespace CrmModern.Core.DTOs.Accounting;

// PROMPT.md ACCOUNTING #15: MUlke and OdenenMiktar added to mirror the legacy
// MuhasebeGecmis.cs filter strip (comboBoxUlke + comboBoxOdemeDurum).
public sealed record TransactionFilterDto(
    string?   SiparisNo,
    string?   MusteriAd,
    string?   MUlke,
    int?      KullaniciID,
    decimal?  OdenenMiktar,
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

// CurrencyTotals: PROMPT.md ACCOUNTING #15 — sum of OdenenMiktar per ParaTipi
// across the FULL filtered result (not just the current page), so the UI
// currency strip stays correct under pagination. Keys: "Euro" / "Dolar" /
// "TL" / "Sterlin"; empty buckets are still included so the UI can show 0.
public sealed record TransactionPageDto(
    IReadOnlyList<TransactionListItemDto> Items,
    int TotalCount, int Page, int PageSize,
    IReadOnlyDictionary<string, decimal> CurrencyTotals);
