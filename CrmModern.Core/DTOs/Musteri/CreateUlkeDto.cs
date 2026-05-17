using System.ComponentModel.DataAnnotations;

namespace CrmModern.Core.DTOs.Musteri;

public sealed record CreateUlkeDto(
    [Required] string UlkeAdi,
    [Required] string NumaraBirimi
);
