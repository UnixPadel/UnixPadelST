namespace CrmModern.Core.DTOs.Logistics;

public sealed record LogisticsHistoryDto(
    int      ID,
    string   SiparisNo,
    string   FirmaAdi,
    string   LojistikCesit,
    decimal  Fiyat,
    string?  LNot,
    int      KullaniciID,
    // Paket 3: sevkin durumu Order.SiparisMiTeklifMi'den türetilir
    // ('Hazir' = Muhasebe Onayı Bekliyor, 'Lojistik' = Sevk Yolda, 'Tamamlandi' = Tamamlandı).
    string?  SiparisMiTeklifMi);
