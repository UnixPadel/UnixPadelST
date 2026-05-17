namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Entry from TeslimatBilgisiTablo for the delivery address autocomplete/dropdown.
/// </summary>
public sealed record DeliveryAddressDto(
    int     TeslimatBilgiID,
    string  TeslimAlanAdi,
    string? IlgiliKisi,
    int?    UlkeID,
    string? ZipKod,
    string? TelUlkeKodu,
    string? Telefon,
    string? AltTelUlkeKodu,
    string? AltTelefon,
    string? E_Mail,
    string? VATNumarasi,
    string? Adres
);
