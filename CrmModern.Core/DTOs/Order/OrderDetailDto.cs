namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Full order/quote record returned for the SiparisForm / FormGetir view.
/// </summary>
public sealed record OrderDetailDto(
    string  SiparisNo,
    string  TeklifNo,
    string  MusteriAd,
    string? SiparisNotu,

    // ── Seller / representative snapshot ─────────────────────────────────
    string? STelefon,
    string? SFax,
    string? SWeb,
    string? SE_Mail,
    string? SVatNumarasi,
    string? SUlke,
    string? SAdres,

    // ── Customer snapshot ─────────────────────────────────────────────────
    string? MTelefon,
    string? MMail,
    string? MUlke,
    string? MVATNumarasi,
    string? MZipKod,
    string? MAdres,

    // ── Assembly ──────────────────────────────────────────────────────────
    bool     MontajVar,
    decimal? MontajFiyat,
    int      MAdet,

    // ── Delivery ──────────────────────────────────────────────────────────
    bool     TeslimatVar,
    decimal? TeslimatFiyat,
    int      MTeslimat,
    string?  TeslimatCesiti,
    string?  TTeslimAlanAdi,
    string?  TIlgiliKisi,
    string?  TTelefon,
    string?  TAltTelefon,
    string?  TE_Mail,
    string?  TVATNumarasi,
    string?  TZipKod,
    string?  TUlke,
    string?  TAdres,

    // ── Pricing ───────────────────────────────────────────────────────────
    string   ParaTipi,
    decimal? Indirim,
    decimal? Kdv,
    int      PesinYuzde,
    decimal? ToplamFiyat,
    decimal? BrutToplamFiyat,

    // ── Status ────────────────────────────────────────────────────────────
    string  SiparisMiTeklifMi,
    string  Kontrol,
    string? Red,
    string? Sirket,
    string? FabrikaNot,
    string? LojistikNot,

    // ── Tarih + son fabrika işlem tarihi (STarih) ─────────────────────────
    // Faz-fix 2.4/2.5: STarih artık "son fabrika işlem tarihi" rolünü de
    // üstlenir (MoveToProduction → seçilen üretim tarihi; MarkAsReady → Now).
    // 2.5'in stage history timeline'ı bu iki timestamp'ten türetilir.
    DateTime? Tarih,
    DateTime? STarih,

    // ── KullaniciAdi (salesperson) ────────────────────────────────────────
    string? KullaniciAdi,

    // ── Line items & details ──────────────────────────────────────────────
    IReadOnlyList<OrderItemDto> Items,
    IReadOnlyList<string>       Details,

    // ── PROMPT-v4 §4.1 — Kontrol ekranı cari bloğu ────────────────────────
    decimal? OdenenMiktar = null,
    string?  OdemeDurum   = null,
    string?  KontrolNot   = null
);
