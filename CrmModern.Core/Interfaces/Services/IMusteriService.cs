using CrmModern.Core.DTOs.Musteri;

namespace CrmModern.Core.Interfaces.Services;

public interface IMusteriService
{
    /// <summary>
    /// PROMPT-v2 §7: <paramref name="currentUserId"/> + <paramref name="role"/>
    /// rol bazlı filtreleme için. Temsilci yalnız CreatedByKullaniciID = kendi
    /// id'si olan kayıtları görür; diğer roller tüm kayıtları alır.
    /// </summary>
    Task<IEnumerable<MusteriDto>> GetAllAsync(int currentUserId, string role);
    Task<MusteriDto>              GetByIdAsync(int id);
    /// <summary>
    /// PROMPT-v2 §7: Yaratıcı kullanıcı id'si CreatedByKullaniciID kolonuna yazılır.
    /// </summary>
    Task<MusteriDto>              CreateAsync(CreateMusteriDto dto, int currentUserId);
    Task<MusteriDto>              UpdateAsync(int id, UpdateMusteriDto dto);
    Task                          DeleteAsync(int id);
    Task<IEnumerable<UlkeDto>>    GetUlkelerAsync();
    Task<UlkeDto>                 CreateUlkeAsync(CreateUlkeDto dto);
}
