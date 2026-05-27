using System.Security.Claims;
using CrmModern.Core.DTOs.Auth;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// Login + me + logout. Tüm iş mantığı IAuthService'e delege.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var result = await authService.LoginAsync(request);
        return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Giriş başarılı."));
    }

    /// <summary>
    /// JWT'deki kullanıcı id üzerinden o anki kullanıcıyı döner.
    /// Sayfa yenilemede frontend kullanıcı bilgilerini buradan geri çeker.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idStr, out var id))
            return Unauthorized(ApiResponse<object>.Fail("Geçersiz token."));

        var result = await authService.GetMeAsync(id);
        return Ok(ApiResponse<LoginResponseDto>.Ok(result));
    }

    /// <summary>
    /// JWT stateless olduğu için sunucuda yapılacak iş yok; client token'ı siler.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => NoContent();
}
