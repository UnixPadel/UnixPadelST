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
    string?  SiparisMiTeklifMi,
    // PROMPT.md OBSERVER #18: Gözlemci ekranındaki Lojistik Geçmiş tablosuna
    // operatörün Ad Soyad'ı bir kolon olarak eklendi. NULL geliyorsa
    // KullaniciBilgileri tarafında eşleşme bulunamadı demektir.
    string?  KullaniciAdSoyad = null);
