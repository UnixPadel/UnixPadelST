using CrmModern.Core.DTOs.Dashboard;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Excel export operations + Faz 7 dashboard aggregations.
/// Excel kısmı WinForms Muhasebe.cs / Kontrol.cs excelYazOzet_Click handler'larının karşılığı.
/// Dashboard kısmı WinForms'ta yorum satırı olan (devre dışı) grafik mantığının modern UI'a uyarlamasıdır.
/// </summary>
public interface IReportingService
{
    Task<byte[]> ExportAccountingOrdersAsync();
    /// <summary>
    /// Sipariş proforması. <paramref name="lang"/> ("tr"|"en") standart şart
    /// kodlarının (#DETAY) hangi dilde yazılacağını belirler (Round-8 §4).
    /// </summary>
    Task<byte[]> ExportOrderProformaAsync(string siparisNo, string lang = "tr");

    // ── Faz 7 Dashboard ───────────────────────────────────────────────────────

    /// <summary>Rol bazlı KPI sayıları (kart widget'ları için).</summary>
    Task<DashboardKpiDto> GetDashboardKpisAsync(int currentUserId, string role);

    /// <summary>Son N ay sipariş trendi.</summary>
    Task<IReadOnlyList<OrderTrendPointDto>> GetOrdersByMonthAsync(int months = 12);

    /// <summary>Aşama dağılımı (pie/donut).</summary>
    Task<IReadOnlyList<StageDistributionDto>> GetOrdersByStageAsync();

    /// <summary>Son N günde en çok ciro yapan müşteriler.</summary>
    Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(int days = 90, int limit = 10);

    /// <summary>Son N günde para birimi dağılımı.</summary>
    Task<IReadOnlyList<CurrencyDistributionDto>> GetCurrencyDistributionAsync(int days = 90);

    /// <summary>Round-8 §13 — Tarih aralığında Temsilci-rolü kullanıcı başına performans.</summary>
    Task<IReadOnlyList<RepPerformanceDto>> GetRepPerformanceAsync(DateTime start, DateTime end);
}
