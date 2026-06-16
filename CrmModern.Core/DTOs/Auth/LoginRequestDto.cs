using System.ComponentModel.DataAnnotations;

namespace CrmModern.Core.DTOs.Auth;

public sealed record LoginRequestDto(
    [Required] string KullaniciAdi,
    [Required] string Sifre,
    // "Beni Hatırla" — true ise sunucu uzun ömürlü JWT üretir (RememberMeExpiryDays),
    // istemci token'ı localStorage'a yazar. false ise normal ExpiryHours + sessionStorage.
    bool RememberMe = false
);
