using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.User;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// KullaniciYonet (WinForms) ekranının REST karşılığı.
/// "Yonetici" rolü WinForms'taki admin'e karşılık gelir — alias yok.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize(Roles = "Yonetici")]
public sealed class UserController(IUserService userService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<UserListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var result = await userService.GetAllAsync();
        return Ok(ApiResponse<IReadOnlyList<UserListDto>>.Ok(result));
    }

    [HttpGet("{kullaniciId:int}")]
    [ProducesResponseType(typeof(ApiResponse<UserListDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int kullaniciId)
    {
        var result = await userService.GetByIdAsync(kullaniciId);
        return Ok(ApiResponse<UserListDto>.Ok(result));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        await userService.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<object>.Ok(null!, "Kullanıcı oluşturuldu."));
    }

    [HttpPut("{kullaniciId:int}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int kullaniciId, [FromBody] UpdateUserDto dto)
    {
        await userService.UpdateAsync(kullaniciId, dto);
        return Ok(ApiResponse<object>.Ok(null!, "Kullanıcı güncellendi."));
    }

    [HttpDelete("{kullaniciId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int kullaniciId)
    {
        await userService.DeleteAsync(kullaniciId);
        return NoContent();
    }

    [HttpPost("{kullaniciId:int}/password")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangePassword(int kullaniciId, [FromBody] ChangePasswordDto dto)
    {
        await userService.ChangePasswordAsync(kullaniciId, dto.NewPassword);
        return Ok(ApiResponse<object>.Ok(null!, "Şifre güncellendi."));
    }
}
