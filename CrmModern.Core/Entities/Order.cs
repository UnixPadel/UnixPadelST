namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to SiparisAlTablo — schema unchanged.
/// SiparisMiTeklifMi values: Teklif | Siparis | Planlama | Uretim | Hazir | Lojistik | Tamamlandi
/// Kontrol values:           Kontrol | Onay | Reddet
/// Montaj / Teslimat values: Var | Yok
/// ParaTipi values:          Euro | Dolar | TL | Sterlin
/// </summary>
public sealed class Order
{
    public int    SiparisAlID       { get; set; }
    public int?   MusteriId         { get; set; }   // FK → MusteriBilgileri.MusteriID
    public string SiparisNo         { get; set; } = string.Empty;
    public string TeklifNo          { get; set; } = string.Empty;
    public string MusteriAd         { get; set; } = string.Empty;
    public string? SiparisNotu      { get; set; }
    public int    KullaniciID       { get; set; }

    // ── Seller / representative snapshot (S-prefix) ──────────────────────
    public string? STelefon         { get; set; }
    public string? SFax             { get; set; }
    public string? SWeb             { get; set; }
    public string? SE_Mail          { get; set; }
    public string? SVatNumarasi     { get; set; }
    public string? SUlke            { get; set; }
    public string? SAdres           { get; set; }

    // ── Assembly (Montaj) ─────────────────────────────────────────────────
    public string   Montaj           { get; set; } = "Yok";   // "Var" | "Yok"
    public decimal? MontajFiyat      { get; set; }
    public int      MAdet            { get; set; }

    // ── Delivery (Teslimat) ───────────────────────────────────────────────
    public string   Teslimat         { get; set; } = "Yok";   // "Var" | "Yok"
    public decimal? TeslimatFiyat    { get; set; }
    public int     MTeslimat        { get; set; }
    public string? TeslimatÇeşiti   { get; set; }

    // ── Deliver-to contact (T-prefix) ─────────────────────────────────────
    public string? TTeslimAlanAdi   { get; set; }
    public string? TIlgiliKisi      { get; set; }
    public string? TTelefon         { get; set; }
    public string? TAltTelefon      { get; set; }
    public string? TE_Mail          { get; set; }
    public string? TVATNumarasi     { get; set; }
    public string? TZipKod          { get; set; }
    public string? TUlke            { get; set; }
    public string? TAdres           { get; set; }

    // ── Customer snapshot (M-prefix = Musteri) ────────────────────────────
    public string? MTelefon         { get; set; }
    public string? MMail            { get; set; }
    public string? MUlke            { get; set; }
    public string? MVATNumarasi     { get; set; }
    public string? MZipKod          { get; set; }
    public string? MAdres           { get; set; }

    // ── Payment ───────────────────────────────────────────────────────────
    public decimal? OdenenMiktar     { get; set; }
    public string?  OdemeDurum       { get; set; }

    // ── Pricing ───────────────────────────────────────────────────────────
    public string   ParaTipi         { get; set; } = "Euro";
    public decimal? Indirim          { get; set; }
    public decimal? Kdv              { get; set; }
    public int      PesinYüzde       { get; set; }
    public decimal? ToplamFiyat      { get; set; }
    public decimal? BrutToplamFiyat  { get; set; }

    // ── Status ────────────────────────────────────────────────────────────
    public string  SiparisMiTeklifMi { get; set; } = "Teklif";
    public string  Kontrol           { get; set; } = "Kontrol";
    public string? Red               { get; set; }

    // ── Metadata ──────────────────────────────────────────────────────────
    public string?   Sirket          { get; set; }
    public DateTime  Tarih           { get; set; }
    public byte[]?   Ek              { get; set; }
    public byte[]?   MuhasebeEk      { get; set; }
    public DateTime? STarih          { get; set; }
    public string?   FabrikaNot      { get; set; }
    public string?   LojistikNot     { get; set; }

    // ── Navigation properties ─────────────────────────────────────────────
    public Kullanici?                  Kullanici { get; set; }
    public ICollection<OrderItem>      Items     { get; set; } = [];
    public ICollection<OrderDetail>    Details   { get; set; } = [];
}
