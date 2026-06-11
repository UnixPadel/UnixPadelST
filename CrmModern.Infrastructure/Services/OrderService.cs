using ClosedXML.Excel;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Implements all Order / Quote business logic.
/// Preserves the exact save sequence from SiparisForm.cs:
///   1. Upsert TeslimatBilgisiTablo (if TeslimAlanAdi provided and not duplicate)
///   2. Delete + insert DetayTablo  (using NEW siparisNo — matches WinForms behaviour)
///   3. INSERT or UPDATE SiparisAlTablo
///   4. Delete + insert SiparisIslemTablo (category row + component rows per set)
///
/// Revision rule (WinForms behaviour preserved):
///   Items with the OLD SiparisNo are left orphaned; new items carry the NEW SiparisNo.
/// </summary>
internal sealed class OrderService(IUnitOfWork uow) : IOrderService
{
    // ─────────────────────────────────────────────────────────────────────────
    // List
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<OrderListDto>> GetMyOrdersAsync(int kullaniciID, string? asama = null, bool allUsers = false)
    {
        // PROMPT-v4 §6.2 — allUsers yalnız elshan.rasulov için true gelir (controller
        // branch'i); diğer herkes v2 §6 kapsamında kendi satırlarıyla sınırlı kalır.
        var orders = allUsers
            ? await uow.Orders.SearchAsync(null, null, null, null, null, null, null, null, null)
            : await uow.Orders.GetByKullaniciAsync(kullaniciID);

        // Paket 2 — opsiyonel aşama filtresi (SiparisMiTeklifMi enum string birebir)
        if (!string.IsNullOrWhiteSpace(asama))
            orders = orders.Where(o => o.SiparisMiTeklifMi == asama).ToList().AsReadOnly();

        // §6.2 — sahip (Temsilci) kolonu: Ad Soyad çözümlemesi
        var users = (await uow.Kullanicilar.GetAllAsync())
            .ToDictionary(u => u.KullaniciID, u => $"{u.Ad} {u.Soyad}".Trim());

        return orders
            .Select(o => MapToListDto(o, users))
            .ToList();
    }

    private static OrderListDto MapToListDto(Order o, IReadOnlyDictionary<int, string>? users = null) =>
        new(
            SiparisAlID:       o.SiparisAlID,
            SiparisNo:         o.SiparisNo,
            TeklifNo:          o.TeklifNo,
            MusteriAd:         o.MusteriAd,
            MUlke:             o.MUlke,
            KullaniciID:       o.KullaniciID,
            ParaTipi:          o.ParaTipi,
            ToplamFiyat:       o.ToplamFiyat,
            SiparisMiTeklifMi: o.SiparisMiTeklifMi,
            Kontrol:           o.Kontrol,
            Tarih:             o.Tarih,
            Sirket:            o.Sirket,
            PesinYuzde:        o.PesinYüzde,
            OdenenMiktar:      o.OdenenMiktar,
            TeslimatCesiti:    o.TeslimatÇeşiti,
            OdemeDurum:        o.OdemeDurum,
            KullaniciAdSoyad:  users is not null && users.TryGetValue(o.KullaniciID, out var n) ? n : null);

