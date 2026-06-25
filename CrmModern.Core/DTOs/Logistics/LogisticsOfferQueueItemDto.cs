namespace CrmModern.Core.DTOs.Logistics;

/// <summary>
/// "Lojistik Teklif" ekranı kuyruğu — üretim→tamamlanma aralığındaki sipariş satırı.
/// TeklifSayisi = girilmiş teklif adedi; OnayliFirma/OnayliFiyat = onaylı teklif özeti (varsa).
/// </summary>
public sealed record LogisticsOfferQueueItemDto(
    string    SiparisNo,
    string    MusteriAd,
    string?   MUlke,
    string    SiparisMiTeklifMi,
    DateTime  Tarih,
    DateTime? STarih,
    int       TeklifSayisi,
    string?   OnayliFirma,
    decimal?  OnayliFiyat,
    string?   OnayliParaBirimi);
