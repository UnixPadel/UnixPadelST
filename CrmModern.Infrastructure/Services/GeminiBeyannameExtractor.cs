using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CrmModern.Core;
using CrmModern.Core.DTOs.WarehouseStock;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Services;

internal sealed class GeminiBeyannameExtractor : IGeminiBeyannameExtractor
{
    private const string ApiUrl = "https://generativelanguage.googleapis.com/v1beta/interactions";
    private const string ModelName = "gemini-3.8-flash";

    private readonly HttpClient _http;
    private readonly ISystemSettingsService _settings;
    private readonly ILogger<GeminiBeyannameExtractor> _logger;

    public GeminiBeyannameExtractor(
        HttpClient http,
        ISystemSettingsService settings,
        ILogger<GeminiBeyannameExtractor> logger)
    {
        _http = http;
        _settings = settings;
        _logger = logger;
        _http.Timeout = TimeSpan.FromSeconds(75);
    }

    public async Task<BeyannameDraftDto> ExtractAsync(byte[] data, string mimeType, CancellationToken ct = default)
    {
        var apiKey = await _settings.GetGeminiApiKeyAsync();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            await _settings.RecordGeminiUsageAsync(false, "API anahtarı tanımlı değil.");
            throw new BusinessException(
                "Gemini API anahtarı tanımlı değil. Yönetim > Sistem Ayarları ekranından anahtarı kaydedebilirsiniz.",
                "geminiKeyMissing");
        }

        var normalizedMime = string.IsNullOrWhiteSpace(mimeType) ? "application/pdf" : mimeType.ToLowerInvariant();
        var inputType = normalizedMime.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ? "image" : "document";
        var b64Data = Convert.ToBase64String(data);

        var prompt =
            "Sen T.C. Gümrük Beyannamesi (TCGB) ve antrepo belgeleri konusunda uzman bir asistansın. " +
            "Ekteki gümrük beyannamesini veya antrepo belgesini dikkatle incele. " +
            "Varsa tüm sayfaları (devam formları dahil) analiz et. " +
            "Şu bilgileri JSON şemasına uygun olarak çıkar:\n" +
            "- beyanname_no: Kutu 40 tescil veya sağ üstteki beyanname numarası (örn. 16341200IM000001 veya 26341200AN000123).\n" +
            "- tescil_tarihi: Tescil tarihi (YYYY-MM-DD formatında).\n" +
            "- rejim_kodu: Kutu 1'deki rejim kodu (örn. AN, IM 4, 7100 vb.).\n" +
            "- gumruk_idaresi: Kutu A veya başlık gümrük müdürlüğü adı.\n" +
            "- gonderici: Kutu 2 gönderici/ihracatçı unvanı.\n" +
            "- alici: Kutu 8 alıcı firma unvanı.\n" +
            "- doviz: Kutu 22 para birimi (USD, EUR, TRY vb.).\n" +
            "- fatura_tutari: Kutu 22 toplam fatura bedeli (sayısal).\n" +
            "- kur: Kutu 23 döviz kuru (sayısal).\n" +
            "- kalem_sayisi: Kutu 5'teki toplam kalem sayısı.\n" +
            "- kalemler: Belgedeki her bir mal kalemi için:\n" +
            "  * kalem_no: Kutu 32 kalem no.\n" +
            "  * mal_adi: Eşyanın kısa, anlaşılır adı (örn: Cam 10 mm, Demir Profil 80x80, Deniz Suyu vb.). Kutu 31'deki ticari tanımın kısa özeti.\n" +
            "  * ticari_tanim: Kutu 31'de yazan tam ticari tanım metni.\n" +
            "  * miktar: Kutu 41 tamamlayıcı ölçü miktarı (doluysa), yoksa kutu 38 net kg veya kutu 31 kap adedi.\n" +
            "  * birim: Miktarın birimi (ADET, M2, KG, vb.). Büyük harf.\n" +
            "  * kap_adedi: Kutu 31 veya kutu 6'daki kap adedi (sayısal).\n" +
            "  * kap_cinsi: Kap cinsi (KAP, SANDIK, PAKET, RULO, BAĞ vb.).\n" +
            "  * gtip: Kutu 33 GTİP numarası.\n" +
            "  * mense_ulke: Kutu 34 menşe ülke kodu veya adı.\n" +
            "  * brut_kg: Kutu 35 brüt ağırlık (kg).\n" +
            "  * net_kg: Kutu 38 net ağırlık (kg).\n" +
            "  * kalem_fiyati: Kutu 42 kalem fiyatı (sayısal).\n";

