using CrmModern.Core.DTOs.WarehouseStock;
using CrmModern.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Aktif AI sağlayıcısına (Claude veya Gemini) göre isteği ilgili extractor servisine yönlendiren router.
/// </summary>
internal sealed class AiBeyannameExtractor : IBeyannameExtractor
{
    private readonly ISystemSettingsService _settings;
    private readonly IClaudeBeyannameExtractor _claude;
    private readonly IGeminiBeyannameExtractor _gemini;
    private readonly ILogger<AiBeyannameExtractor> _logger;

    public AiBeyannameExtractor(
        ISystemSettingsService settings,
        IClaudeBeyannameExtractor claude,
        IGeminiBeyannameExtractor gemini,
        ILogger<AiBeyannameExtractor> logger)
    {
        _settings = settings;
        _claude = claude;
        _gemini = gemini;
        _logger = logger;
    }

    public async Task<BeyannameDraftDto> ExtractAsync(byte[] data, string mimeType, CancellationToken ct = default)
    {
        var provider = await _settings.GetActiveAiProviderAsync();

        if (provider.Equals("Claude", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("Gümrük beyannamesi Claude AI motoruyla taranıyor.");
            return await _claude.ExtractAsync(data, mimeType, ct);
        }

        _logger.LogInformation("Gümrük beyannamesi Gemini AI motoruyla taranıyor.");
        return await _gemini.ExtractAsync(data, mimeType, ct);
    }

    public async Task TestAsync(string? apiKey, CancellationToken ct = default)
    {
        var provider = await _settings.GetActiveAiProviderAsync();

        if (provider.Equals("Claude", StringComparison.OrdinalIgnoreCase))
        {
            await _claude.TestAsync(apiKey, ct);
            return;
        }

        await _gemini.TestAsync(apiKey, ct);
    }
}
