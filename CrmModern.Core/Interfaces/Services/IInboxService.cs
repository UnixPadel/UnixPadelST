using CrmModern.Core.DTOs.Inbox;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>Bekleyen İşler özeti (Ana Sayfa paneli + menü rozeti).</summary>
public interface IInboxService
{
    Task<InboxSummaryDto> GetSummaryAsync(int userId, string? role, string? userName, bool superAdmin);
}
