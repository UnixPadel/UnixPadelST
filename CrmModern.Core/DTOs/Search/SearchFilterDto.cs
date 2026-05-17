namespace CrmModern.Core.DTOs.Search;

public sealed record SearchFilterDto(
    string?   SiparisNo,
    string?   MusteriAd,
    int?      KullaniciID,
    string?   Ulke,
    string?   Asama,
    string?   Kontrol,
    string?   OdemeDurum,
    DateTime? Baslangic,
    DateTime? Bitis);
