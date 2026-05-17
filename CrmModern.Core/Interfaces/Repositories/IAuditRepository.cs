using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IAuditRepository : IBaseRepository<AuditEntry>
{
    /// <summary>Tek shot INSERT — UoW.SaveChanges'ı çağırmadan persist eder.</summary>
    Task AddLogAsync(AuditEntry entry);

    /// <summary>Son N audit kaydı, filtre opsiyonel.</summary>
    Task<IReadOnlyList<AuditEntry>> SearchAsync(
        string? action,
        string? entityType,
        int?    kullaniciID,
        DateTime? baslangic,
        DateTime? bitis,
        int     limit);
}
