namespace CrmModern.Core.DTOs.Factory;

// PROMPT-v5 §2 regresyon korkuluğu: bu DTO Fabrika rolünün ana listesini besler —
// hiçbir parasal alan (fiyat/bakiye/kaparo/ciro) EKLENMEMELİDİR.
public sealed record FactoryOrderListDto(
    string  SiparisNo,
    string  MusteriAd,
    string? MUlke,
    string  SiparisMiTeklifMi,
    string? FabrikaNot,
    DateTime? STarih,
    DateTime Tarih,
    int     KullaniciID,
    string? Kullanici,        // "Ad Soyad" — Fabrika "Temsilci" sütunu / filtresi
    // Round-8 §11 — Cari onay (SiparisOnaylari "MuhasebeOnaylandi") tarihi.
    // STarih (başlangıç) DEĞİŞMEZ; bu yalnız onay zamanını taşır. Parasal değil.
    DateTime? CariOnayTarih);
