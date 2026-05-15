namespace CrmModern.Core.Entities;

/// <summary>
/// SiparisTeslimatTablo — bir siparişin birden fazla teslimat adres satırı.
/// SiparisAlTablo üzerindeki T* kolonlar SADECE birinci adresi tutar; ek
/// adresler bu tabloya yazılır.
/// (DİKKAT: TeslimatBilgisiTablo (DeliveryAddress) ≠ SiparisTeslimatTablo.)
/// </summary>
public sealed class OrderShipment
{
    public int      SiparisID         { get; set; }
    public string?  SiparisNo         { get; set; }
    public string?  TeklifNo          { get; set; }
    public string?  Montaj            { get; set; }
    public string?  Teslimat          { get; set; }
    public decimal? MontajFiyat       { get; set; }
    public decimal? TeslimatFiyat     { get; set; }
    public string?  TeslimatCesiti    { get; set; }   // column: TeslimatÇeşiti
    public string?  TTeslimAlanAdi    { get; set; }
    public string?  TIlgiliKisi       { get; set; }
    public string?  TTelefon          { get; set; }
    public string?  TAltTelefon       { get; set; }
    public string?  TE_Mail           { get; set; }
    public string?  TVATNumarasi      { get; set; }
    public string?  TZipKod           { get; set; }
    public string?  TUlke             { get; set; }
    public string?  TAdres            { get; set; }
}
