namespace CrmModern.Core.DTOs.Dashboard;

/// <summary>
/// Sipariş aşaması bazında dağılım (pie/donut chart).
/// SiparisMiTeklifMi değerleri: Teklif | Siparis | Planlama | Uretim | Hazir | Lojistik | Tamamlandi | Iptal
/// </summary>
public sealed record StageDistributionDto(string Asama, int Sayi);
