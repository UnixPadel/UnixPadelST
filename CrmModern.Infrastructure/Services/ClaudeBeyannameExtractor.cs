using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CrmModern.Core.DTOs.WarehouseStock;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Services;

internal sealed class ClaudeBeyannameExtractor : IClaudeBeyannameExtractor
{
    private const string ApiUrl = "https://api.anthropic.com/v1/messages";
    private const string AnthropicVersion = "2023-06-01";
    private const string PdfBetaHeader = "pdfs-2024-09-25";

    private readonly HttpClient _http;
    private readonly ISystemSettingsService _settings;
    private readonly ILogger<ClaudeBeyannameExtractor> _logger;

    public ClaudeBeyannameExtractor(
        HttpClient http,
        ISystemSettingsService settings,
        ILogger<ClaudeBeyannameExtractor> logger)
    {
        _http = http;
        _settings = settings;
        _logger = logger;
        _http.Timeout = TimeSpan.FromSeconds(90);
    }

    public async Task<BeyannameDraftDto> ExtractAsync(byte[] data, string mimeType, CancellationToken ct = default)
    {
        var apiKey = await _settings.GetClaudeApiKeyAsync();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            await _settings.RecordClaudeUsageAsync(false, "Claude API anahtarı tanımlı değil.");
            throw new BusinessException(
                "Claude API anahtarı tanımlı değil. Yönetim > Sistem Ayarları ekranından anahtarı kaydedebilirsiniz.",
                "claudeKeyMissing");
        }

        var model = await _settings.GetClaudeModelAsync();
        var normalizedMime = string.IsNullOrWhiteSpace(mimeType) ? "application/pdf" : mimeType.ToLowerInvariant();
        bool isPdf = normalizedMime.Equals("application/pdf", StringComparison.OrdinalIgnoreCase);
        var b64Data = Convert.ToBase64String(data);

        // Content bloğu (PDF ise 'document', resim ise 'image')
        JsonObject mediaBlock;
        if (isPdf)
        {
            mediaBlock = new JsonObject
            {
                ["type"] = "document",
                ["source"] = new JsonObject
                {
                    ["type"] = "base64",
                    ["media_type"] = "application/pdf",
                    ["data"] = b64Data
                }
            };
        }
        else
        {
            mediaBlock = new JsonObject
            {
                ["type"] = "image",
                ["source"] = new JsonObject
                {
                    ["type"] = "base64",
                    ["media_type"] = normalizedMime,
                    ["data"] = b64Data
                }
            };
        }

        var promptText =
            "Sen T.C. Gümrük Beyannamesi (TCGB) ve antrepo belgeleri konusunda uzman bir asistansın. " +
            "Ekteki belgeyi dikkatle incele. Varsa tüm sayfaları analiz et. " +
            "Kutu 40 tescil veya sağ üstteki beyanname numarasını, tescil tarihini (YYYY-MM-DD), kutu 1 rejim kodunu (örn AN, IM 4), " +
            "kutu A veya başlık gümrük idaresini, kutu 2 göndericiyi, kutu 8 alıcıyı, kutu 22 fatura tutarı ve dövizini, " +
            "kutu 23 kuru ve kutu 31/32/33/38/41'deki tüm mal kalemlerini 'gumruk_beyannamesi_cikar' aracını çağırarak çıkar. " +
            "Miktar için kutu 41 tamamlayıcı ölçü miktarını, yoksa net kg'ı al. Birimi büyük harf (ADET, KG, M2 vb.) yap. " +
            "Mal adı için eşyanın kısa ve anlaşılır adını (örn. Cam 10 mm, Demir Profil 80x80) belirle.";

