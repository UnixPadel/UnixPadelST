using CrmModern.Core.DTOs.WarehouseStock;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>Gümrük beyannamesi belgesinden (PDF / taranmış PDF / fotoğraf) alan çıkarır.</summary>
public interface IBeyannameExtractor
{
    /// <summary>
    /// Belgeyi okur. Başarısızlıkta <c>BusinessException</c> fırlatır; kod <c>gemini*</c> ile başlar
    /// (geminiKeyMissing, geminiKeyInvalid, geminiQuota, geminiFailed, geminiUnreadable).
    /// </summary>
    Task<BeyannameDraftDto> ExtractAsync(byte[] data, string mimeType, CancellationToken ct = default);

    /// <summary>Anahtarı küçük bir istekle dener. <paramref name="apiKey"/> null ise kayıtlı anahtar kullanılır.</summary>
    Task TestAsync(string? apiKey, CancellationToken ct = default);
}