        var schema = new JsonObject
        {
            ["type"] = "object",
            ["properties"] = new JsonObject
            {
                ["beyanname_no"] = new JsonObject { ["type"] = "string" },
                ["tescil_tarihi"] = new JsonObject { ["type"] = "string" },
                ["rejim_kodu"] = new JsonObject { ["type"] = "string" },
                ["gumruk_idaresi"] = new JsonObject { ["type"] = "string" },
                ["gonderici"] = new JsonObject { ["type"] = "string" },
                ["alici"] = new JsonObject { ["type"] = "string" },
                ["doviz"] = new JsonObject { ["type"] = "string" },
                ["fatura_tutari"] = new JsonObject { ["type"] = "number" },
                ["kur"] = new JsonObject { ["type"] = "number" },
                ["kalem_sayisi"] = new JsonObject { ["type"] = "integer" },
                ["kalemler"] = new JsonObject
                {
                    ["type"] = "array",
                    ["items"] = new JsonObject
                    {
                        ["type"] = "object",
                        ["properties"] = new JsonObject
                        {
                            ["kalem_no"] = new JsonObject { ["type"] = "integer" },
                            ["mal_adi"] = new JsonObject { ["type"] = "string" },
                            ["ticari_tanim"] = new JsonObject { ["type"] = "string" },
                            ["miktar"] = new JsonObject { ["type"] = "number" },
                            ["birim"] = new JsonObject { ["type"] = "string" },
                            ["kap_adedi"] = new JsonObject { ["type"] = "number" },
                            ["kap_cinsi"] = new JsonObject { ["type"] = "string" },
                            ["gtip"] = new JsonObject { ["type"] = "string" },
                            ["mense_ulke"] = new JsonObject { ["type"] = "string" },
                            ["brut_kg"] = new JsonObject { ["type"] = "number" },
                            ["net_kg"] = new JsonObject { ["type"] = "number" },
                            ["kalem_fiyati"] = new JsonObject { ["type"] = "number" }
                        },
                        ["required"] = new JsonArray { "mal_adi", "miktar", "birim" }
                    }
                }
            },
            ["required"] = new JsonArray { "kalemler" }
        };

        var requestBody = new JsonObject
        {
            ["model"] = ModelName,
            ["input"] = new JsonArray
            {
                new JsonObject
                {
                    ["type"] = inputType,
                    ["data"] = b64Data,
                    ["mime_type"] = normalizedMime
                },
                new JsonObject
                {
                    ["type"] = "text",
                    ["text"] = prompt
                }
            },
            ["response_format"] = new JsonObject
            {
                ["type"] = "text",
                ["mime_type"] = "application/json",
                ["schema"] = schema
            }
        };

