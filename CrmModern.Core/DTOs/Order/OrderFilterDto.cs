namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Fabrika.cs çoklu filtre + sayfalama. Tüm alanlar opsiyonel.
/// </summary>
public sealed record OrderFilterDto(
    string?   SiparisNo,
    string?   MusteriAd,
    int?      KullaniciID,
    string?   MUlke,
    string?   Asama,             // SiparisMiTeklifMi enum değeri
    string?   ParaTipi,
    DateTime? BaslangicTarih,
    DateTime? BitisTarih,
    int       Page    = 1,
    int       PageSize = 50,
    // PROMPT-v4 §3 — Kontrol ekranı filtre barı (repository SearchAsync zaten destekliyor)
    string?   Kontrol    = null,
    string?   OdemeDurum = null);

public sealed record OrderListPageDto(
    IReadOnlyList<OrderListDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
