namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to SatinAlmaTalep — purchase / accounting approval requests.
/// Durum values:   'Onay Bekliyor' | 'Onaylandı' | 'Reddedildi'
/// TalepTipi:      'SatinAlma' | 'Muhasebe'
/// Departman:      matches YetkiTuru values (Lojistik / Fabrika / Gozlemci …)
/// </summary>
public sealed class PurchaseRequest
{
    public int       TalepID               { get; set; }
    public string    UrunAdi               { get; set; } = string.Empty;
    public string?   UrunTuru              { get; set; }
    public decimal   UrunMaliyeti          { get; set; }
    public string?   AlinanYer             { get; set; }
    public string?   TalepEdenKullaniciAdi { get; set; }
    public string?   Departman             { get; set; }
    public DateTime  TalepTarihi           { get; set; }
    public string    Durum                 { get; set; } = "Onay Bekliyor";
    public string?   RedNotu               { get; set; }
    public string?   IslemYapanKullanici   { get; set; }
    public DateTime? IslemTarihi           { get; set; }
    public string?   TalepTipi             { get; set; }

    // ── Muhasebe-type request extras ─────────────────────────────────────────
    public string?   MusteriAdi        { get; set; }
    public decimal?  ToplamSiparis     { get; set; }
    public decimal?  KaporaBakiyesi    { get; set; }
    public decimal?  KalanBakiyeTalep  { get; set; }
    public decimal?  PesinYuzde        { get; set; }
    public decimal?  Maliyet           { get; set; }
    public string?   MaliyetDetayi     { get; set; }
    public decimal?  Kar               { get; set; }
    public string?   SiparisNo         { get; set; }

    // ── Faz 6: 17 ödeme / ön-izleme kolonu (BIREBIR DB tipleri) ─────────────
    public string?   Notlar                  { get; set; }   // TEXT
    public string?   OnIzlemeYapan           { get; set; }   // VARCHAR(100)
    public DateTime? OnIzlemeTarihi          { get; set; }   // DATETIME
    public string?   OdemeTuru               { get; set; }   // VARCHAR(50) — Peşin/Vadeli/Mal Mukabili/Çek-Senet/Havale-EFT/Kart
    public decimal?  OdenenTutar             { get; set; }   // DECIMAL(18,2)
    public decimal?  OdemeTutari             { get; set; }   // DECIMAL(18,2)
    public string?   OdemeVadeSuresi         { get; set; }   // VARCHAR(50) — "30 gün" gibi metin (memory'deki INT yanlış)
    public decimal?  OdemeVadeTutari         { get; set; }   // DECIMAL(18,2)
    public DateOnly? OdemeVadeTarihi         { get; set; }   // DATE (datetime değil)
    public string?   OdemeBelgeNo            { get; set; }   // VARCHAR(100)
    public string?   OdemeBankaAdi           { get; set; }   // VARCHAR(100)
    public DateTime? OdemeIslemTarihi        { get; set; }   // DATETIME
    public string?   OdemeKartTipi           { get; set; }   // VARCHAR(100)
    public int?      OdemeTaksitSayisi       { get; set; }   // INT
    public string?   OdemeAciklama           { get; set; }   // TEXT
    public string?   MuhasebeYapanKullanici  { get; set; }   // VARCHAR(100)
    public DateTime? MuhasebeTarihi          { get; set; }   // DATETIME
}
