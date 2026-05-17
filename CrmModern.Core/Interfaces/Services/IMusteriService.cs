using CrmModern.Core.DTOs.Musteri;

namespace CrmModern.Core.Interfaces.Services;

public interface IMusteriService
{
    Task<IEnumerable<MusteriDto>> GetAllAsync();
    Task<MusteriDto>              GetByIdAsync(int id);
    Task<MusteriDto>              CreateAsync(CreateMusteriDto dto);
    Task<MusteriDto>              UpdateAsync(int id, UpdateMusteriDto dto);
    Task                          DeleteAsync(int id);
    Task<IEnumerable<UlkeDto>>    GetUlkelerAsync();
    Task<UlkeDto>                 CreateUlkeAsync(CreateUlkeDto dto);
}
