using System.Security.Claims;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public sealed class OrderController(
    IOrderService orderService,
    IReportingService reportingService) : ControllerBase
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    // ─────────────────────────────────────────────────────────────────────────
    // List
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns orders matching the multi-filter query (Fabrika.cs çoklu filtre portu).
    /// All filter fields optional; pagination via page/pageSize.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<OrderListPageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders([FromQuery] OrderFilterDto filter)
    {
        var result = await orderService.GetOrdersAsync(filter);
        return Ok(ApiResponse<OrderListPageDto>.Ok(result));
    }

    /// <summary>Authenticated user's own orders/quotes (Siparislerim portu).</summary>
    /// <remarks>Paket 2 — opsiyonel `asama` query param: SiparisMiTeklifMi enum değeri.</remarks>
    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<OrderListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyOrders([FromQuery] string? asama = null)
    {
        var result = await orderService.GetMyOrdersAsync(CurrentUserId, asama);
        return Ok(ApiResponse<IReadOnlyList<OrderListDto>>.Ok(result));
    }

    /// <summary>Filtre + döviz toplamı (Euro/Dolar/TL/Sterlin) Fabrika ekran kartları.</summary>
    [HttpGet("totals")]
    [ProducesResponseType(typeof(ApiResponse<OrderTotalsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTotals([FromQuery] OrderFilterDto filter)
    {
        var result = await orderService.GetTotalsByCurrencyAsync(filter);
        return Ok(ApiResponse<OrderTotalsDto>.Ok(result));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Single record
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns a fully-populated order or quote by number.
    /// Accepts both S-prefixed SiparisNo and T-prefixed TeklifNo.
    /// </summary>
    [HttpGet("{no}")]
    [ProducesResponseType(typeof(ApiResponse<OrderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByNo(string no)
    {
        var result = await orderService.GetByNoAsync(no);
        return Ok(ApiResponse<OrderDetailDto>.Ok(result));
    }

    /// <summary>Sipariş onay/red audit log (SiparisOnaylari).</summary>
    [HttpGet("{no}/approvals")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<OrderApprovalDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetApprovals(string no)
    {
        var result = await orderService.GetApprovalHistoryAsync(no);
        return Ok(ApiResponse<IReadOnlyList<OrderApprovalDto>>.Ok(result));
    }

    /// <summary>UrunMaliyetTablo'dan sipariş başına maliyet özeti.</summary>
    [HttpGet("{no}/material-cost")]
    [Authorize(Roles = "Yonetici,Muhasebe,Fabrika")]
    [ProducesResponseType(typeof(ApiResponse<MaterialCostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMaterialCost(string no)
    {
        var result = await orderService.ComputeMaterialCostAsync(no);
        return Ok(ApiResponse<MaterialCostDto>.Ok(result));
    }

    /// <summary>
    /// Returns the rejection note (SiparisAlTablo.Red) for an order in Reddet status.
    /// Maps to the WinForms NotButton click.
    /// </summary>
    [HttpGet("{no}/rejection-note")]
    [ProducesResponseType(typeof(ApiResponse<RejectionNoteDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRejectionNote(string no)
    {
        var detail = await orderService.GetByNoAsync(no);
        // WinForms NotButton: SELECT Red FROM SiparisAlTablo WHERE SiparisNo = @SiparisNo
        return Ok(ApiResponse<RejectionNoteDto>.Ok(
            new RejectionNoteDto(detail.Kontrol == "Reddet" ? (detail.Red ?? string.Empty) : string.Empty)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new quote (SiparisMiTeklifMi = 'Teklif').
    /// Maps to the WinForms teklifAlButonu_Click handler.
    /// Returns the generated TeklifNo.
    /// </summary>
    [HttpPost("quote")]
    [Authorize(Roles = "Yonetici,Temsilci,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateQuote([FromBody] CreateOrderDto dto)
    {
        var teklifNo = await orderService.CreateQuoteAsync(CurrentUserId, dto);
        return CreatedAtAction(nameof(GetByNo), new { no = teklifNo },
            ApiResponse<string>.Ok(teklifNo, "Teklif başarıyla oluşturuldu."));
    }

    /// <summary>
    /// Creates a new order (SiparisMiTeklifMi = 'Siparis').
    /// Maps to the WinForms siparisAlButon_Click handler.
    /// Returns the generated SiparisNo.
    /// </summary>
    [HttpPost("order")]
    [Authorize(Roles = "Yonetici,Temsilci,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        var siparisNo = await orderService.CreateOrderAsync(CurrentUserId, dto);
        return CreatedAtAction(nameof(GetByNo), new { no = siparisNo },
            ApiResponse<string>.Ok(siparisNo, "Sipariş başarıyla oluşturuldu."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Revise
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a revision of an existing order or quote.
    /// Appends "-1" on first revision; increments the suffix on subsequent ones.
    /// Maps to the WinForms revizeEtButton_Click handler.
    /// Returns the new SiparisNo or TeklifNo.
    /// </summary>
    // PROMPT.md #20: same role set as CreateOrder/CreateQuote — only roles
    // that can create orders should be able to revise them.
    [HttpPost("{eskiNo}/revise")]
    [Authorize(Roles = "Yonetici,Temsilci,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Revise(string eskiNo, [FromBody] CreateOrderDto dto)
    {
        var newNo = await orderService.ReviseAsync(CurrentUserId, eskiNo, dto);
        return Ok(ApiResponse<string>.Ok(newNo, "Revize başarıyla tamamlandı."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Status transitions
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Converts a quote to an order by setting SiparisMiTeklifMi = 'Siparis'.
    /// Maps to the WinForms SipariseCevirButton click.
    /// </summary>
    // PROMPT.md #20: same role set as CreateOrder/CreateQuote.
    [HttpPut("{teklifNo}/convert-to-order")]
    [Authorize(Roles = "Yonetici,Temsilci,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConvertToOrder(string teklifNo)
    {
        await orderService.ConvertToOrderAsync(teklifNo);
        return Ok(ApiResponse<object>.Ok(null!, "Teklif siparişe çevrildi."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Catalog helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns all product categories for the anaUrunComboBox dropdowns.
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ProductCategoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories()
    {
        var result = await orderService.GetCategoriesAsync();
        return Ok(ApiResponse<IReadOnlyList<ProductCategoryDto>>.Ok(result));
    }

    /// <summary>
    /// Returns components with their attribute options for the selected category.
    /// Maps to the WinForms anaUrunComboBox_SelectedIndexChanged query.
    /// </summary>
    [HttpGet("categories/{kategoriID:int}/components")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ComponentDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetComponents(int kategoriID)
    {
        var result = await orderService.GetComponentsByCategoryAsync(kategoriID);
        return Ok(ApiResponse<IReadOnlyList<ComponentDto>>.Ok(result));
    }

    /// <summary>
    /// Returns the delivery address book for the tTeslimAlanAdiTextBox autocomplete.
    /// </summary>
    [HttpGet("delivery-addresses")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<DeliveryAddressDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDeliveryAddresses()
    {
        var result = await orderService.GetDeliveryAddressesAsync();
        return Ok(ApiResponse<IReadOnlyList<DeliveryAddressDto>>.Ok(result));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Faz 3 — Yeni endpointler
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>FormGetir.cs portu: kaynak siparişten yeni sipariş klonlar (yeni numara, kontrol='Kontrol').</summary>
    [HttpPost("{sourceNo}/clone")]
    [Authorize(Roles = "Yonetici,Temsilci")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Clone(string sourceNo)
    {
        var newNo = await orderService.CloneFromExistingAsync(CurrentUserId, sourceNo);
        return Ok(ApiResponse<string>.Ok(newNo, "Sipariş klonlandı."));
    }

    [HttpPost("{no}/submit")]
    [Authorize(Roles = "Yonetici,Temsilci")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit(string no)
    {
        await orderService.SubmitForApprovalAsync(no, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Onaya gönderildi."));
    }

    [HttpPost("{no}/approve")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(string no, [FromBody] ApproveOrderDto? dto)
    {
        await orderService.ApproveOrderAsync(no, CurrentUserId, dto?.Aciklama);
        return Ok(ApiResponse<object>.Ok(null!, "Onaylandı."));
    }

    [HttpPost("{no}/reject")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(string no, [FromBody] RejectOrderDto dto)
    {
        await orderService.RejectOrderAsync(no, CurrentUserId, dto.Aciklama);
        return Ok(ApiResponse<object>.Ok(null!, "Reddedildi."));
    }

    /// <summary>SiparisForm "Reçeteden Aç": kategori BoM'unu siparişe ekler.</summary>
    [HttpPost("{no}/expand-recipe")]
    [Authorize(Roles = "Yonetici,Temsilci,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExpandRecipe(string no, [FromBody] ExpandRecipeRequest dto)
    {
        await orderService.ExpandRecipeAsync(no, dto.KategoriID, dto.Adet);
        return Ok(ApiResponse<object>.Ok(null!, "Reçete açıldı."));
    }

    /// <summary>Ek dosya yükle. type=ek (kullanıcı eki). MuhasebeEk Faz 5'te muhasebe modülünden.</summary>
    [HttpPost("{no}/attachments")]
    [Authorize(Roles = "Yonetici,Temsilci,Muhasebe,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadAttachment(string no, [FromQuery] string type, IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("Dosya boş."));

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        await orderService.UploadAttachmentAsync(no, type, ms.ToArray());
        return Ok(ApiResponse<object>.Ok(null!, "Ek yüklendi."));
    }

    /// <summary>Ek dosya indir. type=ek|muhasebeek</summary>
    [HttpGet("{no}/attachments/{type}")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadAttachment(string no, string type)
    {
        var data = await orderService.GetAttachmentAsync(no, type);
        if (data is null || data.Length == 0)
            return NotFound(ApiResponse<object>.Fail("Ek bulunamadı."));

        var filename = $"{type}_{no}.bin";
        return File(data, "application/octet-stream", filename);
    }

    /// <summary>
    /// Hotfix Proforma — UNIXPADEL PREFORMA BLANK.xlsx template'inden proforma üretir.
    /// ExcelIndir BLOB DB'de varsa (mevcut durum) WinForms SiparisForm.previewButton_Click /
    /// Form3.excelYaz_Click davranışıyla birebir placeholder substitution yapılır. Aksi
    /// halde hard-coded ClosedXML fallback'e düşülür.
    /// </summary>
    [HttpGet("{no}/excel")]
    [Authorize(Roles = "Yonetici,Fabrika,Muhasebe")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Excel(string no)
    {
        var bytes = await reportingService.ExportOrderProformaAsync(no);
        var fileName = $"Proforma_{no}_{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }
}
