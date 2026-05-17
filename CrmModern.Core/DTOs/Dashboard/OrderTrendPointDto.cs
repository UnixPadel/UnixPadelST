namespace CrmModern.Core.DTOs.Dashboard;

/// <summary>
/// Aylık sipariş trendi tek noktası.
/// Ay etiketi "yyyy-MM" formatında.
/// </summary>
public sealed record OrderTrendPointDto(
    string Ay,
    int SiparisSayisi,
    decimal CiroEuro,
    decimal CiroDolar,
    decimal CiroTL,
    decimal CiroSterlin);
