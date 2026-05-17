using EntityAttribute = CrmModern.Core.Entities.Attribute;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IAttributeRepository : IBaseRepository<EntityAttribute>
{
    /// <summary>Bir bileşene bağlı tüm öznitelikleri OznitelikAdı'na göre sıralı döner.</summary>
    Task<IReadOnlyList<EntityAttribute>> GetByComponentAsync(int bilesenId);
}
