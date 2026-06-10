namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Payload for creating or revising a quote/order (siparisAlButon / teklifAlButonu / revizeEtButton).
/// </summary>
public sealed record CreateOrderDto(
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

    // ── Assembly ──────────────────────────────────────────────────────────
    bool    MontajVar,
    decimal MontajFiyat,
    int     MAdet,

    // ── Delivery ──────────────────────────────────────────────────────────
    bool    TeslimatVar,
    decimal TeslimatFiyat,
    int     MTeslimat,
    string? TeslimatCesiti,
    string? TTeslimAlanAdi,
    string? TIlgiliKisi,
    string? TTelefon,
    string? TAltTelefon,
    string? TE_Mail,
    string? TVATNumarasi,
    string? TZipKod,
    string? TUlke,
    string? TAdres,

    // ── Customer snapshot ─────────────────────────────────────────────────
    string? MTelefon,
    string? MMail,
    string? MUlke,
    string? MVATNumarasi,
    string? MZipKod,
    string? MAdres,

    // ── Pricing ───────────────────────────────────────────────────────────
    // PROMPT-v2 §3: Indirim/Kdv/PesinYuzde nullable — kullanıcı boş bırakırsa
    // "henüz karar vermedi" semantiği korunur. Total hesaplamasında null → 0.
    string   ParaTipi,
    decimal? Indirim,
    decimal? Kdv,
    int?     PesinYuzde,

    // ── Product sets (up to 5, matching the 5 tab pages) ─────────────────
    IReadOnlyList<OrderSetDto> Sets,

    // ── Free-text details (checked rows from detayDataGrid) ───────────────
    IReadOnlyList<string> Details,

    // ── Miscellaneous ─────────────────────────────────────────────────────
    string  Sirket,
    string? EkBase64    // optional attachment as base64-encoded string
);