        string jsonResponse;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl);
            request.Headers.Add("x-goog-api-key", apiKey);
            request.Content = new StringContent(requestBody.ToJsonString(), Encoding.UTF8, "application/json");

            using var response = await _http.SendAsync(request, ct);
            var content = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                var errCode = MapHttpError(response.StatusCode, content);
                var errMsg = $"Gemini API hatası ({response.StatusCode}): {ExtractApiErrorMessage(content)}";
                _logger.LogWarning("Gemini API call failed: {Status} - {Content}", response.StatusCode, content);
                await _settings.RecordGeminiUsageAsync(false, errMsg);
                throw new BusinessException(errMsg, errCode);
            }

            jsonResponse = content;
            await _settings.RecordGeminiUsageAsync(true, null);
        }
        catch (BusinessException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini API isteği sırasında ağ/bağlantı hatası oluştu.");
            await _settings.RecordGeminiUsageAsync(false, ex.Message);
            throw new BusinessException("Gemini API servisine ulaşılamadı. İnternet bağlantısını veya anahtarı kontrol edin.", "geminiFailed");
        }

        return ParseGeminiResponse(jsonResponse);
    }

    public async Task TestAsync(string? apiKey, CancellationToken ct = default)
    {
        var keyToTest = apiKey;
        if (string.IsNullOrWhiteSpace(keyToTest))
            keyToTest = await _settings.GetGeminiApiKeyAsync();

        if (string.IsNullOrWhiteSpace(keyToTest))
            throw new BusinessException("Test edilecek Gemini API anahtarı bulunamadı.", "geminiKeyMissing");

        var testBody = new JsonObject
        {
            ["model"] = ModelName,
            ["input"] = "ping"
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl);
        request.Headers.Add("x-goog-api-key", keyToTest);
        request.Content = new StringContent(testBody.ToJsonString(), Encoding.UTF8, "application/json");

        using var response = await _http.SendAsync(request, ct);
        var content = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            var code = MapHttpError(response.StatusCode, content);
            var msg = ExtractApiErrorMessage(content);
            throw new BusinessException($"Bağlantı testi başarısız: {msg}", code);
        }
    }

    private static string MapHttpError(HttpStatusCode status, string content)
    {
        if (status is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            return "geminiKeyInvalid";

        if (status == (HttpStatusCode)429)
            return "geminiQuota";

        if (content.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase) ||
            content.Contains("PERMISSION_DENIED", StringComparison.OrdinalIgnoreCase))
            return "geminiKeyInvalid";

        if (content.Contains("RESOURCE_EXHAUSTED", StringComparison.OrdinalIgnoreCase))
            return "geminiQuota";

        return "geminiFailed";
    }

    private static string ExtractApiErrorMessage(string json)
    {
        try
        {
            var node = JsonNode.Parse(json);
            var msg = node?["error"]?["message"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(msg)) return msg;
        }
        catch { }
        return "Bilinmeyen hata.";
    }

    private BeyannameDraftDto ParseGeminiResponse(string rawJson)
    {
        string? textContent = null;
        try
        {
            var root = JsonNode.Parse(rawJson);
            // Search in steps -> type == "model_output" -> content -> text
            var steps = root?["steps"]?.AsArray();
            if (steps != null)
            {
                foreach (var step in steps)
                {
                    if (step?["type"]?.GetValue<string>() == "model_output")
                    {
                        var contents = step["content"]?.AsArray();
                        if (contents != null)
                        {
                            foreach (var c in contents)
                            {
                                var text = c?["text"]?.GetValue<string>();
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    textContent = text;
                                    break;
                                }
                            }
                        }
                    }
                    if (textContent != null) break;
                }
            }

            // Fallback for outputs or direct text
            if (textContent == null)
            {
                var outputs = root?["outputs"]?.AsArray();
                if (outputs != null && outputs.Count > 0)
                {
                    textContent = outputs[0]?["text"]?.GetValue<string>();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini yanıt sarmalayıcısı parse edilemedi.");
            throw new BusinessException("Gemini yanıtı çözümlenemedi.", "geminiUnreadable");
        }

        if (string.IsNullOrWhiteSpace(textContent))
        {
            throw new BusinessException("Gemini çıktısı boş döndü.", "geminiUnreadable");
        }

        // Clean markdown backticks ```json ... ``` if model wrapped it
        var cleanJson = textContent.Trim();
        if (cleanJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            cleanJson = cleanJson[7..];
        else if (cleanJson.StartsWith("```"))
            cleanJson = cleanJson[3..];
        if (cleanJson.EndsWith("```"))
            cleanJson = cleanJson[..^3];
        cleanJson = cleanJson.Trim();

        JsonNode? docNode;
        try
        {
            docNode = JsonNode.Parse(cleanJson);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini JSON çıktısı parse edilemedi: {CleanJson}", cleanJson);
            throw new BusinessException("Beyanname verisi geçerli bir JSON olarak okunamadı.", "geminiUnreadable");
        }

        if (docNode == null)
            throw new BusinessException("Gemini çıktısı geçerli veri içermiyor.", "geminiUnreadable");

        return BeyannameDraftMapper.Map(docNode, cleanJson);
    }
}
