using System.ComponentModel.DataAnnotations;

namespace CrmModern.Core.DTOs.User;

public sealed record ChangePasswordDto(
    [Required, MinLength(1), MaxLength(25)] string NewPassword
);
