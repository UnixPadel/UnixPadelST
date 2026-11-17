namespace CrmModern.Core;

/// <summary>
/// Adı ve türü saklanmamış eski blob'lar (SiparisAlTablo.Ek / MuhasebeEk) için
/// ilk baytlardan (magic bytes) dosya türü tespiti. Bilinmeyen tür → ".bin".
/// </summary>
public static class FileSignature
{
    public static (string Uzanti, string Tip) Detect(ReadOnlySpan<byte> bas)
    {
        if (StartsWith(bas, "%PDF"u8))                       return (".pdf",  "application/pdf");
        if (StartsWith(bas, [0x50, 0x4B, 0x03, 0x04]))       return (".zip",  "application/zip");
        if (StartsWith(bas, "Rar!"u8))                       return (".rar",  "application/vnd.rar");
        if (StartsWith(bas, [0x89, 0x50, 0x4E, 0x47]))       return (".png",  "image/png");
        if (StartsWith(bas, [0xFF, 0xD8, 0xFF]))             return (".jpg",  "image/jpeg");
        if (StartsWith(bas, "GIF8"u8))                       return (".gif",  "image/gif");
        if (StartsWith(bas, [0x37, 0x7A, 0xBC, 0xAF]))       return (".7z",   "application/x-7z-compressed");
        return (".bin", "application/octet-stream");
    }

    private static bool StartsWith(ReadOnlySpan<byte> data, ReadOnlySpan<byte> prefix) =>
        data.Length >= prefix.Length && data[..prefix.Length].SequenceEqual(prefix);
}
