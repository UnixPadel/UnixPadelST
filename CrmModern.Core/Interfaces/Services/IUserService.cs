using CrmModern.Core.DTOs.User;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic for the KullaniciYonet WinForms screen.
/// </summary>
public interface IUserService
{
    Task<IReadOnlyList<UserListDto>>   GetAllAsync();
    Task<IReadOnlyList<UserLookupDto>> GetLookupAsync();
    Task<UserListDto>                  GetByIdAsync(int kullaniciId);
    Task                               CreateAsync(CreateUserDto dto);
    Task                               UpdateAsync(int kullaniciId, UpdateUserDto dto);
    Task                               DeleteAsync(int kullaniciId);
    Task                               ChangePasswordAsync(int kullaniciId, string newPassword);
}
