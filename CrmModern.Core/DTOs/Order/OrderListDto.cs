namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Projection used by the Siparislerim list view.
/// Returns both SiparisNo and TeklifNo separately so the frontend can display both columns.
/// </summary>
public sealed record OrderListDto(
    int      SiparisAlID,
    string   SiparisNo,
    string   TeklifNo,
    string   MusteriAd,
    string?  MUlke,
    int      KullaniciID,
    string   ParaTipi,
    decimal? ToplamFiyat,
    string   SiparisMiTeklifMi,
    string   Kontrol,
    DateTime Tarih,
    string?  Sirket,
    // PROMPT-v4 §2/§6.2 — Kontrol grid kolonları + Siparişlerim sahip kolonu.
    // Kaparo/Kalan hesapları istemcide yapılır (legacy formülü, liste tarafında clamp'siz kalan).
    int      PesinYuzde       = 0,
    decimal? OdenenMiktar     = null,
    string?  TeslimatCesiti   = null,
    string?  OdemeDurum       = null,
    string?  KullaniciAdSoyad = null,
    // Round-8 §7 — düzenleme/silme rozetleri (Siparişlerim).
    bool     Silindi           = false,
    bool     Guncellendi       = false,
    string?  DegisiklikGerekce = null,
    string?  TamamlayanAdSoyad = null,
    DateTime? TamamlanmaTarihi = null
);
