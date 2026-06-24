namespace CrmModern.Core.Entities;

/// <summary>
/// Maps to LojistikTeklifTablo — one row per logistics offer (bid) on an order.
/// Lojistik kullanıcısı sipariş üretimdeyken teklif girer; Yönetici birini onaylar
/// (Durum='Onaylandi'). Aynı SiparisNo için aynı anda en fazla bir 'Onaylandi'
/// satır olur (servis bunu uygular). Onaylı satır = siparişin ilişkili lojistiği.
/// Mevcut <see cref="LogisticsEntry"/> (LojistikTablo = sevk olayı) ile karıştırma.
/// </summary>
public sealed class LogisticsOffer
{
    public int       TeklifID        { get; set; }
    public string    SiparisNo       { get; set; } = string.Empty;
    public int       KullaniciID     { get; set; }                 // teklifi giren
    public string    FirmaAdi        { get; set; } = string.Empty;
    public string    LojistikCesit   { get; set; } = string.Empty; // Incoterm / taşıma türü
    public decimal   Fiyat           { get; set; }
    public string?   Aciklama        { get; set; }                 // Not
    public string    Durum           { get; set; } = "Beklemede";  // Beklemede | Onaylandi | Reddedildi
    public DateTime  OlusturmaTarihi { get; set; }
    public int?      OnayKullaniciID { get; set; }                 // kararı veren yönetici (onay/red)
    public DateTime? OnayTarihi      { get; set; }
    public string?   RedNotu         { get; set; }                 // red açıklaması (Durum='Reddedildi')
}