    // ─────────────────────────────────────────────────────────────────────────
    // Single record
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<OrderDetailDto> GetByNoAsync(string no)
    {
        var order = await uow.Orders.GetByNoAsync(NormalizeToSiparisNo(no))
            ?? throw new NotFoundException("Order", no);

        // PROMPT-v4 §4.1 — Satış Temsilcisi bloğu "Temsilci Adı" = sahibin Ad Soyad'ı.
        var owner = await uow.Kullanicilar.GetByIdAsync(order.KullaniciID);
        string? ownerAdSoyad = owner is null ? null : $"{owner.Ad} {owner.Soyad}".Trim();

        // PROMPT-v4 §4.3 — Ürün & Bileşen grid'i isimleri (legacy LEFT JOIN'ler).
        var kategoriler = (await uow.ProductCategories.GetAllAsync())
            .ToDictionary(c => c.KategoriID, c => c.KategoriAdi);
        var bilesenler = (await uow.Components.GetAllAsync())
            .ToDictionary(b => b.BilesenID, b => (b.BilesenAdi, b.Birim));

        return MapToDetailDto(order, ownerAdSoyad, kategoriler, bilesenler);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create
    // ─────────────────────────────────────────────────────────────────────────

    public Task<string> CreateQuoteAsync(int kullaniciID, CreateOrderDto dto) =>
        SaveAsync(kullaniciID, dto, isTeklif: true, existingOrder: null);

    public Task<string> CreateOrderAsync(int kullaniciID, CreateOrderDto dto) =>
        SaveAsync(kullaniciID, dto, isTeklif: false, existingOrder: null);

    // ─────────────────────────────────────────────────────────────────────────
    // Revise
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<string> ReviseAsync(int kullaniciID, string eskiNo, CreateOrderDto dto)
    {
        var existing = await uow.Orders.GetByNoAsync(NormalizeToSiparisNo(eskiNo))
            ?? throw new NotFoundException("Order", eskiNo);

        bool isTeklif = existing.SiparisMiTeklifMi == "Teklif";
        return await SaveAsync(kullaniciID, dto, isTeklif, existingOrder: existing);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Status transitions
    // ─────────────────────────────────────────────────────────────────────────

    public async Task ConvertToOrderAsync(string teklifNo)
    {
        // WinForms: UPDATE SiparisAlTablo SET SiparisMiTeklifMi='Siparis' WHERE TeklifNo=@Numara
        var order = await uow.Orders.GetByNoAsync(NormalizeToSiparisNo(teklifNo))
            ?? throw new NotFoundException("Quote", teklifNo);

        if (order.SiparisMiTeklifMi != "Teklif")
            throw new BusinessException(
                $"Only quotes can be converted to orders. Current stage: {order.SiparisMiTeklifMi}");

        order.SiparisMiTeklifMi = "Siparis";
        uow.Orders.Update(order);
        await uow.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Catalog helpers
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ProductCategoryDto>> GetCategoriesAsync()
    {
        var cats = await uow.ProductCategories.GetAllAsync();
        return cats
            .Select(c => new ProductCategoryDto(c.KategoriID, c.KategoriAdi, c.Fiyat))
            .ToList();
    }

    public async Task<IReadOnlyList<ComponentDto>> GetComponentsByCategoryAsync(int kategoriID)
    {
        // PROMPT-v3 §2.1 — legacy comboBoxKategori_SelectedIndexChanged sorgusu:
        //   SELECT bb.* FROM BilesenBilgileri bb
        //   LEFT JOIN KategoriBilesenleri kb ON bb.BilesenID = kb.BilesenID
        //                                   AND kb.KategoriID = @KategoriID
        // Tüm bileşenler döner; reçetede olanlar InRecipe=true + kb.Adet taşır.
        var cat = await uow.ProductCategories.GetWithComponentsAsync(kategoriID)
            ?? throw new NotFoundException("Category", kategoriID);

        var recipe = cat.CategoryComponents.ToDictionary(cc => cc.BilesenID, cc => cc.Adet);

        // GetAllWithAttributesAsync: Attributes Include'lu gelir — Öznitelik
        // dropdown'larının boş kalması (v2'deki sessiz hata) burada kapanır.
        var components = await uow.Components.GetAllWithAttributesAsync();

        return components
            .OrderBy(c => c.BilesenID)   // legacy liste sırası
            .Select(c => new ComponentDto(
                BilesenID:    c.BilesenID,
                BilesenAdi:   c.BilesenAdi,
                Birim:        c.Birim,
                InRecipe:     recipe.ContainsKey(c.BilesenID),
                DefaultAdet:  recipe.TryGetValue(c.BilesenID, out int adet) ? adet : 1,
                // PROMPT-v2 §1b: Bileşen master fiyatı default Birim Fiyat olur.
                DefaultFiyat: c.Fiyat,
                Attributes:   c.Attributes
                                .Select(a => a.OznitelikAdı)
                                .ToList()))
            .ToList();
    }

    public async Task<IReadOnlyList<DeliveryAddressDto>> GetDeliveryAddressesAsync()
    {
        var addresses = await uow.DeliveryAddresses.GetAllAsync();
        return addresses
            .Select(a => new DeliveryAddressDto(
                TeslimatBilgiID: a.TeslimatBilgiID,
                TeslimAlanAdi:   a.TeslimAlanAdi,
                IlgiliKisi:      a.IlgiliKisi,
                UlkeID:          a.UlkeID,
                ZipKod:          a.ZipKod,
                TelUlkeKodu:     a.TelUlkeKodu,
                Telefon:         a.Telefon,
                AltTelUlkeKodu:  a.AltTelUlkeKodu,
                AltTelefon:      a.AltTelefon,
                E_Mail:          a.E_Mail,
                VATNumarasi:     a.VATNumarasi,
                Adres:           a.Adres))
            .ToList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core save logic  (shared by CreateQuote / CreateOrder / Revise)
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<string> SaveAsync(
        int            kullaniciID,
        CreateOrderDto dto,
        bool           isTeklif,
        Order?         existingOrder)
    {
        // ── 1. Load Kullanici for number-prefix generation ────────────────
        var kullanici = await uow.Kullanicilar.GetByIdAsync(kullaniciID)
            ?? throw new NotFoundException("User", kullaniciID);

        // ── 2. Determine SiparisNo / TeklifNo ────────────────────────────
        string siparisNo, teklifNo;

        if (existingOrder is null)
        {
            // New record — WinForms format: S{Ad[0:2]}{Soyad[0:2]}{ddMMyyyy}{seq}
            int    seq    = await uow.Orders.GetNextSequenceAsync();
            string prefix = BuildNumberPrefix(kullanici, DateTime.Now);
            siparisNo = "S" + prefix + seq;
            teklifNo  = "T" + prefix + seq;
        }
        else
        {
            // Revision — increment the suffix on both numbers
            siparisNo = IncrementRevision(existingOrder.SiparisNo);
            teklifNo  = IncrementRevision(existingOrder.TeklifNo);
        }

        // ── 3. Upsert TeslimatBilgisiTablo (skip if name already exists) ─
        if (!string.IsNullOrWhiteSpace(dto.TTeslimAlanAdi))
        {
            bool exists = await uow.DeliveryAddresses.TeslimAlanAdiExistsAsync(dto.TTeslimAlanAdi);
            if (!exists)
            {
                // Best-effort: resolve UlkeID from UlkeAdi string
                int? ulkeID = null;
                if (!string.IsNullOrWhiteSpace(dto.TUlke))
                {
                    var ulkeler = await uow.Ulkeler.GetAllAsync();
                    ulkeID = ulkeler.FirstOrDefault(u => u.UlkeAdi == dto.TUlke)?.UlkelerID;
                }

                await uow.DeliveryAddresses.AddAsync(new DeliveryAddress
                {
                    TeslimAlanAdi = dto.TTeslimAlanAdi,
                    IlgiliKisi    = dto.TIlgiliKisi,
                    UlkeID        = ulkeID,
                    ZipKod        = dto.TZipKod,
                    Telefon       = dto.TTelefon,
                    AltTelefon    = dto.TAltTelefon,
                    E_Mail        = dto.TE_Mail,
                    VATNumarasi   = dto.TVATNumarasi,
                    Adres         = dto.TAdres
                });
                await uow.SaveChangesAsync();
            }
        }

        // ── 4. Calculate prices ───────────────────────────────────────────
        // BrutToplamFiyat = Σ setFiyatTextBox values + montaj + teslimat
        // (KategoriFiyat is the total for the whole set, NOT per-unit)
        decimal brutToplamFiyat =
              dto.Sets.Sum(s => s.KategoriFiyat)
            + (dto.MontajVar   ? dto.MontajFiyat   : 0m)
            + (dto.TeslimatVar ? dto.TeslimatFiyat : 0m);

        // ToplamFiyat = (Brut − Indirim) × (1 + Kdv/100)
        // PROMPT-v2 §3: null değerler "boş" anlamına gelir; hesapta 0 olarak alınır.
        decimal indirim        = dto.Indirim ?? 0m;
        decimal kdv            = dto.Kdv     ?? 0m;
        decimal indirimliFiyat = brutToplamFiyat - indirim;
        decimal toplamFiyat    = indirimliFiyat + (indirimliFiyat * kdv / 100m);

        byte[]? ek = string.IsNullOrEmpty(dto.EkBase64)
            ? null
            : Convert.FromBase64String(dto.EkBase64);

        string siparisMiTeklifMi = isTeklif ? "Teklif" : "Siparis";

        // ── 5. Delete old Details using the NEW siparisNo ─────────────────
        // WinForms: DELETE FROM DetayTablo WHERE SiparisNo = @newNo (before the INSERT/UPDATE)
        await uow.Orders.DeleteDetailsAsync(siparisNo);

        // ── 6. Insert new Details with the NEW siparisNo ──────────────────
        var newDetails = dto.Details
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Select(d => new OrderDetail { SiparisNo = siparisNo, Text = d })
            .ToList();

        if (newDetails.Count > 0)
            await uow.Orders.AddDetailsAsync(newDetails);

        await uow.SaveChangesAsync();

        // ── 7. INSERT or UPDATE SiparisAlTablo ────────────────────────────
        if (existingOrder is null)
        {
            await uow.Orders.AddAsync(
                BuildOrderEntity(siparisNo, teklifNo, kullaniciID, dto,
                                 siparisMiTeklifMi, brutToplamFiyat, toplamFiyat, ek));
        }
        else
        {
            // Revise: UPDATE existing row — SiparisNo changes to the new revision number.
            // WinForms: UPDATE ... SET SiparisNo=@YeniNo ... WHERE SiparisNo=@EskiNo
            ApplyUpdateToOrder(existingOrder, siparisNo, teklifNo, kullaniciID, dto,
                               siparisMiTeklifMi, brutToplamFiyat, toplamFiyat, ek);
            uow.Orders.Update(existingOrder);
        }

        await uow.SaveChangesAsync();

        // ── 8. Delete old Items using the NEW siparisNo ───────────────────
        // WinForms: DELETE FROM SiparisIslemTablo WHERE SiparisNo = @newNo
        // For first revision this is a no-op; old items (with the old SiparisNo) are
        // left orphaned — this is the preserved WinForms behaviour.
        await uow.Orders.DeleteItemsAsync(siparisNo);

        // ── 9. Insert items: one category row + N component rows per set ──
        var newItems = new List<OrderItem>();

        foreach (var set in dto.Sets)
        {
            // Category-level row (KategoriID set, BilesenID null)
            newItems.Add(new OrderItem
            {
                SiparisNo  = siparisNo,
                TeklifNo   = teklifNo,
                KategoriID = set.KategoriID,
                BilesenID  = null,
                Adet       = set.Adet,
                Fiyat      = set.KategoriFiyat
            });

            // Component rows (BilesenID set, KategoriID null)
            foreach (var comp in set.Components)
            {
                newItems.Add(new OrderItem
                {
                    SiparisNo    = siparisNo,
                    TeklifNo     = teklifNo,
                    KategoriID   = null,
                    BilesenID    = comp.BilesenID,
                    OznitelikAdi = comp.OznitelikAdi,
                    Adet         = comp.Adet,
                    Fiyat        = comp.Fiyat
                });
            }
        }

        if (newItems.Count > 0)
            await uow.Orders.AddItemsAsync(newItems);

        await uow.SaveChangesAsync();

        return isTeklif ? teklifNo : siparisNo;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds the order-number infix: {Ad[0:2]}{Soyad[0:2]}{ddMMyyyy}
    /// Matches the WinForms tempSiparisNumarasi / tempTeklifNumarasi construction.
    /// </summary>
    private static string BuildNumberPrefix(Kullanici k, DateTime date)
    {
        string ad    = (k.Ad    + "XX")[..2].ToUpperInvariant();
        string soyad = (k.Soyad + "XX")[..2].ToUpperInvariant();
        return ad + soyad + date.ToString("ddMMyyyy");
    }

    /// <summary>
    /// Increments the revision suffix on a number.
    /// "SAN01042026123"   → "SAN01042026123-1"
    /// "SAN01042026123-1" → "SAN01042026123-2"
    /// </summary>
    private static string IncrementRevision(string number)
    {
        int dashIdx = number.LastIndexOf('-');
        if (dashIdx >= 0 && int.TryParse(number[(dashIdx + 1)..], out int rev))
            return number[..dashIdx] + "-" + (rev + 1);

        return number + "-1";
    }

    /// <summary>Converts a T-prefixed TeklifNo to the matching S-prefixed SiparisNo.</summary>
    private static string NormalizeToSiparisNo(string no) =>
        no.StartsWith('T') ? "S" + no[1..] : no;

    private static Order BuildOrderEntity(
        string siparisNo, string teklifNo, int kullaniciID,
        CreateOrderDto dto, string siparisMiTeklifMi,
        decimal brutToplamFiyat, decimal toplamFiyat, byte[]? ek) => new()
    {
        SiparisNo         = siparisNo,
        TeklifNo          = teklifNo,
        MusteriAd         = dto.MusteriAd,
        SiparisNotu       = dto.SiparisNotu,
        KullaniciID       = kullaniciID,
        STelefon          = dto.STelefon,
        SFax              = dto.SFax,
        SWeb              = dto.SWeb,
        SE_Mail           = dto.SE_Mail,
        SVatNumarasi      = dto.SVatNumarasi,
        SUlke             = dto.SUlke,
        SAdres            = dto.SAdres,
        Montaj            = dto.MontajVar   ? "Var" : "Yok",
        MontajFiyat       = dto.MontajFiyat,
        MAdet             = dto.MAdet,
        Teslimat          = dto.TeslimatVar ? "Var" : "Yok",
        TeslimatFiyat     = dto.TeslimatFiyat,
        MTeslimat         = dto.MTeslimat,
        TeslimatÇeşiti    = dto.TeslimatCesiti,
        TTeslimAlanAdi    = dto.TTeslimAlanAdi,
        TIlgiliKisi       = dto.TIlgiliKisi,
        TTelefon          = dto.TTelefon,
        TAltTelefon       = dto.TAltTelefon,
        TE_Mail           = dto.TE_Mail,
        TVATNumarasi      = dto.TVATNumarasi,
        TZipKod           = dto.TZipKod,
        TUlke             = dto.TUlke,
        TAdres            = dto.TAdres,
        MTelefon          = dto.MTelefon,
        MMail             = dto.MMail,
        MUlke             = dto.MUlke,
        MVATNumarasi      = dto.MVATNumarasi,
        MZipKod           = dto.MZipKod,
        MAdres            = dto.MAdres,
        ParaTipi          = dto.ParaTipi,
        // PROMPT-v2 §3: null → DB NULL korunur (Order.Indirim/Kdv zaten nullable);
        // PesinYüzde non-nullable int olduğu için null → 0.
        Indirim           = dto.Indirim,
        Kdv               = dto.Kdv,
        PesinYüzde        = dto.PesinYuzde ?? 0,
        ToplamFiyat       = toplamFiyat,
        BrutToplamFiyat   = brutToplamFiyat,
        SiparisMiTeklifMi = siparisMiTeklifMi,
        Kontrol           = "Kontrol",
        Sirket            = dto.Sirket,
        Tarih             = DateTime.Now,
        Ek                = ek
    };

    private static void ApplyUpdateToOrder(
        Order existing, string siparisNo, string teklifNo,
        int kullaniciID, CreateOrderDto dto, string siparisMiTeklifMi,
        decimal brutToplamFiyat, decimal toplamFiyat, byte[]? ek)
    {
        existing.SiparisNo         = siparisNo;
        existing.TeklifNo          = teklifNo;
        existing.MusteriAd         = dto.MusteriAd;
        existing.SiparisNotu       = dto.SiparisNotu;
        existing.KullaniciID       = kullaniciID;
        existing.STelefon          = dto.STelefon;
        existing.SFax              = dto.SFax;
        existing.SWeb              = dto.SWeb;
        existing.SE_Mail           = dto.SE_Mail;
        existing.SVatNumarasi      = dto.SVatNumarasi;
        existing.SUlke             = dto.SUlke;
        existing.SAdres            = dto.SAdres;
        existing.Montaj            = dto.MontajVar   ? "Var" : "Yok";
        existing.MontajFiyat       = dto.MontajFiyat;
        existing.MAdet             = dto.MAdet;
        existing.Teslimat          = dto.TeslimatVar ? "Var" : "Yok";
        existing.TeslimatFiyat     = dto.TeslimatFiyat;
        existing.MTeslimat         = dto.MTeslimat;
        existing.TeslimatÇeşiti    = dto.TeslimatCesiti;
        existing.TTeslimAlanAdi    = dto.TTeslimAlanAdi;
        existing.TIlgiliKisi       = dto.TIlgiliKisi;
        existing.TTelefon          = dto.TTelefon;
        existing.TAltTelefon       = dto.TAltTelefon;
        existing.TE_Mail           = dto.TE_Mail;
        existing.TVATNumarasi      = dto.TVATNumarasi;
        existing.TZipKod           = dto.TZipKod;
        existing.TUlke             = dto.TUlke;
        existing.TAdres            = dto.TAdres;
        existing.MTelefon          = dto.MTelefon;
        existing.MMail             = dto.MMail;
        existing.MUlke             = dto.MUlke;
        existing.MVATNumarasi      = dto.MVATNumarasi;
        existing.MZipKod           = dto.MZipKod;
        existing.MAdres            = dto.MAdres;
        existing.ParaTipi          = dto.ParaTipi;
        // PROMPT-v2 §3: nullable DTO → entity (PesinYüzde non-nullable: null → 0).
        existing.Indirim           = dto.Indirim;
        existing.Kdv               = dto.Kdv;
        existing.PesinYüzde        = dto.PesinYuzde ?? 0;
        existing.ToplamFiyat       = toplamFiyat;
        existing.BrutToplamFiyat   = brutToplamFiyat;
        existing.SiparisMiTeklifMi = siparisMiTeklifMi;
        existing.Kontrol           = "Kontrol";
        existing.Sirket            = dto.Sirket;
        if (ek is not null) existing.Ek = ek;
    }

    private static OrderDetailDto MapToDetailDto(
        Order o,
        string? ownerAdSoyad = null,
        IReadOnlyDictionary<int, string>? kategoriler = null,
        IReadOnlyDictionary<int, (string BilesenAdi, string? Birim)>? bilesenler = null) => new(
        SiparisNo:         o.SiparisNo,
        TeklifNo:          o.TeklifNo,
        MusteriAd:         o.MusteriAd,
        SiparisNotu:       o.SiparisNotu,
        STelefon:          o.STelefon,
        SFax:              o.SFax,
        SWeb:              o.SWeb,
        SE_Mail:           o.SE_Mail,
        SVatNumarasi:      o.SVatNumarasi,
        SUlke:             o.SUlke,
        SAdres:            o.SAdres,
        MTelefon:          o.MTelefon,
        MMail:             o.MMail,
        MUlke:             o.MUlke,
        MVATNumarasi:      o.MVATNumarasi,
        MZipKod:           o.MZipKod,
        MAdres:            o.MAdres,
        MontajVar:         o.Montaj    == "Var",
        MontajFiyat:       o.MontajFiyat,
        MAdet:             o.MAdet,
        TeslimatVar:       o.Teslimat  == "Var",
        TeslimatFiyat:     o.TeslimatFiyat,
        MTeslimat:         o.MTeslimat,
        TeslimatCesiti:    o.TeslimatÇeşiti,
        TTeslimAlanAdi:    o.TTeslimAlanAdi,
        TIlgiliKisi:       o.TIlgiliKisi,
        TTelefon:          o.TTelefon,
        TAltTelefon:       o.TAltTelefon,
        TE_Mail:           o.TE_Mail,
        TVATNumarasi:      o.TVATNumarasi,
        TZipKod:           o.TZipKod,
        TUlke:             o.TUlke,
        TAdres:            o.TAdres,
        ParaTipi:          o.ParaTipi,
        Indirim:           o.Indirim,
        Kdv:               o.Kdv,
        PesinYuzde:        o.PesinYüzde,
        ToplamFiyat:       o.ToplamFiyat,
        BrutToplamFiyat:   o.BrutToplamFiyat,
        SiparisMiTeklifMi: o.SiparisMiTeklifMi,
        Kontrol:           o.Kontrol,
        Red:               o.Red,
        Sirket:            o.Sirket,
        FabrikaNot:        o.FabrikaNot,
        LojistikNot:       o.LojistikNot,
        Tarih:             o.Tarih,
        STarih:            o.STarih,   // 2.5 stage-history timeline buradan beslenir
        KullaniciAdi:      ownerAdSoyad,   // PROMPT-v4 §4.1: sahibin Ad Soyad'ı
        Items:             o.Items.Select(i => new OrderItemDto(
                               i.KategoriID, i.BilesenID,
                               i.OznitelikAdi, i.Adet, i.Fiyat,
                               KategoriAdi: i.KategoriID.HasValue && kategoriler is not null &&
                                            kategoriler.TryGetValue(i.KategoriID.Value, out var ka) ? ka : null,
                               BilesenAdi:  i.BilesenID.HasValue && bilesenler is not null &&
                                            bilesenler.TryGetValue(i.BilesenID.Value, out var bb) ? bb.BilesenAdi : null,
                               Birim:       i.BilesenID.HasValue && bilesenler is not null &&
                                            bilesenler.TryGetValue(i.BilesenID.Value, out var bb2) ? bb2.Birim : null)).ToList(),
        Details:           o.Details.Select(d => d.Text).ToList(),
        OdenenMiktar:      o.OdenenMiktar,
        OdemeDurum:        o.OdemeDurum,
        KontrolNot:        o.KontrolNot
    );

    // ═════════════════════════════════════════════════════════════════════════
    // Faz 3 — Yeni metotlar
    // ═════════════════════════════════════════════════════════════════════════

    public async Task<OrderListPageDto> GetOrdersAsync(OrderFilterDto f)
    {
        // SearchAsync: siparisNo, musteriAd, kullaniciID, ulke, asama, kontrol, odemeDurum, baslangic, bitis
        // (paraTipi repository'de yok — service tarafında ekstra filtre uygulanır)
        var orders = await uow.Orders.SearchAsync(
            siparisNo:   f.SiparisNo,
            musteriAd:   f.MusteriAd,
            kullaniciID: f.KullaniciID,
            ulke:        f.MUlke,
            asama:       f.Asama,
            kontrol:     f.Kontrol,       // PROMPT-v4 §3 — Kontrol Durumu filtresi
            odemeDurum:  f.OdemeDurum,    // PROMPT-v4 §3 — Ödeme Durumu filtresi
            baslangic:   f.BaslangicTarih,
            bitis:       f.BitisTarih);

        var filtered = string.IsNullOrWhiteSpace(f.ParaTipi)
            ? orders
            : orders.Where(o => o.ParaTipi == f.ParaTipi).ToList();

        int total = filtered.Count;
        int page  = Math.Max(1, f.Page);
        int size  = Math.Clamp(f.PageSize, 1, 200);

        var items = filtered
            .Skip((page - 1) * size)
            .Take(size)
            .Select(o => MapToListDto(o))
            .ToList()
            .AsReadOnly();

        return new OrderListPageDto(items, total, page, size);
    }

    public async Task<IReadOnlyList<OrderApprovalDto>> GetApprovalHistoryAsync(string siparisNo)
    {
        var no = NormalizeToSiparisNo(siparisNo);
        var rows = await uow.OrderApprovals.GetBySiparisNoAsync(no);

        // Kullanıcı adlarını tek seferde çek
        var users = (await uow.Kullanicilar.GetAllAsync())
            .ToDictionary(u => u.KullaniciID, u => u.KullaniciAdi);

        return rows
            .Select(r => new OrderApprovalDto(
                r.OnayID, r.SiparisNo, r.KullaniciID,
                users.TryGetValue(r.KullaniciID, out var n) ? n : null,
                r.OnayDurumu, r.Aciklama, r.OnayTarih))
            .ToList()
            .AsReadOnly();
    }

    public async Task SubmitForApprovalAsync(string siparisNo, int kullaniciID)
    {
        var no = NormalizeToSiparisNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        order.Kontrol = "Kontrol";
        uow.Orders.Update(order);

        // Paket 2 — UPSERT (uk_siparis_kullanici duplicate engellemek için)
        await uow.OrderApprovals.UpsertAsync(no, kullaniciID, "Beklemede", "Onaya gönderildi");
        await uow.SaveChangesAsync();
    }

    public async Task ApproveOrderAsync(string siparisNo, int kullaniciID, string? aciklama)
    {
        var no = NormalizeToSiparisNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        // PROMPT-v4 §5.1 guard'ları (legacy WHERE Kontrol <> 'Onay'
        // AND SiparisMiTeklifMi IN ('Teklif','Siparis') birebir):
        if (order.Kontrol == "Onay" ||
            order.SiparisMiTeklifMi is not ("Teklif" or "Siparis"))
            throw new BusinessException("Kayıt bulunamadı veya zaten Onay durumunda.");

        order.Kontrol = "Onay";
        // PROMPT-v4 §5.1 — BİLİNÇLİ legacy sapması: onay Teklif/Siparis'i doğrudan
        // Planlama'ya taşır; sipariş Muhasebe adımı beklemeden Fabrika kuyruğuna düşer.
        order.SiparisMiTeklifMi = "Planlama";

        uow.Orders.Update(order);

        await uow.OrderApprovals.UpsertAsync(no, kullaniciID, "Onaylandi", aciklama);
        await uow.SaveChangesAsync();
    }

    public async Task RejectOrderAsync(string siparisNo, int kullaniciID, string aciklama)
    {
        if (string.IsNullOrWhiteSpace(aciklama))
            throw new BusinessException("Red gerekçesi zorunludur.");

        var no = NormalizeToSiparisNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        // PROMPT-v4 §5.2 — legacy WHERE guard'ları (Kontrol <> 'Onay' AND
        // SiparisMiTeklifMi IN ('Teklif','Siparis')); 0 satır = iş hatası.
        if (order.Kontrol == "Onay" ||
            order.SiparisMiTeklifMi is not ("Teklif" or "Siparis"))
            throw new BusinessException(
                "İşlem yapılamadı! Sipariş zaten Onay durumunda olabilir veya Teklif/Sipariş değil.");

        // BIREBIR WinForms KontrolRed: Kontrol="Reddet" + Red kolonu
        order.Kontrol = "Reddet";
        order.Red     = aciklama;
        uow.Orders.Update(order);

        await uow.OrderApprovals.UpsertAsync(no, kullaniciID, "Reddedildi", aciklama);
        await uow.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROMPT-v4 §5.4 / §5.5 — Kontrol ekranı mutasyonları
    // ─────────────────────────────────────────────────────────────────────────

    public async Task UpdatePaidAmountAsync(string siparisNo, decimal odenenMiktar)
    {
        // Legacy button2_Click_2: UPDATE SiparisAlTablo SET OdenenMiktar=@x WHERE SiparisNo=@no
        if (odenenMiktar < 0)
            throw new BusinessException("Geçerli bir ödenen bakiye girin.");

        var order = await uow.Orders.GetByNoAsync(NormalizeToSiparisNo(siparisNo))
            ?? throw new NotFoundException("Order", siparisNo);

        order.OdenenMiktar = odenenMiktar;
        uow.Orders.Update(order);
        await uow.SaveChangesAsync();
    }

    public async Task UpdateStageAsync(string siparisNo, UpdateStageDto dto)
    {
        // Legacy fabrikaButton_Click_1: aşama + kontrol + STarih + KontrolNot tek UPDATE.
        if (string.IsNullOrWhiteSpace(dto.Asama))
            throw new BusinessException("Aşama boş olamaz.");

        var order = await uow.Orders.GetByNoAsync(NormalizeToSiparisNo(siparisNo))
            ?? throw new NotFoundException("Order", siparisNo);

        order.SiparisMiTeklifMi = dto.Asama;
        order.Kontrol           = dto.Asama.Equals("Iptal", StringComparison.OrdinalIgnoreCase)
                                      ? "Reddet" : "Onay";
        order.STarih            = dto.STarih;
        order.KontrolNot        = dto.KontrolNot?.Trim();

        uow.Orders.Update(order);
        await uow.SaveChangesAsync();
    }

    public async Task<string> CloneFromExistingAsync(int kullaniciID, string sourceNo)
    {
        // FormGetir.cs portu: kaynak siparişi okur, başlık/items'i kopyalar, yeni numara üretir.
        var src = await uow.Orders.GetByNoAsync(NormalizeToSiparisNo(sourceNo))
            ?? throw new NotFoundException("Order", sourceNo);

        // Kaynaktan CreateOrderDto'ya minimum dolum (header alanları + items)
        var dto = new CreateOrderDto(
            MusteriAd:      src.MusteriAd,
            SiparisNotu:    src.SiparisNotu,
            STelefon:       src.STelefon, SFax: src.SFax, SWeb: src.SWeb,
            SE_Mail:        src.SE_Mail, SVatNumarasi: src.SVatNumarasi,
            SUlke:          src.SUlke,   SAdres:        src.SAdres,
            MontajVar:      src.Montaj   == "Var",
            MontajFiyat:    src.MontajFiyat ?? 0,
            MAdet:          src.MAdet,
            TeslimatVar:    src.Teslimat == "Var",
            TeslimatFiyat:  src.TeslimatFiyat ?? 0,
            MTeslimat:      src.MTeslimat,
            TeslimatCesiti: src.TeslimatÇeşiti,
            TTeslimAlanAdi: src.TTeslimAlanAdi, TIlgiliKisi: src.TIlgiliKisi,
            TTelefon: src.TTelefon, TAltTelefon: src.TAltTelefon,
            TE_Mail: src.TE_Mail, TVATNumarasi: src.TVATNumarasi,
            TZipKod: src.TZipKod, TUlke: src.TUlke, TAdres: src.TAdres,
            MTelefon: src.MTelefon, MMail: src.MMail, MUlke: src.MUlke,
            MVATNumarasi: src.MVATNumarasi, MZipKod: src.MZipKod, MAdres: src.MAdres,
            ParaTipi: src.ParaTipi,
            // PROMPT-v2 §3: nullable DTO — kaynaktaki NULL "boş" anlamı korunur.
            Indirim:  src.Indirim,
            Kdv:      src.Kdv,
            PesinYuzde: src.PesinYüzde,
            Sets: src.Items
                    .Where(i => i.KategoriID.HasValue)
                    .Select(i => new OrderSetDto(
                        KategoriID:     i.KategoriID!.Value,
                        Adet:           i.Adet,
                        KategoriFiyat:  i.Fiyat ?? 0,
                        Components:     src.Items
                            .Where(c => c.BilesenID.HasValue)
                            .Select(c => new OrderItemDto(
                                null, c.BilesenID, c.OznitelikAdi, c.Adet, c.Fiyat))
                            .ToList()))
                    .ToList(),
            Details: src.Details.Select(d => d.Text).ToList(),
            Sirket:  src.Sirket ?? "Unixpadel",
            EkBase64: null   // FormGetir: Ek/MuhasebeEk klonlanmaz (sıfırlanır)
        );

        // Yeni numara: SaveAsync kendi üretir (existingOrder=null)
        return await SaveAsync(kullaniciID, dto, isTeklif: false, existingOrder: null);
    }

    public async Task ExpandRecipeAsync(string siparisNo, int kategoriID, int adet)
    {
        // SiparisForm "Reçeteden Aç": kategorinin BoM'unu okur, SiparisIslemTablo'ya
        // bir kategori satırı + N bileşen satırı yazar (mevcut SaveAsync ile aynı şekil).
        if (adet < 1) throw new BusinessException("Adet en az 1 olmalı.");

        var no = NormalizeToSiparisNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        var cat = await uow.ProductCategories.GetWithComponentsAsync(kategoriID)
            ?? throw new NotFoundException("Category", kategoriID);

        var rows = new List<OrderItem>
        {
            // Kategori-seviyesi satırı
            new() {
                SiparisNo = order.SiparisNo, TeklifNo = order.TeklifNo,
                KategoriID = kategoriID, BilesenID = null,
                Adet = adet, Fiyat = cat.Fiyat
            }
        };

        foreach (var cc in cat.CategoryComponents)
        {
            rows.Add(new OrderItem
            {
                SiparisNo  = order.SiparisNo, TeklifNo = order.TeklifNo,
                KategoriID = null, BilesenID = cc.BilesenID,
                OznitelikAdi = null,
                Adet = cc.Adet * adet,                 // BoM × kategori adedi
                Fiyat = cc.Component?.Fiyat ?? 0
            });
        }

        await uow.Orders.AddItemsAsync(rows);
        await uow.SaveChangesAsync();
    }

    public async Task<MaterialCostDto> ComputeMaterialCostAsync(string siparisNo)
    {
        var no = NormalizeToSiparisNo(siparisNo);
        var costs = await uow.ProductCosts.GetBySiparisNoAsync(no);

        var cats = (await uow.ProductCategories.GetAllAsync())
            .ToDictionary(c => c.KategoriID, c => c.KategoriAdi);

        var lines = costs
            .Select(c => new MaterialCostLineDto(
                c.KategoriID,
                cats.TryGetValue(c.KategoriID, out var n) ? n : null,
                c.Malzeme, c.Iscilik, c.Nakliye, c.Diger,
                c.Malzeme + c.Iscilik + c.Nakliye + c.Diger))
            .ToList()
            .AsReadOnly();

        return new MaterialCostDto(no, lines.Sum(l => l.Toplam), lines);
    }

    public async Task<OrderTotalsDto> GetTotalsByCurrencyAsync(OrderFilterDto f)
    {
        var orders = await uow.Orders.SearchAsync(
            siparisNo:   f.SiparisNo,
            musteriAd:   f.MusteriAd,
            kullaniciID: f.KullaniciID,
            ulke:        f.MUlke,
            asama:       f.Asama,
            kontrol:     null,
            odemeDurum:  null,
            baslangic:   f.BaslangicTarih,
            bitis:       f.BitisTarih);

        decimal sumByCurrency(string p) =>
            orders.Where(o => o.ParaTipi == p).Sum(o => o.ToplamFiyat ?? 0m);

        return new OrderTotalsDto(
            Euro:    sumByCurrency("Euro"),
            Dolar:   sumByCurrency("Dolar"),
            TL:      sumByCurrency("TL"),
            Sterlin: sumByCurrency("Sterlin"),
            OrderCount: orders.Count);
    }

    public async Task UploadAttachmentAsync(string siparisNo, string type, byte[] data)
    {
        var no = NormalizeToSiparisNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        switch (type?.ToLowerInvariant())
        {
            case "ek":         order.Ek         = data; break;
            case "muhasebeek": order.MuhasebeEk = data; break;   // Faz 5'te açıldı
            default:           throw new BusinessException($"Geçersiz ek tipi: {type}. (ek|muhasebeek)");
        }

        uow.Orders.Update(order);
        await uow.SaveChangesAsync();
    }

    public async Task<byte[]?> GetAttachmentAsync(string siparisNo, string type)
    {
        var no = NormalizeToSiparisNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        return type?.ToLowerInvariant() switch
        {
            "ek"         => order.Ek,
            "muhasebeek" => order.MuhasebeEk,
            _            => throw new BusinessException($"Geçersiz ek tipi: {type}. (ek|muhasebeek)")
        };
    }

    public async Task<byte[]> GenerateExcelAsync(string siparisNo)
    {
        // ExcelIndir BLOB template entity'leşmedi (Faz 8 cila). Şimdilik fallback:
        // ClosedXML ile sade özet xlsx üret. (Rapor: faz3-rapor.md "Excel template" notu.)
        var no = NormalizeToSiparisNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Sipariş");
        ws.Cell(1, 1).Value = "Sipariş No";  ws.Cell(1, 2).Value = order.SiparisNo;
        ws.Cell(2, 1).Value = "Teklif No";   ws.Cell(2, 2).Value = order.TeklifNo;
        ws.Cell(3, 1).Value = "Müşteri";     ws.Cell(3, 2).Value = order.MusteriAd;
        ws.Cell(4, 1).Value = "Tarih";       ws.Cell(4, 2).Value = order.Tarih.ToString("yyyy-MM-dd");
        ws.Cell(5, 1).Value = "Para Tipi";   ws.Cell(5, 2).Value = order.ParaTipi;
        ws.Cell(6, 1).Value = "Toplam";      ws.Cell(6, 2).Value = (double)(order.ToplamFiyat ?? 0);

        ws.Cell(8, 1).Value = "Bileşen ID";
        ws.Cell(8, 2).Value = "Kategori ID";
        ws.Cell(8, 3).Value = "Öznitelik";
        ws.Cell(8, 4).Value = "Adet";
        ws.Cell(8, 5).Value = "Fiyat";
        ws.Range("A8:E8").Style.Font.Bold = true;

        int row = 9;
        foreach (var i in order.Items)
        {
            ws.Cell(row, 1).Value = i.BilesenID;
            ws.Cell(row, 2).Value = i.KategoriID;
            ws.Cell(row, 3).Value = i.OznitelikAdi;
            ws.Cell(row, 4).Value = i.Adet;
            ws.Cell(row, 5).Value = (double)(i.Fiyat ?? 0);
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
