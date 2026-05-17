using CrmModern.Core.DTOs.Auth;

namespace CrmModern.Core.Interfaces.Services;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);

    /// <summary>
    /// JWT'deki kullanıcı id'si üzerinden mevcut kullanıcıyı döner (token hariç alanlar).
    /// </summary>
    Task<LoginResponseDto> GetMeAsync(int kullaniciId);
}
