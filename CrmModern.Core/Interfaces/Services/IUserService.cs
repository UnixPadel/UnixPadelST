using CrmModern.Core.DTOs.User;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic for the KullaniciYonet WinForms screen.
/// </summary>
public interface IUserService
{
    /// <summary>40+ ergonomi K5 — varsayılan: silinen kullanıcılar hariç; includeDeleted=true dahil eder.</summary>
    Task<IReadOnlyList<UserListDto>>   GetAllAsync(bool includeDeleted = false);
    Task<IReadOnlyList<UserLookupDto>> GetLookupAsync();
    Task<UserListDto>                  GetByIdAsync(int kullaniciId);
    Task                               CreateAsync(CreateUserDto dto);
    Task                               UpdateAsync(int kullaniciId, UpdateUserDto dto);
    /// <summary>40+ ergonomi K5 — yumuşak silme (Silindi bayrağı).</summary>
    Task                               DeleteAsync(int kullaniciId, int silenKullaniciId);
    /// <summary>Yumuşak silinen kullanıcıyı geri yükler (silinmemişse userNotDeleted).</summary>
    Task                               RestoreAsync(int kullaniciId, int geriYukleyenKullaniciId);
    Task                               ChangePasswordAsync(int kullaniciId, string newPassword);
}
