namespace CrmModern.Core.DTOs.Audit;

public sealed record AuditEntryDto(
    int       EklemeID,
    string?   Action,
    string?   EntityType,
    string?   EntityId,
    int?      KullaniciID,
    string?   Aciklama,
    string?   Details,
    DateTime? EklemeTarihi);
