using System.Security.Claims;
using CrmModern.API.Authorization;
using CrmModern.API.Security;
using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public sealed class OrderController(
    IOrderService orderService,
    IReportingService reportingService,
    IOrderFolderService folderService) : ControllerBase
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("KullaniciID claim missing."));

    private string CurrentUserName =>
        User.FindFirstValue(ClaimTypes.Name)
            ?? throw new InvalidOperationException("Kullanıcı adı claim eksik.");

    // PROMPT-v4 §1: elshan.rasulov Kontrol ekranının tek yetkilisi (approve/reject/
    // paid-amount/stage ve excel/material-cost). §24 — Admin de tam erişimlidir.
    private bool IsControlUser => User.IsOrderControlUser();

    // PROMPT-v3 §1 create-path Temsilci-only; istisna: elshan.rasulov.
    private bool CanCreateOrders =>
        User.IsInRole("Temsilci") || IsControlUser;

    private bool HidesMoney => User.HidesOrderMoney();

    private int? OwnOrdersOnly => User.OwnOrdersOnlyId();

    /// <summary>Siparişi okur. Başkasının siparişini isteyen Temsilci, numara hiç
    /// yokmuş gibi aynı 404'ü alır (sipariş numarasının varlığı da sızmaz).</summary>
    private async Task<OrderDetailDto> GetReadableOrderAsync(string no)
    {
        var order = await orderService.GetByNoAsync(no);
        if (OwnOrdersOnly is int ownerId && order.KullaniciID != ownerId)
            throw new NotFoundException("Order", no);
        return order;
    }

    private async Task EnsureOrderReadableAsync(string no)
    {
        if (OwnOrdersOnly is not null)
            await GetReadableOrderAsync(no);
    }

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
        // PROMPT-v2 §6: Temsilci yalnız kendi siparişlerini görür.
        // PROMPT-v4 §1/§6.2: elshan.rasulov rolünden bağımsız tümünü görür
        // (Kontrol ekranı filtreli yüklemesi bu endpoint'i kullanır).
        if (User.IsInRole("Temsilci") && !IsControlUser)
            filter = filter with { KullaniciID = CurrentUserId };

        var result = await orderService.GetOrdersAsync(filter);

        // PROMPT-v5 §2: Fabrika (ve ad bazlı gizlenen kullanıcı) liste satırlarında da para göremez.
        if (HidesMoney)
            result = result with
            {
                Items = result.Items.Select(OrderDtoSanitizer.StripPricesForFactory).ToList(),
            };

        return Ok(ApiResponse<OrderListPageDto>.Ok(result));
    }

    /// <summary>Authenticated user's own orders/quotes (Siparislerim portu).</summary>
    /// <remarks>Paket 2 — opsiyonel `asama` query param: SiparisMiTeklifMi enum değeri.</remarks>
    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<OrderListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyOrders([FromQuery] string? asama = null)
    {
        // PROMPT-v4 §6.2: elshan.rasulov Siparişlerim'de TÜM siparişleri izler;
        // diğer herkes v2 §6 gereği kendi satırlarıyla sınırlı kalır.
        var result = await orderService.GetMyOrdersAsync(CurrentUserId, asama, allUsers: IsControlUser);

        // PROMPT-v5 §2: kullanıcı bazlı scope yeterli değil — satır parası da karartılır.
        if (HidesMoney)
            result = result.Select(OrderDtoSanitizer.StripPricesForFactory).ToList();

        return Ok(ApiResponse<IReadOnlyList<OrderListDto>>.Ok(result));
    }

    /// <summary>Filtre + döviz toplamı (Euro/Dolar/TL/Sterlin) Fabrika ekran kartları.</summary>
    [HttpGet("totals")]
    [ProducesResponseType(typeof(ApiResponse<OrderTotalsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTotals([FromQuery] OrderFilterDto filter)
    {
        // PROMPT-v5 §2: döviz toplamları sipariş parasıdır — para göremeyenler tamamen dışlanır.
        if (HidesMoney) return Forbid();

        // PROMPT-v2 §6: Temsilci toplamları kendi siparişlerinden hesaplanır.
        // PROMPT-v4 §1: elshan rolünden bağımsız tümünü görür.
        if (User.IsInRole("Temsilci") && !IsControlUser)
            filter = filter with { KullaniciID = CurrentUserId };

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
        var result = await GetReadableOrderAsync(no);

        // PROMPT-v5 §2: para göremeyenler için tüm parasal alanlar (kalem fiyatları
        // dahil) kaynağında null'lanır — istemci gizlemesi ikinci katmandır.
        if (HidesMoney)
            result = OrderDtoSanitizer.StripPricesForFactory(result);

        return Ok(ApiResponse<OrderDetailDto>.Ok(result));
    }

    /// <summary>Sipariş onay/red audit log (SiparisOnaylari).</summary>
    [HttpGet("{no}/approvals")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<OrderApprovalDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetApprovals(string no)
    {
        await EnsureOrderReadableAsync(no);
        var result = await orderService.GetApprovalHistoryAsync(no);

        // Açıklamalar tutar taşıyabilir (peşinat, final maliyet, lojistik teklif fiyatı).
        if (HidesMoney)
            result = result.Select(OrderDtoSanitizer.StripPricesForFactory).ToList();

        return Ok(ApiResponse<IReadOnlyList<OrderApprovalDto>>.Ok(result));
    }

    /// <summary>UrunMaliyetTablo'dan sipariş başına maliyet özeti.</summary>
    // PROMPT-v2 §2: Fabrika dışlandı — fabrika rolüne hiçbir parasal değer açılmıyor.
    // PROMPT-v4 §1: + elshan.rasulov okuma istisnası (Kontrol ekranı).
    [HttpGet("{no}/material-cost")]
    [ProducesResponseType(typeof(ApiResponse<MaterialCostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMaterialCost(string no)
    {
        if (HidesMoney) return Forbid();
        if (!User.IsInRole("Yonetici") && !User.IsInRole("Muhasebe") && !IsControlUser)
            return Forbid();
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
        var detail = await GetReadableOrderAsync(no);
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
    // PROMPT-v3 §1: create-path yalnız Temsilci (Yonetici/Gozlemci bilinçli çıkarıldı).
    // + elshan.rasulov kullanıcı adı istisnası (CanCreateOrders).
    [HttpPost("quote")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateQuote([FromBody] CreateOrderDto dto)
    {
        if (!CanCreateOrders) return Forbid();
        var teklifNo = await orderService.CreateQuoteAsync(CurrentUserId, dto);
        return CreatedAtAction(nameof(GetByNo), new { no = teklifNo },
            ApiResponse<string>.Ok(teklifNo, "Teklif başarıyla oluşturuldu."));
    }

    /// <summary>
    /// Creates a new order (SiparisMiTeklifMi = 'Siparis').
    /// Maps to the WinForms siparisAlButon_Click handler.
    /// Returns the generated SiparisNo.
    /// </summary>
    // PROMPT-v3 §1: create-path yalnız Temsilci + elshan.rasulov istisnası.
    [HttpPost("order")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        if (!CanCreateOrders) return Forbid();
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
    // that can create orders should be able to revise them. (v3 §1 + elshan istisnası)
    [HttpPost("{eskiNo}/revise")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Revise(string eskiNo, [FromBody] CreateOrderDto dto)
    {
        if (!CanCreateOrders) return Forbid();
        await EnsureOrderReadableAsync(eskiNo);
        var newNo = await orderService.ReviseAsync(CurrentUserId, eskiNo, dto);
        return Ok(ApiResponse<string>.Ok(newNo, "Revize başarıyla tamamlandı."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Round-8 §7 — Kontrol onayı öncesi yerinde düzenleme / yumuşak silme
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Mevcut siparişi yerinde günceller (numara değişmez). Yalnız
    /// Kontrol != 'Onay' iken; gerekçe zorunlu; sahip + Yönetici/elshan yetkili.</summary>
    [HttpPut("{no}/amend")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Amend(string no, [FromBody] AmendOrderRequest req)
    {
        bool mgr = User.IsInRole("Yonetici") || IsControlUser;
        var resultNo = await orderService.AmendOrderAsync(CurrentUserId, no, req.Order, req.Gerekce, mgr);
        return Ok(ApiResponse<string>.Ok(resultNo, "Sipariş güncellendi."));
    }

    /// <summary>Siparişi yumuşak siler (listede 'Silindi' rozetiyle kalır).
    /// Yalnız Kontrol != 'Onay' iken; gerekçe zorunlu; sahip + Yönetici/elshan.</summary>
    [HttpDelete("{no}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(string no, [FromBody] DeleteOrderRequest req)
    {
        bool mgr = User.IsInRole("Yonetici") || IsControlUser;
        await orderService.SoftDeleteOrderAsync(CurrentUserId, no, req.Gerekce, mgr);
        return Ok(ApiResponse<object>.Ok(null!, "Sipariş silindi."));
    }

    /// <summary>40+ ergonomi K5 — "Geri al": yumuşak silinen siparişi geri yükler.
    /// Silme ile aynı yetki: sahip + Yönetici/elshan.</summary>
    [HttpPost("{no}/restore")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Restore(string no)
    {
        bool mgr = User.IsInRole("Yonetici") || IsControlUser;
        await orderService.RestoreOrderAsync(CurrentUserId, no, mgr);
        return Ok(ApiResponse<object>.Ok(null!, "Sipariş geri yüklendi."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Status transitions
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Converts a quote to an order by setting SiparisMiTeklifMi = 'Siparis'.
    /// Maps to the WinForms SipariseCevirButton click.
    /// </summary>
    // PROMPT.md #20: same role set as CreateOrder/CreateQuote. (v3 §1 + elshan istisnası)
    [HttpPut("{teklifNo}/convert-to-order")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConvertToOrder(string teklifNo)
    {
        if (!CanCreateOrders) return Forbid();
        await EnsureOrderReadableAsync(teklifNo);
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
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Clone(string sourceNo)
    {
        if (!CanCreateOrders) return Forbid();
        // Klon kaynağın fiyat ve müşteri bilgisini kopyalar: okuma kuralı burada da geçerli.
        await EnsureOrderReadableAsync(sourceNo);
        var newNo = await orderService.CloneFromExistingAsync(CurrentUserId, sourceNo);
        return Ok(ApiResponse<string>.Ok(newNo, "Sipariş klonlandı."));
    }

    [HttpPost("{no}/submit")]
    [Authorize(Roles = "Yonetici,Temsilci")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit(string no)
    {
        await EnsureOrderReadableAsync(no);
        await orderService.SubmitForApprovalAsync(no, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Onaya gönderildi."));
    }

    // PROMPT-v4 §1: Frontend bu iki endpoint'i hiç çağırmıyor (yalnız QC controller
    // varyantları kullanılıyor) — aynı servis metotları oldukları için Yonetici
    // backdoor'u kalmasın diye ControlUser'a yeniden gate'lendi.
    [HttpPost("{no}/approve")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(string no, [FromBody] ApproveOrderDto? dto)
    {
        if (!IsControlUser) return Forbid();
        await orderService.ApproveOrderAsync(no, CurrentUserId, dto?.Aciklama);
        return Ok(ApiResponse<object>.Ok(null!, "Onaylandı."));
    }

    [HttpPost("{no}/reject")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(string no, [FromBody] RejectOrderDto dto)
    {
        if (!IsControlUser) return Forbid();
        await orderService.RejectOrderAsync(no, CurrentUserId, dto.Aciklama);
        return Ok(ApiResponse<object>.Ok(null!, "Reddedildi."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROMPT-v4 §5.4 / §5.5 — Kontrol ekranı mutasyonları (yalnız ControlUser)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Cari Güncelle (legacy button2_Click_2): OdenenMiktar set.</summary>
    [HttpPut("{no}/paid-amount")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePaidAmount(string no, [FromBody] UpdatePaidAmountDto dto)
    {
        if (!IsControlUser) return Forbid();
        await orderService.UpdatePaidAmountAsync(no, dto.OdenenMiktar);
        return Ok(ApiResponse<object>.Ok(null!, "Cari güncellendi."));
    }

    /// <summary>Temsilci devri: siparişi başka temsilciye atar (yalnız ControlUser —
    /// elshan.rasulov / süper-admin). Düzenleme sahipliği değiştirmez; devir yalnız buradan.</summary>
    [HttpPut("{no}/representative")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeRepresentative(string no, [FromBody] ChangeRepresentativeRequest dto)
    {
        if (!IsControlUser) return Forbid();
        await orderService.ChangeRepresentativeAsync(no, dto.KullaniciID);
        return Ok(ApiResponse<object>.Ok(null!, "Temsilci güncellendi."));
    }

    /// <summary>Aşama Kaydet (legacy fabrikaButton_Click_1): aşama + STarih + KontrolNot.</summary>
    [HttpPut("{no}/stage")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateStage(string no, [FromBody] UpdateStageDto dto)
    {
        if (!IsControlUser) return Forbid();
        await orderService.UpdateStageAsync(no, dto);
        return Ok(ApiResponse<object>.Ok(null!, "Sipariş başarıyla güncellendi!"));
    }

    /// <summary>SiparisForm "Reçeteden Aç": kategori BoM'unu siparişe ekler.</summary>
    [HttpPost("{no}/expand-recipe")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExpandRecipe(string no, [FromBody] ExpandRecipeRequest dto)
    {
        if (!CanCreateOrders) return Forbid();
        await EnsureOrderReadableAsync(no);
        await orderService.ExpandRecipeAsync(no, dto.KategoriID, dto.Adet);
        return Ok(ApiResponse<object>.Ok(null!, "Reçete açıldı."));
    }

    /// <summary>Ek dosya yükle. type=ek (kullanıcı eki). MuhasebeEk Faz 5'te muhasebe modülünden.</summary>
    [HttpPost("{no}/attachments")]
    [Authorize(Roles = "Yonetici,Temsilci,Muhasebe,Gozlemci")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadAttachment(string no, [FromQuery] string type, IFormFile file)
    {
        await EnsureOrderReadableAsync(no);
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<object>.FailCode("fileEmpty", "Dosya boş.", null));

        // Muhasebe ekleri artık Muhasebe Klasörü'ne EKLENİR (eski blob'un üzerine yazılmaz).
        if (string.Equals(type, "muhasebeek", StringComparison.OrdinalIgnoreCase))
            return await UploadFolderFile(no, file);

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        await orderService.UploadAttachmentAsync(no, type, ms.ToArray());
        return Ok(ApiResponse<object>.Ok(null!, "Ek yüklendi."));
    }

    /// <summary>Ek dosya indir (eski tek-blob ekler). type=ek|muhasebeek</summary>
    [HttpGet("{no}/attachments/{type}")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadAttachment(string no, string type)
    {
        await EnsureOrderReadableAsync(no);
        // Muhasebe eki Muhasebe Klasörü ile aynı kuralda: para göremeyen açamaz.
        if (HidesMoney && string.Equals(type, "muhasebeek", StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var data = await orderService.GetAttachmentAsync(no, type);
        if (data is null || data.Length == 0)
            return NotFound(ApiResponse<object>.FailCode("attachmentNotFound", "Ek dosya yok.", null));

        // Ad ve tür saklanmadığı için ilk baytlardan tespit edilir (.zip/.rar/.pdf…).
        var (uzanti, tip) = CrmModern.Core.FileSignature.Detect(data.AsSpan(0, Math.Min(8, data.Length)));
        var prefix = string.Equals(type, "ek", StringComparison.OrdinalIgnoreCase) ? "siparis_ek_" : "muhasebe_ek_";
        return File(data, tip, $"{prefix}{no}{uzanti}");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Muhasebe Klasörü — proforma + muhasebe ekleri (çok dosya) + Satıcı Ek.
    // Görme: parasal değer görebilen herkes; Satış Temsilcisi yalnız kendi siparişi.
    // Ekleme / silme: Yönetici, Muhasebe, Muhasebe Onay kullanıcıları.
    // ─────────────────────────────────────────────────────────────────────────

    private static readonly string[] AccountingApprovers = { "burcu.karaman", "elshan.rasulov", "admin" };

    private bool CanManageFolder =>
        User.IsInRole("Yonetici") || User.IsInRole("Muhasebe")
        || AccountingApprovers.Contains(CurrentUserName) || User.IsSuperAdmin();

    /// <summary>Klasörü görebilir mi? (Fabrika / ad bazlı gizleme hayır; Temsilci yalnız
    /// kendi siparişi — başkasınınki için sipariş detayıyla aynı 404.)</summary>
    private bool CanSeeFolder(string no, OrderFolderRef order)
    {
        if (HidesMoney) return false;
        if (OwnOrdersOnly is int ownerId && !CanManageFolder && order.KullaniciID != ownerId)
            throw new NotFoundException("Order", no);
        return true;
    }

    private static IActionResult FolderFileNotFound() =>
        new NotFoundObjectResult(ApiResponse<object>.FailCode("attachmentNotFound", "Ek dosya yok.", null));

    /// <summary>SiparisNo → muhasebe eki sayısı (klasör düğmesindeki sayaç).</summary>
    [HttpGet("folder-counts")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyDictionary<string, int>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFolderCounts()
    {
        if (HidesMoney) return Forbid();
        var counts = await folderService.GetCountsAsync();
        return Ok(ApiResponse<IReadOnlyDictionary<string, int>>.Ok(counts));
    }

    /// <summary>Klasör içeriği (blob yok) + bu kullanıcının yetkileri.
    /// 40+ ergonomi K5 — includeDeleted=true: silinen dosyalar da (silindi=true) döner.</summary>
    [HttpGet("{no}/folder")]
    [ProducesResponseType(typeof(ApiResponse<OrderFolderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFolder(string no, [FromQuery] bool includeDeleted = false)
    {
        var order = await folderService.ResolveAsync(no);
        if (!CanSeeFolder(no, order)) return Forbid();

        var (dosyalar, onceki, satici) = await folderService.GetContentAsync(order, includeDeleted);
        var dto = new OrderFolderDto(
            order.SiparisNo,
            CanManage: CanManageFolder,
            CanSeeProforma: await CanDownloadProformaAsync(no),
            dosyalar, onceki, satici);
        return Ok(ApiResponse<OrderFolderDto>.Ok(dto));
    }

    /// <summary>Klasöre tek dosya ekler (≤25 MB, izinli uzantı). Önceki dosyalar korunur.</summary>
    [HttpPost("{no}/folder/files")]
    [ProducesResponseType(typeof(ApiResponse<OrderFolderFileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadFolderFile(string no, IFormFile file)
    {
        if (!CanManageFolder) return Forbid();
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<object>.FailCode("fileEmpty", "Dosya boş.", null));
        if (file.Length > FileRules.MaxBytes)
            return BadRequest(ApiResponse<object>.FailCode("fileTooLarge", "Dosya 25 MB'tan büyük.", null));
        var ad = Path.GetFileName(file.FileName);
        if (!FileRules.IsAllowed(ad))
            return BadRequest(ApiResponse<object>.FailCode("unsupportedFileType", "Bu dosya türü yüklenemez.", null));

        var order = await folderService.ResolveAsync(no);
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var saved = await folderService.UploadAsync(order, ad, FileRules.ContentTypeFor(ad, file.ContentType), ms.ToArray(), CurrentUserId);
        return Ok(ApiResponse<OrderFolderFileDto>.Ok(saved, "Dosya eklendi."));
    }

    /// <summary>Klasördeki dosyayı indirir (orijinal ad + içerik tipi; önizleme de bunu kullanır).</summary>
    [HttpGet("{no}/folder/files/{ekId:int}")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> DownloadFolderFile(string no, int ekId)
    {
        var order = await folderService.ResolveAsync(no);
        if (!CanSeeFolder(no, order)) return Forbid();
        var data = await folderService.GetFileAsync(order, ekId);
        return data is null ? FolderFileNotFound() : File(data.Veri, data.Tip, data.Ad);
    }

    /// <summary>Eski tek-blob ekler: kind=muhasebe (önceki muhasebe eki) | satici (Satıcı Ek).</summary>
    [HttpGet("{no}/folder/legacy/{kind}")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> DownloadFolderLegacyFile(string no, string kind)
    {
        var order = await folderService.ResolveAsync(no);
        if (!CanSeeFolder(no, order)) return Forbid();
        var data = await folderService.GetLegacyFileAsync(order, kind);
        return data is null ? FolderFileNotFound() : File(data.Veri, data.Tip, data.Ad);
    }

    /// <summary>Klasörden dosya siler (yumuşak silme — Geri al ile geri gelir; denetim kaydına yazılır).</summary>
    [HttpDelete("{no}/folder/files/{ekId:int}")]
    public async Task<IActionResult> DeleteFolderFile(string no, int ekId)
    {
        if (!CanManageFolder) return Forbid();
        var order = await folderService.ResolveAsync(no);
        await folderService.DeleteAsync(order, ekId, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(null!, "Dosya silindi."));
    }

    /// <summary>40+ ergonomi K5 — silinen klasör dosyasını geri yükler (silme ile aynı yetki).</summary>
    [HttpPost("{no}/folder/files/{ekId:int}/restore")]
    [ProducesResponseType(typeof(ApiResponse<OrderFolderFileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RestoreFolderFile(string no, int ekId)
    {
        if (!CanManageFolder) return Forbid();
        var order = await folderService.ResolveAsync(no);
        var restored = await folderService.RestoreAsync(order, ekId, CurrentUserId);
        return Ok(ApiResponse<OrderFolderFileDto>.Ok(restored, "Dosya geri yüklendi."));
    }

    /// <summary>Önceki (tek-blob) muhasebe ekini siler. Blob, silinmiş bir klasör
    /// dosyasına taşınır; dönen ekId ile .../folder/files/{ekId}/restore geri yükler.</summary>
    [HttpDelete("{no}/folder/legacy/muhasebe")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteFolderLegacyFile(string no)
    {
        if (!CanManageFolder) return Forbid();
        var order = await folderService.ResolveAsync(no);
        var ekId = await folderService.DeleteLegacyMuhasebeEkAsync(order, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(new { ekId }, "Dosya silindi."));
    }

    /// <summary>
    /// Hotfix Proforma — UNIXPADEL PREFORMA BLANK.xlsx template'inden proforma üretir.
    /// ExcelIndir BLOB DB'de varsa (mevcut durum) WinForms SiparisForm.previewButton_Click /
    /// Form3.excelYaz_Click davranışıyla birebir placeholder substitution yapılır. Aksi
    /// halde hard-coded ClosedXML fallback'e düşülür.
    /// </summary>
    // PROMPT-v2 §2: Proforma fiyatlar içerdiği için Fabrika dışlandı.
    // PROMPT-v4 §1/§5.7: + elshan.rasulov istisnası (Kontrol ekranı "Excel'e Yaz").
    // Round-8 §4 — `lang` (tr|en) standart şart kodlarını proformada hangi dile
    // çevireceğini belirler; frontend mevcut UI dilini geçer.
    [HttpGet("{no}/excel")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Excel(string no, [FromQuery] string lang = "tr")
    {
        await EnsureOrderReadableAsync(no);
        if (!await CanDownloadProformaAsync(no)) return Forbid();
        var bytes = await reportingService.ExportOrderProformaAsync(no, lang);
        var fileName = $"Proforma_{no}_{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }

    /// <summary>
    /// Aynı proformanın PDF çıktısı (LibreOffice ile xlsx→PDF, birebir görünüm).
    /// Yetki kuralı Excel ile AYNI: Temsilci yalnız kendi siparişini indirir.
    /// GET /api/orders/{no}/pdf
    /// </summary>
    [HttpGet("{no}/pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Pdf(string no, [FromQuery] string lang = "tr")
    {
        await EnsureOrderReadableAsync(no);
        if (!await CanDownloadProformaAsync(no)) return Forbid();
        var bytes = await reportingService.ExportOrderProformaPdfAsync(no, lang);
        var fileName = $"Proforma_{no}_{DateTime.Now:yyyyMMdd}.pdf";
        return File(bytes, "application/pdf", fileName);
    }

    // §32 — Proforma indirme yetkisi (Excel + PDF ortak):
    //   Yonetici / Muhasebe / Lojistik / Kontrol kullanıcısı → her sipariş.
    //   Temsilci → YALNIZ kendi oluşturduğu sipariş (own-only).
    //   Fabrika (parasal değer göremez) + diğer roller → erişemez.
    private async Task<bool> CanDownloadProformaAsync(string no)
    {
        if (HidesMoney) return false;
        if (User.IsInRole("Yonetici") || User.IsInRole("Muhasebe")
            || User.IsInRole("Lojistik") || IsControlUser)
            return true;
        if (!User.IsInRole("Temsilci"))
            return false;
        // Temsilci sahiplik kontrolü: `no` (SiparisNo veya TeklifNo) kendi siparişi olmalı.
        var mine = await orderService.GetMyOrdersAsync(CurrentUserId);
        return mine.Any(o => o.SiparisNo == no || o.TeklifNo == no);
    }
}
