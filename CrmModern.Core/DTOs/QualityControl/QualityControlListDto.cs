namespace CrmModern.Core.DTOs.QualityControl;

/// <summary>
/// Row returned by the Kontrol DataGrid (WHERE Kontrol = 'Kontrol').
/// KaparoFiyat and KalanBakiye are computed in-service using the same
/// formula as the WinForms SiparisAlTabloDataGridView query.
/// </summary>
public sealed record QualityControlListDto(
    string   SiparisNo,
    string   MusteriAd,
    string?  MUlke,
    decimal? ToplamFiyat,
    decimal  KaparoFiyat,       // GREATEST((ToplamFiyat * PesinYuzde/100) - OdenenMiktar, 0)
    decimal  KalanBakiye,       // ToplamFiyat - OdenenMiktar
    int      PesinYuzde,
    string?  TeslimatCesiti,
    string   ParaTipi,
    string?  OdemeDurum,
    string   SiparisMiTeklifMi,
    DateTime Tarih,
    string?  Sirket
);
