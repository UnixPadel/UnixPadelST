namespace CrmModern.Core.DTOs.User;

public sealed record UpdateUserDto(
    string Ad,
    string Soyad,
    string Email,
    string Telefon,
    string YetkiTuru,
    string Durum);
