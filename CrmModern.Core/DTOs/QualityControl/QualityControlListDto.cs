namespace CrmModern.Core.DTOs.QualityControl;

/// <summary>
/// Row returned by the Kontrol DataGrid. Bekleyen (Kontrol='Kontrol') TÜM
/// kayıtlar + son X günde onaylananlar (Kontrol='Onay'); Kontrol alanı ikisini
/// grid'de ayırt etmek için taşınır.
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
    string?  Sirket,
    string   Kontrol            // 'Kontrol' (bekleyen) | 'Onay' (onaylı)
);
