namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to EklemeGecmisi — Faz 8'de stok ekleme tablosundan genel audit log'a evrildi.
/// Faz 8 ALTER ile eklenen kolonlar: Action, EntityType, EntityId, Details.
/// KategoriID ve Miktar geriye dönük uyumluluk için nullable.
/// </summary>
public sealed class AuditEntry
{
    public int       EklemeID     { get; set; }
    public int?      KategoriID   { get; set; }
    public int?      KullaniciID  { get; set; }
    public int?      Miktar       { get; set; }
    public DateTime? EklemeTarihi { get; set; }
    public string?   Aciklama     { get; set; }

    // ── Faz 8 audit kolonları ────────────────────────────────────────────
    public string?   Action     { get; set; }   // "OrderCreate" | "OrderApprove" | "PasswordChange" | ...
    public string?   EntityType { get; set; }   // "Order" | "PurchaseRequest" | "User" | ...
    public string?   EntityId   { get; set; }   // string olarak (SiparisNo da int de olabilir)
    public string?   Details    { get; set; }   // serbest metin / JSON
}
