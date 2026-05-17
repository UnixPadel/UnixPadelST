namespace CrmModern.Core.DTOs.Musteri;

public sealed record UlkeDto(
    int     UlkelerID,
    string  UlkeAdi,
    string  NumaraBirimi,
    string? Bolge
);
