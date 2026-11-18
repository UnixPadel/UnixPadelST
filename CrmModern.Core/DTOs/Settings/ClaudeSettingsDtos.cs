namespace CrmModern.Core.DTOs.Settings;

/// <summary>Claude anahtarı durumu — anahtarın kendisi ASLA dönmez, yalnız maske.</summary>
public sealed record ClaudeKeyStatusDto(
    bool      Tanimli,
    string?   Maske,                 // örn. "sk-ant-••••3gAA"
    string    Model,                 // örn. "claude-3-5-sonnet-20241022"
    DateTime? GuncellemeZamani,
    string?   GuncelleyenAd,
    DateTime? SonBasariliKullanim,
    string?   SonHata,
    DateTime? SonHataZamani);

public sealed record SaveClaudeKeyRequest(string ApiKey, string? Model = null);

public sealed record TestClaudeKeyRequest(string? ApiKey = null, string? Model = null);

public sealed record ClaudeTestResultDto(bool Basarili, string? HataKodu, string? HataMesaji, object? HataArgs = null);

/// <summary>Tüm AI sağlayıcılarının (Claude &amp; Gemini) merkezi durum özeti</summary>
public sealed record AiSettingsOverviewDto(
    string             AktifSaglayici,        // "Claude" | "Gemini"
    ClaudeKeyStatusDto Claude,
    GeminiKeyStatusDto Gemini);

public sealed record SetActiveAiProviderRequest(string Saglayici);