        var toolSchema = new JsonObject
        {
            ["type"] = "object",
            ["properties"] = new JsonObject
            {
                ["beyanname_no"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 40 tescil veya sağ üstteki beyanname no (örn. 16341200IM000001 veya 26341200AN000123)" },
                ["tescil_tarihi"] = new JsonObject { ["type"] = "string", ["description"] = "Tescil tarihi (YYYY-MM-DD)" },
                ["rejim_kodu"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 1'deki rejim kodu (örn. AN, IM 4)" },
                ["gumruk_idaresi"] = new JsonObject { ["type"] = "string", ["description"] = "Gümrük müdürlüğü adı" },
                ["gonderici"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 2 gönderici unvanı" },
                ["alici"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 8 alıcı unvanı" },
                ["doviz"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 22 para birimi (USD, EUR, TRY vb.)" },
                ["fatura_tutari"] = new JsonObject { ["type"] = "number", ["description"] = "Kutu 22 toplam fatura bedeli" },
                ["kur"] = new JsonObject { ["type"] = "number", ["description"] = "Kutu 23 döviz kuru" },
                ["kalem_sayisi"] = new JsonObject { ["type"] = "integer", ["description"] = "Kutu 5 toplam kalem sayısı" },
                ["kalemler"] = new JsonObject
                {
                    ["type"] = "array",
                    ["items"] = new JsonObject
                    {
                        ["type"] = "object",
                        ["properties"] = new JsonObject
                        {
                            ["kalem_no"] = new JsonObject { ["type"] = "integer" },
                            ["mal_adi"] = new JsonObject { ["type"] = "string", ["description"] = "Eşyanın kısa, anlaşılır adı (örn: Cam 10 mm)" },
                            ["ticari_tanim"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 31 detaylı ticari tanım" },
                            ["miktar"] = new JsonObject { ["type"] = "number", ["description"] = "Kutu 41 tamamlayıcı miktar veya net kg" },
                            ["birim"] = new JsonObject { ["type"] = "string", ["description"] = "Ölçü birimi (ADET, KG, M2 vb.)" },
                            ["kap_adedi"] = new JsonObject { ["type"] = "number", ["description"] = "Kutu 31 veya kutu 6 kap adedi" },
                            ["kap_cinsi"] = new JsonObject { ["type"] = "string", ["description"] = "Kap cinsi (KAP, SANDIK, BAĞ vb.)" },
                            ["gtip"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 33 GTİP numarası" },
                            ["mense_ulke"] = new JsonObject { ["type"] = "string", ["description"] = "Kutu 34 menşe ülke" },
                            ["brut_kg"] = new JsonObject { ["type"] = "number", ["description"] = "Kutu 35 brüt kg" },
                            ["net_kg"] = new JsonObject { ["type"] = "number", ["description"] = "Kutu 38 net kg" },
                            ["kalem_fiyati"] = new JsonObject { ["type"] = "number", ["description"] = "Kutu 42 kalem fiyatı" }
                        },
                        ["required"] = new JsonArray { "mal_adi", "miktar", "birim" }
                    }
                }
            },
            ["required"] = new JsonArray { "kalemler" }
        };

        var requestBody = new JsonObject
        {
            ["model"] = model,
            ["max_tokens"] = 3000,
            ["tools"] = new JsonArray
            {
                new JsonObject
                {
                    ["name"] = "gumruk_beyannamesi_cikar",
                    ["description"] = "Gümrük beyannamesinden çıkarılan resmi veriler",
                    ["input_schema"] = toolSchema
                }
            },
            ["tool_choice"] = new JsonObject
            {
                ["type"] = "auto"
            },
            ["messages"] = new JsonArray
            {
                new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = new JsonArray
                    {
                        mediaBlock,
                        new JsonObject
                        {
                            ["type"] = "text",
                            ["text"] = promptText
                        }
                    }
                }
            }
        };

        string jsonResponse;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl);
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", AnthropicVersion);
            if (isPdf)
            {
                request.Headers.Add("anthropic-beta", PdfBetaHeader);
            }
            request.Content = new StringContent(requestBody.ToJsonString(), Encoding.UTF8, "application/json");

            using var response = await _http.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                var (errCode, errMsg) = MapAnthropicError(response.StatusCode, content);
                _logger.LogWarning("Claude API call failed: {Status} - {Content}", response.StatusCode, content);
                await _settings.RecordClaudeUsageAsync(false, errMsg);
                throw new BusinessException(errMsg, errCode);
            }

            jsonResponse = content;
            await _settings.RecordClaudeUsageAsync(true, null);
        }
        catch (BusinessException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API isteği sırasında ağ/bağlantı hatası oluştu.");
            await _settings.RecordClaudeUsageAsync(false, ex.Message);
            throw new BusinessException("Claude API servisine ulaşılamadı. İnternet bağlantısını veya anahtarı kontrol edin.", "claudeFailed");
        }

        return ParseClaudeResponse(jsonResponse);
    }

    public async Task TestAsync(string? apiKey, CancellationToken ct = default)
    {
        await TestInternalAsync(apiKey, null, ct);
    }

    public async Task TestInternalAsync(string? apiKey, string? model, CancellationToken ct = default)
    {
        var keyToTest = apiKey;
        if (string.IsNullOrWhiteSpace(keyToTest))
            keyToTest = await _settings.GetClaudeApiKeyAsync();

        if (string.IsNullOrWhiteSpace(keyToTest))
            throw new BusinessException("Test edilecek Claude API anahtarı bulunamadı.", "claudeKeyMissing");

        var modelToTest = string.IsNullOrWhiteSpace(model)
            ? await _settings.GetClaudeModelAsync()
            : model.Trim();

        var testBody = new JsonObject
        {
            ["model"] = modelToTest,
            ["max_tokens"] = 5,
            ["messages"] = new JsonArray
            {
                new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = "ping"
                }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl);
        request.Headers.Add("x-api-key", keyToTest);
        request.Headers.Add("anthropic-version", AnthropicVersion);
        request.Content = new StringContent(testBody.ToJsonString(), Encoding.UTF8, "application/json");

        using var response = await _http.SendAsync(request, ct);
        var content = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            var (errCode, errMsg) = MapAnthropicError(response.StatusCode, content);
            throw new BusinessException($"Claude API testi başarısız: {errMsg}", errCode);
        }
    }

    private static (string Code, string Message) MapAnthropicError(HttpStatusCode status, string responseJson)
    {
        string? apiMessage = null;
        try
        {
            var node = JsonNode.Parse(responseJson);
            apiMessage = node?["error"]?["message"]?.GetValue<string>();
        }
        catch { }

        var detail = string.IsNullOrWhiteSpace(apiMessage) ? string.Empty : $" ({apiMessage})";

        return status switch
        {
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden =>
                ("claudeKeyInvalid", $"Claude API anahtarı geçersiz veya yetkisiz{detail}. Lütfen doğru anahtarı girdiğinizden emin olun."),
            HttpStatusCode.TooManyRequests =>
                ("claudeQuota", $"Claude API kullanım limiti veya bakiyesi yetersiz{detail}. Lütfen Anthropic konsolundan bakiyenizi kontrol edin."),
            (HttpStatusCode)529 =>
                ("claudeOverloaded", $"Anthropic sunucuları geçici olarak aşırı yüklü (529 Overloaded){detail}. Lütfen birkaç saniye sonra tekrar deneyin."),
            HttpStatusCode.BadRequest =>
                ("claudeBadRequest", $"Claude API geçersiz istek bildirdi{detail}."),
            _ =>
                ("claudeFailed", $"Claude API hatası ({status}){detail}.")
        };
    }

    private BeyannameDraftDto ParseClaudeResponse(string rawJson)
    {
        JsonNode? root;
        try
        {
            root = JsonNode.Parse(rawJson);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API yanıtı JSON olarak çözümlenemedi: {RawJson}", rawJson);
            throw new BusinessException("Claude API yanıtı çözümlenemedi.", "claudeUnreadable");
        }

        // Tool Use bloğunu bul: content[type == "tool_use" && name == "gumruk_beyannamesi_cikar"]
        var contentArray = root?["content"]?.AsArray();
        JsonObject? inputObj = null;

        if (contentArray != null)
        {
            foreach (var item in contentArray)
            {
                if (item?["type"]?.GetValue<string>() == "tool_use" &&
                    item?["name"]?.GetValue<string>() == "gumruk_beyannamesi_cikar")
                {
                    inputObj = item["input"]?.AsObject();
                    break;
                }
            }

            // Fallback: Tool_use yerine text içinde JSON döndüyse
            if (inputObj == null)
            {
                foreach (var item in contentArray)
                {
                    if (item?["type"]?.GetValue<string>() == "text")
                    {
                        var text = item["text"]?.GetValue<string>();
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            var clean = text.Trim();
                            if (clean.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
                                clean = clean[7..];
                            else if (clean.StartsWith("```"))
                                clean = clean[3..];
                            if (clean.EndsWith("```"))
                                clean = clean[..^3];
                            clean = clean.Trim();
                            try
                            {
                                if (JsonNode.Parse(clean) is JsonObject jo)
                                {
                                    inputObj = jo;
                                    break;
                                }
                            }
                            catch { }
                        }
                    }
                }
            }
        }

        if (inputObj == null)
        {
            _logger.LogWarning("Claude API yanıtında 'gumruk_beyannamesi_cikar' tool_use bloğu bulunamadı: {RawJson}", rawJson);
            throw new BusinessException("Belge verileri Claude tarafından okunamadı. Lütfen belgenin okunaklı olduğundan emin olun.", "claudeUnreadable");
        }

        return BeyannameDraftMapper.Map(inputObj, rawJson);
    }
}
