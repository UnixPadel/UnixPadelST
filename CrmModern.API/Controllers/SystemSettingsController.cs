using System.Security.Claims;
using CrmModern.API.Authorization;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Settings;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public sealed class SystemSettingsController(
    ISystemSettingsService settingsService,
    IClaudeBeyannameExtractor claudeExtractor,
    IGeminiBeyannameExtractor geminiExtractor) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    private bool IsManager => User.IsInRole("Yonetici") || User.IsSuperAdmin();

    // ── Ortak AI Durumu ve Sağlayıcı Seçimi ─────────────────────────────

    [HttpGet("ai")]
    [ProducesResponseType(typeof(ApiResponse<AiSettingsOverviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAiOverview()
    {
        if (!IsManager) return Forbid();
        var overview = await settingsService.GetAiOverviewAsync();
        return Ok(ApiResponse<AiSettingsOverviewDto>.Ok(overview));
    }

    [HttpPut("ai/active-provider")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetActiveAiProvider([FromBody] SetActiveAiProviderRequest req)
    {
        if (!IsManager) return Forbid();
        await settingsService.SetActiveAiProviderAsync(req.Saglayici, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, $"Aktif yapay zekâ sağlayıcısı '{req.Saglayici}' olarak güncellendi."));
    }

    // ── Claude (Anthropic) Endpoint'leri ─────────────────────────────────

    [HttpGet("claude")]
    [ProducesResponseType(typeof(ApiResponse<ClaudeKeyStatusDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetClaudeStatus()
    {
        if (!IsManager) return Forbid();
        var status = await settingsService.GetClaudeStatusAsync();
        return Ok(ApiResponse<ClaudeKeyStatusDto>.Ok(status));
    }

    [HttpPut("claude")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveClaudeKey([FromBody] SaveClaudeKeyRequest req)
    {
        if (!IsManager) return Forbid();
        await settingsService.SaveClaudeKeyAsync(req.ApiKey, req.Model, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Claude API anahtarı ve modeli başarıyla güncellendi."));
    }

    [HttpPost("claude/test")]
    [ProducesResponseType(typeof(ApiResponse<ClaudeTestResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TestClaudeKey([FromBody] TestClaudeKeyRequest req, CancellationToken ct)
    {
        if (!IsManager) return Forbid();
        try
        {
            await claudeExtractor.TestInternalAsync(req.ApiKey, req.Model, ct);
            return Ok(ApiResponse<ClaudeTestResultDto>.Ok(
                new ClaudeTestResultDto(true, null, "Claude API bağlantısı başarılı! Model yanıt verdi.")));
        }
        catch (CrmModern.Core.Exceptions.BusinessException ex)
        {
            return Ok(ApiResponse<ClaudeTestResultDto>.Ok(
                new ClaudeTestResultDto(false, ex.Code, ex.Message, ex.Args)));
        }
        catch (Exception ex)
        {
            return Ok(ApiResponse<ClaudeTestResultDto>.Ok(
                new ClaudeTestResultDto(false, "claudeFailed", $"Bağlantı hatası: {ex.Message}")));
        }
    }

    // ── Gemini Endpoint'leri (Geriye Dönük Uyumluluk) ─────────────────────

    [HttpGet("gemini")]
    [ProducesResponseType(typeof(ApiResponse<GeminiKeyStatusDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGeminiStatus()
    {
        if (!IsManager) return Forbid();
        var status = await settingsService.GetGeminiStatusAsync();
        return Ok(ApiResponse<GeminiKeyStatusDto>.Ok(status));
    }

    [HttpPut("gemini")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveGeminiKey([FromBody] SaveGeminiKeyRequest req)
    {
        if (!IsManager) return Forbid();
        await settingsService.SaveGeminiKeyAsync(req.ApiKey, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Gemini API anahtarı başarıyla güncellendi."));
    }

    [HttpPost("gemini/test")]
    [ProducesResponseType(typeof(ApiResponse<GeminiTestResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TestGeminiKey([FromBody] TestGeminiKeyRequest req, CancellationToken ct)
    {
        if (!IsManager) return Forbid();
        try
        {
            await geminiExtractor.TestAsync(req.ApiKey, ct);
            return Ok(ApiResponse<GeminiTestResultDto>.Ok(
                new GeminiTestResultDto(true, null, "Gemini API bağlantısı başarılı! Model yanıt verdi.")));
        }
        catch (CrmModern.Core.Exceptions.BusinessException ex)
        {
            return Ok(ApiResponse<GeminiTestResultDto>.Ok(
                new GeminiTestResultDto(false, ex.Code, ex.Message, ex.Args)));
        }
        catch (Exception ex)
        {
            return Ok(ApiResponse<GeminiTestResultDto>.Ok(
                new GeminiTestResultDto(false, "geminiFailed", $"Bağlantı hatası: {ex.Message}")));
        }
    }
}
