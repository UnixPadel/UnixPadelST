using CrmModern.Core.DTOs.Settings;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Tüm istemciler için ortak sistem ayarları. Yapay zekâ (Claude &amp; Gemini) API anahtarları veritabanında şifreli
/// tutulur; çağrıyı yalnız sunucu yapar, bu yüzden anahtar değişince TÜM bilgisayarlar
/// anında yeni anahtarı kullanır.
/// </summary>
public interface ISystemSettingsService
{
    // --- Gemini ---
    Task<GeminiKeyStatusDto> GetGeminiStatusAsync();
    Task SaveGeminiKeyAsync(string apiKey, int currentUserId);
    Task<string?> GetGeminiApiKeyAsync();
    Task RecordGeminiUsageAsync(bool success, string? error);

    // --- Claude ---
    Task<ClaudeKeyStatusDto> GetClaudeStatusAsync();
    Task SaveClaudeKeyAsync(string apiKey, string? model, int currentUserId);
    Task<string?> GetClaudeApiKeyAsync();
    Task<string> GetClaudeModelAsync();
    Task RecordClaudeUsageAsync(bool success, string? error);

    // --- Ortak AI Ayarları ---
    Task<string> GetActiveAiProviderAsync(); // "Claude" | "Gemini"
    Task SetActiveAiProviderAsync(string provider, int currentUserId);
    Task<AiSettingsOverviewDto> GetAiOverviewAsync();
}
