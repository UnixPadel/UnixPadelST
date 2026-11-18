namespace CrmModern.Core.DTOs.Settings;

/// <summary>Gemini anahtarı durumu — anahtarın kendisi ASLA dönmez, yalnız maske.</summary>
public sealed record GeminiKeyStatusDto(
    bool      Tanimli,
    string?   Maske,                 // örn. "••••••••AB12"
    DateTime? GuncellemeZamani,
    string?   GuncelleyenAd,
    DateTime? SonBasariliKullanim,
    string?   SonHata,
    DateTime? SonHataZamani);

public sealed record SaveGeminiKeyRequest(string ApiKey);

/// <summary>Bağlantı testi; <c>ApiKey</c> verilmezse kayıtlı anahtar denenir.</summary>
public sealed record TestGeminiKeyRequest(string? ApiKey);

public sealed record GeminiTestResultDto(bool Basarili, string? HataKodu, string? HataMesaji, object? HataArgs = null);
