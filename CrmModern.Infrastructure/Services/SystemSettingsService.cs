using System.Security.Cryptography;
using System.Text;
using CrmModern.Core.DTOs.Settings;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces.Services;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Services;

internal sealed class SystemSettingsService : ISystemSettingsService
{
    // Gemini
    private const string CacheKeyGemini = "sys_gemini_api_key";
    private const string SettingKeyGeminiApi = "Gemini:ApiKey";
    private const string SettingKeyGeminiSuccessAt = "Gemini:SonBasariliKullanim";
    private const string SettingKeyGeminiLastError = "Gemini:SonHata";
    private const string SettingKeyGeminiLastErrorAt = "Gemini:SonHataZamani";

    // Claude
    private const string CacheKeyClaude = "sys_claude_api_key";
    private const string SettingKeyClaudeApi = "Claude:ApiKey";
    private const string SettingKeyClaudeModel = "Claude:Model";
    private const string SettingKeyClaudeSuccessAt = "Claude:SonBasariliKullanim";
    private const string SettingKeyClaudeLastError = "Claude:SonHata";
    private const string SettingKeyClaudeLastErrorAt = "Claude:SonHataZamani";
    public const string DefaultClaudeModel = "claude-sonnet-5-5";

    // Ortak AI
    private const string SettingKeyActiveProvider = "AI:AktifSaglayici";

    private readonly AppDbContext _ctx;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly IAuditService _audit;
    private readonly ILogger<SystemSettingsService> _logger;
    private readonly byte[] _encryptionKey;

    public SystemSettingsService(
        AppDbContext ctx,
        IMemoryCache cache,
        IConfiguration config,
        IAuditService audit,
        ILogger<SystemSettingsService> logger)
    {
        _ctx = ctx;
        _cache = cache;
        _config = config;
        _audit = audit;
        _logger = logger;

        // Derive 32-byte AES key from Settings:EncryptionKey or JwtSettings:SecretKey
        var secret = _config["Settings:EncryptionKey"]
                     ?? _config["JwtSettings:SecretKey"]
                     ?? "UnixPadelST_Fallback_System_Secret_Key_2026!";
        _encryptionKey = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
    }

