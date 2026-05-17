namespace CrmModern.Core.DTOs.Musteri;

public sealed record MusteriDto(
    int     MusteriID,
    string  MusteriAd,
    string  Telefon,
    string  ZipKod,
    string  E_Mail,
    string  Adres,
    string  VATNumarasi,
    int     UlkelerID,
    string  UlkeAdi,
    string? Bolge
);
