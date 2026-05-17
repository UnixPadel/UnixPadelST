using System.ComponentModel.DataAnnotations;

namespace CrmModern.Core.DTOs.Musteri;

public sealed record CreateMusteriDto(
    [Required] string MusteriAd,
    [Required] string Telefon,
    [Required] string ZipKod,
    [Required] string E_Mail,
    [Required] string Adres,
    [Required] string VATNumarasi,
    [Range(1, int.MaxValue)] int UlkelerID
);
