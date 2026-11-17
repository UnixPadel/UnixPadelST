using CrmModern.Core.DTOs.Musteri;

namespace CrmModern.Core.Interfaces.Services;

public interface IMusteriService
{
    /// <summary>
    /// PROMPT-v2 §7: <paramref name="currentUserId"/> + <paramref name="role"/>
    /// rol bazlı filtreleme için. Temsilci yalnız CreatedByKullaniciID = kendi
    /// id'si olan kayıtları görür; diğer roller tüm kayıtları alır.
    /// 40+ ergonomi K5 — includeDeleted=true: yumuşak silinen müşteriler de (silindi=true) döner.
    /// </summary>
    Task<IEnumerable<MusteriDto>> GetAllAsync(int currentUserId, string role, bool includeDeleted = false);
    Task<MusteriDto>              GetByIdAsync(int id);
    /// <summary>
    /// PROMPT-v2 §7: Yaratıcı kullanıcı id'si CreatedByKullaniciID kolonuna yazılır.
    /// </summary>
    Task<MusteriDto>              CreateAsync(CreateMusteriDto dto, int currentUserId);
    Task<MusteriDto>              UpdateAsync(int id, UpdateMusteriDto dto);
    /// <summary>40+ ergonomi K5 — yumuşak silme (Silindi bayrağı).</summary>
    Task                          DeleteAsync(int id, int silenKullaniciId);
    /// <summary>Yumuşak silinen müşteriyi geri yükler (silinmemişse customerNotDeleted).</summary>
    Task                          RestoreAsync(int id, int geriYukleyenKullaniciId);
    Task<IEnumerable<UlkeDto>>    GetUlkelerAsync();
    Task<UlkeDto>                 CreateUlkeAsync(CreateUlkeDto dto);
}
