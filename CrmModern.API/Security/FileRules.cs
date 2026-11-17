using Microsoft.AspNetCore.StaticFiles;

namespace CrmModern.API.Security;

/// <summary>
/// Yüklenen ek dosyaların ortak kuralları (Satın alma eki + Muhasebe Klasörü):
/// izin verilen uzantılar, boyut sınırı ve uzantıdan içerik tipi.
/// 25 MB tek dosya — Kestrel'in 30 MB istek sınırının altında kalır; dosyalar
/// istemciden tek tek gönderilir.
/// </summary>
public static class FileRules
{
    public const long MaxBytes = 25L * 1024 * 1024;   // 25 MB

    public static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf",
        ".doc", ".docx", ".txt", ".xls", ".xlsx", ".csv", ".rtf", ".odt", ".zip", ".rar",
    };

    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    public static bool IsAllowed(string fileName)
    {
        var ext = Path.GetExtension(fileName);
        return !string.IsNullOrWhiteSpace(ext) && AllowedExtensions.Contains(ext);
    }

    /// <summary>
    /// İçerik tipi önce uzantıdan belirlenir (tarayıcının gönderdiği tip güvenilmez;
    /// önizleme doğru tipe bağlı). Bulunamazsa istemcinin tipi, o da yoksa octet-stream.
    /// </summary>
    public static string ContentTypeFor(string fileName, string? clientType) =>
        ContentTypes.TryGetContentType(fileName, out var t) ? t
        : string.IsNullOrWhiteSpace(clientType) ? "application/octet-stream" : clientType;
}
