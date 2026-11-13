namespace CrmModern.Core.Interfaces.Services;

/// <summary>Anthropic Claude gümrük beyannamesi çıkarıcı servisi arayüzü.</summary>
public interface IClaudeBeyannameExtractor : IBeyannameExtractor
{
    Task TestInternalAsync(string? apiKey, string? model, CancellationToken ct = default);
}

