namespace CrmModern.Core.DTOs.User;

public sealed record UserListDto(
    int    KullaniciID,
    string KullaniciAdi,
    string Ad,
    string Soyad,
    string Email,
    string Telefon,
    string YetkiTuru,
    string Durum,
    // 40+ ergonomi K5 — yalnız ?includeDeleted=true listesinde true olabilir.
    bool      Silindi       = false,
    DateTime? SilinmeTarihi = null);
