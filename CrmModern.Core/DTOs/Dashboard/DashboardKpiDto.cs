namespace CrmModern.Core.DTOs.Dashboard;

/// <summary>
/// Rol bazlı KPI kartlarının tüm sayıları. Tüm alanlar zorunlu;
/// rolün ilgilenmediği KPI'lar 0 döner (frontend gizler).
///
/// WinForms karşılığı: Form3 dashboard yorum satırında — modern UI için minimum set.
/// </summary>
public sealed record DashboardKpiDto(
    int Son30GunSiparisSayisi,
    decimal Son30GunCiroEuro,
    decimal Son30GunCiroDolar,
    decimal Son30GunCiroTL,
    decimal Son30GunCiroSterlin,
    int BekleyenKontrolSayisi,
    int UretimdekiSiparisSayisi,
    int SevkiyatBekleyenSayisi,
    int OdemeBekleyenSayisi,
    int BekleyenSatinAlmaTalepSayisi,
    int KendiAcikSiparisSayisi);
