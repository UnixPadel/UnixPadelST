namespace CrmModern.Core.DTOs.User;

public sealed record CreateUserDto(
    string KullaniciAdi,
    string Sifre,
    string Ad,
    string Soyad,
    string Email,
    string Telefon,
    string YetkiTuru,
    string Durum);
