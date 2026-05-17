using System.ComponentModel.DataAnnotations;

namespace CrmModern.Core.DTOs.Auth;

public sealed record LoginRequestDto(
    [Required] string KullaniciAdi,
    [Required] string Sifre
);