    public async Task<GeminiKeyStatusDto> GetGeminiStatusAsync()
    {
        var settings = await _ctx.SistemAyarlari
            .Where(s => s.Anahtar.StartsWith("Gemini:"))
            .ToListAsync();

        var apiRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyGeminiApi);
        var successRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyGeminiSuccessAt);
        var errorRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyGeminiLastError);
        var errorAtRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyGeminiLastErrorAt);

        bool tanimli = false;
        string? maske = null;
        string? guncelleyenAd = null;

        if (apiRow?.Deger != null)
        {
            var raw = Decrypt(apiRow.Deger);
            if (!string.IsNullOrWhiteSpace(raw))
            {
                tanimli = true;
                maske = MaskApiKey(raw);
            }

            if (apiRow.GuncelleyenKullaniciID.HasValue)
            {
                var user = await _ctx.KullaniciBilgileri
                    .Where(u => u.KullaniciID == apiRow.GuncelleyenKullaniciID.Value)
                    .Select(u => (u.Ad + " " + u.Soyad).Trim())
                    .FirstOrDefaultAsync();
                guncelleyenAd = string.IsNullOrWhiteSpace(user) ? null : user;
            }
        }

        DateTime? sonBasarili = null;
        if (successRow?.Deger != null && DateTime.TryParse(successRow.Deger, out var sb))
            sonBasarili = sb;

        DateTime? sonHataZamani = null;
        if (errorAtRow?.Deger != null && DateTime.TryParse(errorAtRow.Deger, out var she))
            sonHataZamani = she;

        return new GeminiKeyStatusDto(
            Tanimli: tanimli,
            Maske: maske,
            GuncellemeZamani: apiRow?.GuncellemeZamani,
            GuncelleyenAd: guncelleyenAd,
            SonBasariliKullanim: sonBasarili,
            SonHata: errorRow?.Deger,
            SonHataZamani: sonHataZamani);
    }

    public async Task SaveGeminiKeyAsync(string apiKey, int currentUserId)
    {
        var trimmed = (apiKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new BusinessException("Gemini API anahtarı boş olamaz.", "geminiKeyEmpty");

        var encrypted = Encrypt(trimmed);
        var now = DateTime.Now;

        var row = await _ctx.SistemAyarlari.FindAsync(SettingKeyGeminiApi);
        if (row == null)
        {
            _ctx.SistemAyarlari.Add(new SistemAyari
            {
                Anahtar = SettingKeyGeminiApi,
                Deger = encrypted,
                GuncelleyenKullaniciID = currentUserId,
                GuncellemeZamani = now
            });
        }
        else
        {
            row.Deger = encrypted;
            row.GuncelleyenKullaniciID = currentUserId;
            row.GuncellemeZamani = now;
        }

        // Temizle error kaydını
        var errRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyGeminiLastError);
        if (errRow != null) _ctx.SistemAyarlari.Remove(errRow);
        var errAtRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyGeminiLastErrorAt);
        if (errAtRow != null) _ctx.SistemAyarlari.Remove(errAtRow);

        await _ctx.SaveChangesAsync();
        _cache.Set(CacheKeyGemini, trimmed, TimeSpan.FromMinutes(30));

        await _audit.LogAsync("GeminiKeyUpdate", "SistemAyari", SettingKeyGeminiApi, currentUserId,
            $"Gemini API anahtarı güncellendi ({MaskApiKey(trimmed)})");
    }

    public async Task<string?> GetGeminiApiKeyAsync()
    {
        if (_cache.TryGetValue(CacheKeyGemini, out string? cached) && !string.IsNullOrEmpty(cached))
            return cached;

        var row = await _ctx.SistemAyarlari.FindAsync(SettingKeyGeminiApi);
        if (row?.Deger == null) return null;

        var decrypted = Decrypt(row.Deger);
        if (!string.IsNullOrEmpty(decrypted))
        {
            _cache.Set(CacheKeyGemini, decrypted, TimeSpan.FromMinutes(30));
            return decrypted;
        }

        return null;
    }

    public async Task RecordGeminiUsageAsync(bool success, string? error)
    {
        try
        {
            var now = DateTime.Now;
            if (success)
            {
                await UpsertSettingAsync(SettingKeyGeminiSuccessAt, now.ToString("o"), now);
                var errRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyGeminiLastError);
                if (errRow != null) _ctx.SistemAyarlari.Remove(errRow);
                var errAtRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyGeminiLastErrorAt);
                if (errAtRow != null) _ctx.SistemAyarlari.Remove(errAtRow);
            }
            else
            {
                await UpsertSettingAsync(SettingKeyGeminiLastError, error ?? "Bilinmeyen hata", now);
                await UpsertSettingAsync(SettingKeyGeminiLastErrorAt, now.ToString("o"), now);
            }
            await _ctx.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini kullanım durumu güncellenemedi.");
        }
    }

    // --- Claude Metotları ---

    public async Task<ClaudeKeyStatusDto> GetClaudeStatusAsync()
    {
        var settings = await _ctx.SistemAyarlari
            .Where(s => s.Anahtar.StartsWith("Claude:"))
            .ToListAsync();

        var apiRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyClaudeApi);
        var modelRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyClaudeModel);
        var successRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyClaudeSuccessAt);
        var errorRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyClaudeLastError);
        var errorAtRow = settings.FirstOrDefault(s => s.Anahtar == SettingKeyClaudeLastErrorAt);

        bool tanimli = false;
        string? maske = null;
        string? guncelleyenAd = null;

        if (apiRow?.Deger != null)
        {
            var raw = Decrypt(apiRow.Deger);
            if (!string.IsNullOrWhiteSpace(raw))
            {
                tanimli = true;
                maske = MaskApiKey(raw);
            }

            if (apiRow.GuncelleyenKullaniciID.HasValue)
            {
                var user = await _ctx.KullaniciBilgileri
                    .Where(u => u.KullaniciID == apiRow.GuncelleyenKullaniciID.Value)
                    .Select(u => (u.Ad + " " + u.Soyad).Trim())
                    .FirstOrDefaultAsync();
                guncelleyenAd = string.IsNullOrWhiteSpace(user) ? null : user;
            }
        }

        var model = modelRow?.Deger ?? DefaultClaudeModel;

        DateTime? sonBasarili = null;
        if (successRow?.Deger != null && DateTime.TryParse(successRow.Deger, out var sb))
            sonBasarili = sb;

        DateTime? sonHataZamani = null;
        if (errorAtRow?.Deger != null && DateTime.TryParse(errorAtRow.Deger, out var she))
            sonHataZamani = she;

        return new ClaudeKeyStatusDto(
            Tanimli: tanimli,
            Maske: maske,
            Model: model,
            GuncellemeZamani: apiRow?.GuncellemeZamani,
            GuncelleyenAd: guncelleyenAd,
            SonBasariliKullanim: sonBasarili,
            SonHata: errorRow?.Deger,
            SonHataZamani: sonHataZamani);
    }

    public async Task SaveClaudeKeyAsync(string apiKey, string? model, int currentUserId)
    {
        var trimmedKey = (apiKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmedKey))
            throw new BusinessException("Claude API anahtarı boş olamaz.", "claudeKeyEmpty");

        var modelToSave = string.IsNullOrWhiteSpace(model) ? DefaultClaudeModel : model.Trim();
        var encrypted = Encrypt(trimmedKey);
        var now = DateTime.Now;

        // API Key upsert
        var row = await _ctx.SistemAyarlari.FindAsync(SettingKeyClaudeApi);
        if (row == null)
        {
            _ctx.SistemAyarlari.Add(new SistemAyari
            {
                Anahtar = SettingKeyClaudeApi,
                Deger = encrypted,
                GuncelleyenKullaniciID = currentUserId,
                GuncellemeZamani = now
            });
        }
        else
        {
            row.Deger = encrypted;
            row.GuncelleyenKullaniciID = currentUserId;
            row.GuncellemeZamani = now;
        }

        // Model upsert
        await UpsertSettingAsync(SettingKeyClaudeModel, modelToSave, now);

        // Hata kayıtlarını temizle
        var errRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyClaudeLastError);
        if (errRow != null) _ctx.SistemAyarlari.Remove(errRow);
        var errAtRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyClaudeLastErrorAt);
        if (errAtRow != null) _ctx.SistemAyarlari.Remove(errAtRow);

        // Claude kaydedildiğinde aktif sağlayıcıyı da Claude yap
        await UpsertSettingAsync(SettingKeyActiveProvider, "Claude", now);

        await _ctx.SaveChangesAsync();
        _cache.Set(CacheKeyClaude, trimmedKey, TimeSpan.FromMinutes(30));

        await _audit.LogAsync("ClaudeKeyUpdate", "SistemAyari", SettingKeyClaudeApi, currentUserId,
            $"Claude API anahtarı güncellendi ({MaskApiKey(trimmedKey)}), Model: {modelToSave}");
    }

    public async Task<string?> GetClaudeApiKeyAsync()
    {
        if (_cache.TryGetValue(CacheKeyClaude, out string? cached) && !string.IsNullOrEmpty(cached))
            return cached;

        var row = await _ctx.SistemAyarlari.FindAsync(SettingKeyClaudeApi);
        if (row?.Deger == null) return null;

        var decrypted = Decrypt(row.Deger);
        if (!string.IsNullOrEmpty(decrypted))
        {
            _cache.Set(CacheKeyClaude, decrypted, TimeSpan.FromMinutes(30));
            return decrypted;
        }

        return null;
    }

    public async Task<string> GetClaudeModelAsync()
    {
        var row = await _ctx.SistemAyarlari.FindAsync(SettingKeyClaudeModel);
        return string.IsNullOrWhiteSpace(row?.Deger) ? DefaultClaudeModel : row.Deger.Trim();
    }

    public async Task RecordClaudeUsageAsync(bool success, string? error)
    {
        try
        {
            var now = DateTime.Now;
            if (success)
            {
                await UpsertSettingAsync(SettingKeyClaudeSuccessAt, now.ToString("o"), now);
                var errRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyClaudeLastError);
                if (errRow != null) _ctx.SistemAyarlari.Remove(errRow);
                var errAtRow = await _ctx.SistemAyarlari.FindAsync(SettingKeyClaudeLastErrorAt);
                if (errAtRow != null) _ctx.SistemAyarlari.Remove(errAtRow);
            }
            else
            {
                await UpsertSettingAsync(SettingKeyClaudeLastError, error ?? "Bilinmeyen hata", now);
                await UpsertSettingAsync(SettingKeyClaudeLastErrorAt, now.ToString("o"), now);
            }
            await _ctx.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude kullanım durumu güncellenemedi.");
        }
    }

    // --- Ortak AI Ayarları ---

    public async Task<string> GetActiveAiProviderAsync()
    {
        var row = await _ctx.SistemAyarlari.FindAsync(SettingKeyActiveProvider);
        if (!string.IsNullOrWhiteSpace(row?.Deger))
            return row.Deger.Trim();

        // Otomatik algılama: Claude anahtarı varsa Claude, yoksa Gemini
        var claudeKey = await GetClaudeApiKeyAsync();
        if (!string.IsNullOrWhiteSpace(claudeKey))
            return "Claude";

        var geminiKey = await GetGeminiApiKeyAsync();
        if (!string.IsNullOrWhiteSpace(geminiKey))
            return "Gemini";

        return "Claude";
    }

    public async Task SetActiveAiProviderAsync(string provider, int currentUserId)
    {
        var p = (provider ?? string.Empty).Trim();
        if (!p.Equals("Claude", StringComparison.OrdinalIgnoreCase) &&
            !p.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Geçersiz AI sağlayıcısı. Yalnızca 'Claude' veya 'Gemini' seçilebilir.", "invalidAiProvider");
        }

        var normalized = p.Equals("Gemini", StringComparison.OrdinalIgnoreCase) ? "Gemini" : "Claude";
        var now = DateTime.Now;

        await UpsertSettingAsync(SettingKeyActiveProvider, normalized, now);
        await _ctx.SaveChangesAsync();

        await _audit.LogAsync("AiProviderUpdate", "SistemAyari", SettingKeyActiveProvider, currentUserId,
            $"Aktif Yapay Zekâ Sağlayıcısı '{normalized}' olarak değiştirildi.");
    }

    public async Task<AiSettingsOverviewDto> GetAiOverviewAsync()
    {
        var provider = await GetActiveAiProviderAsync();
        var claude = await GetClaudeStatusAsync();
        var gemini = await GetGeminiStatusAsync();

        return new AiSettingsOverviewDto(provider, claude, gemini);
    }

    private async Task UpsertSettingAsync(string key, string value, DateTime now)
    {
        var row = await _ctx.SistemAyarlari.FindAsync(key);
        if (row == null)
        {
            _ctx.SistemAyarlari.Add(new SistemAyari
            {
                Anahtar = key,
                Deger = value,
                GuncellemeZamani = now
            });
        }
        else
        {
            row.Deger = value;
            row.GuncellemeZamani = now;
        }
    }

    private string Encrypt(string plainText)
    {
        byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
        byte[] nonce = new byte[12];
        RandomNumberGenerator.Fill(nonce);

        byte[] tag = new byte[16];
        byte[] cipherBytes = new byte[plainBytes.Length];

        using var aesGcm = new AesGcm(_encryptionKey, 16);
        aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

        // Payload = nonce (12) + tag (16) + cipherBytes
        byte[] payload = new byte[nonce.Length + tag.Length + cipherBytes.Length];
        Buffer.BlockCopy(nonce, 0, payload, 0, nonce.Length);
        Buffer.BlockCopy(tag, 0, payload, nonce.Length, tag.Length);
        Buffer.BlockCopy(cipherBytes, 0, payload, nonce.Length + tag.Length, cipherBytes.Length);

        return Convert.ToBase64String(payload);
    }

    private string? Decrypt(string cipherBase64)
    {
        try
        {
            byte[] payload = Convert.FromBase64String(cipherBase64);
            if (payload.Length < 28) return null; // 12 nonce + 16 tag minimum

            byte[] nonce = new byte[12];
            byte[] tag = new byte[16];
            int cipherLen = payload.Length - 28;
            byte[] cipherBytes = new byte[cipherLen];

            Buffer.BlockCopy(payload, 0, nonce, 0, 12);
            Buffer.BlockCopy(payload, 12, tag, 0, 16);
            Buffer.BlockCopy(payload, 28, cipherBytes, 0, cipherLen);

            byte[] plainBytes = new byte[cipherLen];
            using var aesGcm = new AesGcm(_encryptionKey, 16);
            aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "API anahtarı çözülemedi (şifreleme anahtarı değişmiş olabilir).");
            return null;
        }
    }

    private static string MaskApiKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return string.Empty;
        if (key.Length <= 8) return "••••••••";
        var prefix = key.StartsWith("sk-ant-") ? "sk-ant-••••" : "••••••••";
        var last4 = key[^4..];
        return $"{prefix}{last4}";
    }
}
