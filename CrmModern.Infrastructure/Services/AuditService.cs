using CrmModern.Core.DTOs.Audit;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

internal sealed class AuditService(IUnitOfWork uow) : IAuditService
{
    public async Task LogAsync(string action, string entityType, string? entityId,
                                int? kullaniciID, string? details = null)
    {
        var entry = new AuditEntry
        {
            Action       = action,
            EntityType   = entityType,
            EntityId     = entityId,
            KullaniciID  = kullaniciID,
            Aciklama     = $"{action} {entityType}".Trim(),
            Details      = details,
            EklemeTarihi = DateTime.Now,
        };
        await uow.Audit.AddLogAsync(entry);
    }

    public async Task<IReadOnlyList<AuditEntryDto>> SearchAsync(
        string? action, string? entityType, int? kullaniciID,
        DateTime? baslangic, DateTime? bitis, int limit = 200)
    {
        var rows = await uow.Audit.SearchAsync(action, entityType, kullaniciID,
                                               baslangic, bitis, Math.Clamp(limit, 1, 1000));
        return rows.Select(a => new AuditEntryDto(
            a.EklemeID, a.Action, a.EntityType, a.EntityId,
            a.KullaniciID, a.Aciklama, a.Details, a.EklemeTarihi)).ToList();
    }
}
