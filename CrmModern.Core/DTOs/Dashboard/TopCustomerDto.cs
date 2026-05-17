namespace CrmModern.Core.DTOs.Dashboard;

/// <summary>
/// En çok sipariş veren müşteri (bar chart için).
/// ToplamCiro tek bir para birimine normalize edilmez; ParaTipi gösterilir.
/// </summary>
public sealed record TopCustomerDto(
    string MusteriAd,
    int SiparisSayisi,
    decimal ToplamCiro,
    string ParaTipi);
