namespace CrmModern.Core.DTOs.Inbox;

/// <summary>Tek kuyruğun özeti. <c>Error</c> = kaynak liste yüklenemedi ("iş yok" ile karıştırılmasın).</summary>
public sealed record InboxQueueSummaryDto(
    string    QueueId,
    int       Count,
    DateTime? OldestSince,
    bool      Error = false);

/// <summary>GET /api/inbox/summary — kullanıcıya düşen kuyruklar (sabit iş akışı sırası).</summary>
public sealed record InboxSummaryDto(
    IReadOnlyList<InboxQueueSummaryDto> Queues,
    int Total);
