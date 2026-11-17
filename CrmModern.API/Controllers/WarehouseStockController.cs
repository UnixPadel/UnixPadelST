using System.Security.Claims;
using System.Text.Json;
using CrmModern.API.Authorization;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.WarehouseStock;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/warehouse-stock")]
[Authorize]
public sealed class WarehouseStockController(IWarehouseStockService stockService) : ControllerBase
{
    private const string GlobalObserverUser = "elshan.rasulov";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    private string? CurrentUserName => User.FindFirstValue(ClaimTypes.Name);

    private bool IsManager => User.IsInRole("Yonetici") || User.IsSuperAdmin();

    private bool CanRead() =>
        User.IsInRole("Yonetici") || User.IsInRole("Lojistik") ||
        User.IsInRole("Gozlemci") || User.IsInRole("Muhasebe") ||
        CurrentUserName == GlobalObserverUser || User.IsSuperAdmin();

    [HttpGet("items")]
    [ProducesResponseType(typeof(ApiResponse<StockListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItems(
        [FromQuery] string? konum = null,
        [FromQuery] bool tamamlananlar = false,
        [FromQuery] string? q = null,
        [FromQuery] bool includeDeleted = false)   // 40+ ergonomi K5 — "Silinenleri göster"
    {
        if (!CanRead()) return Forbid();
        var result = await stockService.GetItemsAsync(konum, tamamlananlar, q, includeDeleted);
        return Ok(ApiResponse<StockListDto>.Ok(result));
    }

    [HttpGet("items/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<StockItemDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItemDetail(int id)
    {
        if (!CanRead()) return Forbid();
        var result = await stockService.GetItemDetailAsync(id, CurrentUserId, IsManager);
        return Ok(ApiResponse<StockItemDetailDto>.Ok(result));
    }

    [HttpPost("declarations/analyze")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<AnalyzeResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AnalyzeDeclaration(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.FailCode("fileEmpty", "Dosya seçilmedi.", null));

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        var mime = string.IsNullOrWhiteSpace(file.ContentType) ? "application/pdf" : file.ContentType;
        var result = await stockService.AnalyzeAsync(bytes, mime, ct);
        return Ok(ApiResponse<AnalyzeResultDto>.Ok(result));
    }

    [HttpPost("items")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<CreateStockResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateItem()
    {
        CreateStockRequest? request = null;
        byte[]? fileBytes = null;
        string? fileName = null;
        string? fileType = null;

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            var dataJson = form["data"].ToString();
            if (string.IsNullOrWhiteSpace(dataJson))
                return BadRequest(ApiResponse<object>.FailCode("validationFailed", "Form verisi eksik ('data').", null));

            request = JsonSerializer.Deserialize<CreateStockRequest>(dataJson, JsonOptions);

            var file = form.Files.GetFile("file");
            if (file != null && file.Length > 0)
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                fileBytes = ms.ToArray();
                fileName = Path.GetFileName(file.FileName);
                fileType = file.ContentType;
            }
        }
        else
        {
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<CreateStockRequest>(body, JsonOptions);
        }

        if (request == null)
            return BadRequest(ApiResponse<object>.FailCode("validationFailed", "İstek gövdesi okunamadı.", null));

        var result = await stockService.CreateAsync(request, fileBytes, fileName, fileType, CurrentUserId);
        return Ok(ApiResponse<CreateStockResultDto>.Ok(result, "Stok başarıyla kaydedildi."));
    }

    [HttpPut("items/{id:int}")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateStockItemRequest req)
    {
        await stockService.UpdateItemAsync(id, req, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Stok kalemi güncellendi."));
    }

    [HttpDelete("items/{id:int}")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteItem(int id)
    {
        await stockService.DeleteItemAsync(id, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Stok kalemi silindi."));
    }

    /// <summary>40+ ergonomi K5 — "Geri al / Geri yükle": yumuşak silinen kalemi geri getirir.</summary>
    [HttpPost("items/{id:int}/restore")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RestoreItem(int id)
    {
        await stockService.RestoreItemAsync(id, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Stok kalemi geri yüklendi."));
    }

    [HttpPost("items/{id:int}/exits")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddExit(int id, [FromBody] AddStockExitRequest req)
    {
        var exitId = await stockService.AddExitAsync(id, req, CurrentUserId);
        return Ok(ApiResponse<int>.Ok(exitId, "Çıkış işlemi kaydedildi."));
    }

    [HttpPost("exits/{id:int}/undo")]
    [Authorize(Roles = "Yonetici,Lojistik")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UndoExit(int id)
    {
        await stockService.UndoExitAsync(id, CurrentUserId, IsManager);
        return Ok(ApiResponse<object>.Ok(null!, "Çıkış işlemi geri alındı."));
    }

    [HttpGet("declarations/{id:int}/document")]
    public async Task<IActionResult> DownloadDocument(int id)
    {
        if (!CanRead()) return Forbid();
        var doc = await stockService.GetDocumentAsync(id);
        if (doc == null)
            return NotFound(ApiResponse<object>.FailCode("attachmentNotFound", "Belge bulunamadı.", null));

        return File(doc.Veri, doc.Tip, doc.Ad);
    }
}
