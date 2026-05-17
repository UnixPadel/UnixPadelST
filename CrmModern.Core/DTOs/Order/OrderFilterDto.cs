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
    int       PageSize = 50);

public sealed record OrderListPageDto(
    IReadOnlyList<OrderListDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
