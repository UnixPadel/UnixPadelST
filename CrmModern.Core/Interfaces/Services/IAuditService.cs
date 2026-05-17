using CrmModern.Core.DTOs.Audit;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Faz 8 — Genel audit log. EklemeGecmisi tablosu üzerine kuruludur.
/// Servisler kritik aksiyonlardan sonra `LogAsync` çağırır; UoW.SaveChanges'a bağımlı değildir
/// (kendi içinde SaveChanges yapar).
/// </summary>
public interface IAuditService
{
    Task LogAsync(string action, string entityType, string? entityId,
                  int? kullaniciID, string? details = null);

    Task<IReadOnlyList<AuditEntryDto>> SearchAsync(
        string? action, string? entityType, int? kullaniciID,
        DateTime? baslangic, DateTime? bitis, int limit = 200);
}
