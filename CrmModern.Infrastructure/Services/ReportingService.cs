using System.Globalization;
using ClosedXML.Excel;
using CrmModern.Core.DTOs.Dashboard;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Generates Excel workbooks.
/// Implements the logic from Muhasebe.cs excelYazOzet_Click and Kontrol.cs excelYazOzet_Click.
/// Uses ClosedXML instead of COM Interop — no Excel installation required on the server.
/// </summary>
internal sealed class ReportingService(IUnitOfWork uow, IMemoryCache cache) : IReportingService
{
    // Faz 8.11 — Dashboard sorgu cache TTL'i. Test ortamında 60 sn yeterli;
    // gerçek üretim trafiği için artırılabilir/azaltılabilir.
    private static readonly TimeSpan DashboardTtl = TimeSpan.FromSeconds(60);

    // ── Currency symbol helper (matches WinForms ParaTipi logic) ─────────────────
    private static string CurrencySymbol(string paraTipi) => paraTipi switch
    {
        "Euro"    => "€",
        "Dolar"   => "$",
        "TL"      => "₺",
        "Sterlin" => "£",
        _         => paraTipi
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // EXPORT 1: Accounting orders list  (Muhasebe form — özet liste)
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<byte[]> ExportAccountingOrdersAsync()
    {
        var orders = await uow.Orders.GetAccountingOrdersAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Muhasebe");

        // ── Header row ─────────────────────────────────────────────────────────
        var headers = new[]
        {
            "Sipariş No", "Müşteri Adı", "Ülke", "Para Birimi",
            "Toplam Fiyat", "Kapora Bakiyesi", "Kalan Bakiye",
            "Ödenen Miktar", "Ödeme Durumu", "Maliyet", "Kâr",
            "Muhasebe Durumu", "Tarih"
        };

        for (int c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(68, 114, 196);
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // ── Data rows ──────────────────────────────────────────────────────────
        int row = 2;
        foreach (var o in orders)
        {
            decimal odenen      = o.OdenenMiktar ?? 0m;
            decimal toplam      = o.ToplamFiyat  ?? 0m;
            decimal pesinOran   = o.PesinYüzde / 100m;
            decimal kaparo      = Math.Max(toplam * pesinOran - odenen, 0m);
            decimal kalanBakiye = toplam - odenen;

            // fetch Muhasebe purchase request
            var pr = string.IsNullOrEmpty(o.SiparisNo)
                ? null
                : await uow.PurchaseRequests.GetMuhasebeBySiparisNoAsync(o.SiparisNo);

            decimal? maliyet = pr?.Maliyet;
            decimal? kar     = pr != null ? (toplam - (pr.Maliyet ?? 0m)) : null;

            ws.Cell(row, 1).Value  = o.SiparisNo;
            ws.Cell(row, 2).Value  = o.MusteriAd;
            ws.Cell(row, 3).Value  = o.MUlke ?? "";
            ws.Cell(row, 4).Value  = o.ParaTipi;
            ws.Cell(row, 5).Value  = (double)toplam;
            ws.Cell(row, 6).Value  = (double)kaparo;
            ws.Cell(row, 7).Value  = (double)kalanBakiye;
            ws.Cell(row, 8).Value  = (double)odenen;
            ws.Cell(row, 9).Value  = o.OdemeDurum ?? "";
            ws.Cell(row, 10).Value = maliyet.HasValue ? (double)maliyet.Value : 0d;
            ws.Cell(row, 11).Value = kar.HasValue ? (double)kar.Value : 0d;
            ws.Cell(row, 12).Value = pr?.Durum ?? "";
            ws.Cell(row, 13).Value = o.Tarih.ToString("dd.MM.yyyy");

            // Color coding: Onaylandı=green, Reddedildi=red, Onay Bekliyor=yellow
            if (pr != null)
            {
                var rowRange = ws.Range(row, 1, row, headers.Length);
                rowRange.Style.Fill.BackgroundColor = pr.Durum switch
                {
                    "Onaylandı"    => XLColor.FromArgb(198, 239, 206),
                    "Reddedildi"   => XLColor.FromArgb(255, 199, 206),
                    "Onay Bekliyor"=> XLColor.FromArgb(255, 235, 156),
                    _              => XLColor.NoColor
                };
            }

            row++;
        }

        // ── Format numeric columns ─────────────────────────────────────────────
        foreach (int col in new[] { 5, 6, 7, 8, 10, 11 })
            ws.Column(col).Style.NumberFormat.Format = "#,##0.00";

        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXPORT 2: Single order proforma  (Kontrol.cs / Muhasebe.cs excelYazOzet_Click)
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<byte[]> ExportOrderProformaAsync(string siparisNo)
    {
        // Normalize: accept T-prefixed TeklifNo
        string sno = siparisNo.StartsWith('T') ? "S" + siparisNo[1..] : siparisNo;

        var order = await uow.Orders.GetByNoAsync(sno)
            ?? throw new KeyNotFoundException($"Order '{siparisNo}' not found.");

        // ── Faz 8 / Hotfix Proforma: ExcelIndir BLOB template varsa onu kullan ─
        var templateBytes = await uow.ExcelTemplates.GetLatestBytesAsync();
        if (templateBytes is { Length: > 0 })
        {
            // Categories + Components için bir kerelik in-memory lookup —
            // ProForma satır şablonu kategori adı / bileşen adı + birim gerektirir.
            var allCategories = await uow.ProductCategories.GetAllAsync();
            var allComponents = await uow.Components.GetAllAsync();
            var catLookup = allCategories.ToDictionary(c => c.KategoriID, c => c.KategoriAdi);
            var compLookup = allComponents.ToDictionary(c => c.BilesenID, c => c);

            try
            {
                return GenerateProformaFromTemplate(templateBytes, order, catLookup, compLookup);
            }
            catch
            {
                // Template uygulanamazsa ClosedXML fallback'e düş — kullanıcı asla "boş Excel" görmesin.
            }
        }

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Proforma");

        string sym = CurrencySymbol(order.ParaTipi);

        // ── Header block ───────────────────────────────────────────────────────
        ws.Cell("A1").Value = "UNIX PADEL - PROFORMA";
        ws.Cell("A1").Style.Font.Bold = true;
        ws.Cell("A1").Style.Font.FontSize = 16;
        ws.Range("A1:G1").Merge();

        ws.Cell("A2").Value = $"Sipariş No: {order.SiparisNo}";
        ws.Cell("D2").Value = $"Tarih: {order.Tarih:dd.MM.yyyy}";

        // ── Customer block ─────────────────────────────────────────────────────
        ws.Cell("A4").Value  = "MÜŞTERİ BİLGİLERİ"; ws.Cell("A4").Style.Font.Bold = true;
        ws.Cell("A5").Value  = "Müşteri Adı:";    ws.Cell("B5").Value = order.MusteriAd;
        ws.Cell("A6").Value  = "Ülke:";           ws.Cell("B6").Value = order.MUlke ?? "";
        ws.Cell("A7").Value  = "Telefon:";        ws.Cell("B7").Value = order.MTelefon ?? "";
        ws.Cell("A8").Value  = "E-Mail:";         ws.Cell("B8").Value = order.MMail ?? "";
        ws.Cell("A9").Value  = "VAT No:";         ws.Cell("B9").Value = order.MVATNumarasi ?? "";
        ws.Cell("A10").Value = "Adres:";          ws.Cell("B10").Value = order.MAdres ?? "";

        // ── Delivery block ─────────────────────────────────────────────────────
        if (order.Teslimat == "Var")
        {
            ws.Cell("D4").Value  = "TESLİMAT BİLGİLERİ"; ws.Cell("D4").Style.Font.Bold = true;
            ws.Cell("D5").Value  = "Teslim Alan:";    ws.Cell("E5").Value = order.TTeslimAlanAdi ?? "";
            ws.Cell("D6").Value  = "İlgili Kişi:";   ws.Cell("E6").Value = order.TIlgiliKisi ?? "";
            ws.Cell("D7").Value  = "Ülke:";           ws.Cell("E7").Value = order.TUlke ?? "";
            ws.Cell("D8").Value  = "Telefon:";        ws.Cell("E8").Value = order.TTelefon ?? "";
            ws.Cell("D9").Value  = "E-Mail:";         ws.Cell("E9").Value = order.TE_Mail ?? "";
            ws.Cell("D10").Value = "Adres:";          ws.Cell("E10").Value = order.TAdres ?? "";
        }

        // ── Product / Component table header ───────────────────────────────────
        int tableStart = 13;
        ws.Cell(tableStart, 1).Value = "Ürün / Bileşen";
        ws.Cell(tableStart, 2).Value = "Birim";
        ws.Cell(tableStart, 3).Value = "Adet";
        ws.Cell(tableStart, 4).Value = $"Birim Fiyat ({sym})";
        ws.Cell(tableStart, 5).Value = $"Toplam Fiyat ({sym})";
        var headerRow = ws.Range(tableStart, 1, tableStart, 5);
        headerRow.Style.Font.Bold = true;
        headerRow.Style.Fill.BackgroundColor = XLColor.FromArgb(68, 114, 196);
        headerRow.Style.Font.FontColor = XLColor.White;

        int r = tableStart + 1;

        foreach (var item in order.Items)
        {
            if (item.KategoriID.HasValue && !item.BilesenID.HasValue)
            {
                // Category row
                decimal setFiyat = item.Fiyat ?? 0m;
                decimal birimFiyat = item.Adet > 0 ? setFiyat / item.Adet : setFiyat;

                ws.Cell(r, 1).Value = $"SET {item.KategoriID}";
                ws.Cell(r, 2).Value = "SET";
                ws.Cell(r, 3).Value = item.Adet;
                ws.Cell(r, 4).Value = (double)birimFiyat;
                ws.Cell(r, 5).Value = (double)setFiyat;
                ws.Cell(r, 1).Style.Font.Bold = true;
                r++;
            }
            else if (item.BilesenID.HasValue)
            {
                // Component row
                string display = string.IsNullOrEmpty(item.OznitelikAdi)
                    ? $"  Bileşen {item.BilesenID}"
                    : $"  {item.OznitelikAdi}";

                decimal compFiyat = item.Fiyat ?? 0m;
                decimal birimFiyat = item.Adet > 0 && compFiyat > 0
                    ? compFiyat / item.Adet : compFiyat;

                ws.Cell(r, 1).Value = display;
                ws.Cell(r, 3).Value = item.Adet;
                ws.Cell(r, 4).Value = (double)birimFiyat;
                ws.Cell(r, 5).Value = (double)compFiyat;
                r++;
            }
        }

        // ── Transport / Installation rows ──────────────────────────────────────
        if (order.Teslimat == "Var" && order.TeslimatFiyat > 0)
        {
            decimal tp = order.TeslimatFiyat ?? 0m;
            decimal tUnit = order.MTeslimat > 0 ? tp / order.MTeslimat : tp;
            ws.Cell(r, 1).Value = "Nakliye";
            ws.Cell(r, 3).Value = order.MTeslimat;
            ws.Cell(r, 4).Value = (double)tUnit;
            ws.Cell(r, 5).Value = (double)tp;
            ws.Cell(r, 1).Style.Font.Italic = true;
            r++;
        }
        if (order.Montaj == "Var" && order.MontajFiyat > 0)
        {
            decimal mp = order.MontajFiyat ?? 0m;
            decimal mUnit = order.MAdet > 0 ? mp / order.MAdet : mp;
            ws.Cell(r, 1).Value = "Montaj";
            ws.Cell(r, 3).Value = order.MAdet;
            ws.Cell(r, 4).Value = (double)mUnit;
            ws.Cell(r, 5).Value = (double)mp;
            ws.Cell(r, 1).Style.Font.Italic = true;
            r++;
        }

        r++; // blank row

        // ── Pricing summary ────────────────────────────────────────────────────
        decimal brut  = order.BrutToplamFiyat ?? 0m;
        decimal indir = order.Indirim ?? 0m;
        decimal kdv   = order.Kdv    ?? 0m;
        decimal total = order.ToplamFiyat ?? 0m;

        ws.Cell(r, 4).Value = $"Brüt Toplam ({sym}):";    ws.Cell(r, 4).Style.Font.Bold = true;
        ws.Cell(r, 5).Value = (double)brut;               r++;
        if (indir > 0)
        {
            ws.Cell(r, 4).Value = $"İndirim ({sym}):";    ws.Cell(r, 4).Style.Font.Bold = true;
            ws.Cell(r, 5).Value = -(double)indir;         r++;
        }
        if (kdv > 0)
        {
            ws.Cell(r, 4).Value = $"KDV (%{kdv}):";      ws.Cell(r, 4).Style.Font.Bold = true;
            ws.Cell(r, 5).Value = (double)((brut - indir) * kdv / 100m); r++;
        }
        ws.Cell(r, 4).Value = $"TOPLAM ({sym}):";
        ws.Cell(r, 5).Value = (double)total;
        ws.Range(r, 4, r, 5).Style.Font.Bold = true;
        ws.Range(r, 4, r, 5).Style.Fill.BackgroundColor = XLColor.FromArgb(68, 114, 196);
        ws.Range(r, 4, r, 5).Style.Font.FontColor = XLColor.White;
        r++;

        // Payment terms
        r++;
        ws.Cell(r, 1).Value = $"Ödeme: %{order.PesinYüzde} peşin, %{100 - order.PesinYüzde} yükleme öncesi";
        ws.Cell(r, 1).Style.Font.Italic = true;

        // Details
        if (order.Details.Any())
        {
            r += 2;
            ws.Cell(r, 1).Value = "Notlar:"; ws.Cell(r, 1).Style.Font.Bold = true;
            foreach (var detail in order.Details)
            {
                r++;
                ws.Cell(r, 1).Value = $"• {detail.Text}";
            }
        }

        // ── Format numeric columns ─────────────────────────────────────────────
        ws.Column(4).Style.NumberFormat.Format = "#,##0.00";
        ws.Column(5).Style.NumberFormat.Format = "#,##0.00";
        ws.Columns().AdjustToContents();
        ws.Column(1).Width = Math.Max(ws.Column(1).Width, 35);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Hotfix Proforma — ExcelIndir BLOB template substitution (WinForms BIREBIR)
    //
    // Kaynak: SiparisForm.cs previewButton_Click (3408+) ve Form3.cs excelYaz_Click (2810+).
    // Pattern: DB'deki .xlsx şablonunu in-memory aç, `#URUN`/`#MIKTAR`/`#BIRIM`/
    // `#BIRIMFIYAT`/`#FIYAT` 5-cell şablon satırını her sipariş item'ı için klonla,
    // header placeholder'larını tek tek replace et, koşullu satırları (montaj, teslimat,
    // indirim/kdv) gerekmiyorsa sil. ExcelIndir tablosunda template yoksa fallback
    // hard-coded ClosedXML akışına dönülür.
    // ─────────────────────────────────────────────────────────────────────────────

    private static readonly CultureInfo TrTR = CultureInfo.GetCultureInfo("tr-TR");

    private static string SirketDisplay(string? sirket) => (sirket ?? string.Empty).Trim() switch
    {
        "ArsSport"  => "ARS SPORT",
        "AselCocuk" => "Asel Çocuk",
        // "Unixpadel" + her şey (boş dahil) → varsayılan UNIXPADEL
        _ => "UNIXPADEL KORT VE ZEMINLERI URETIMI INSAATI VE SANAYI A.S.",
    };

    private static string ToplamParaBirimi(string paraTipi) => paraTipi switch
    {
        "Euro"    => "TOTAL EURO",
        "Dolar"   => "TOTAL DOLAR",
        "TL"      => "TOTAL TL",
        "Sterlin" => "TOTAL STERLIN",
        _         => "TOTAL " + paraTipi,
    };

    private static byte[] GenerateProformaFromTemplate(
        byte[] templateBytes,
        Core.Entities.Order order,
        IReadOnlyDictionary<int, string> catLookup,
        IReadOnlyDictionary<int, Component> compLookup)
    {
        using var inMs = new MemoryStream(templateBytes, writable: false);
        using var wb   = new XLWorkbook(inMs);
        var ws = wb.Worksheets.First();

        string sym        = CurrencySymbol(order.ParaTipi);
        string paraBirimi = sym + " ";

        string siparisNo = order.SiparisMiTeklifMi == "Teklif"
            ? (string.IsNullOrEmpty(order.TeklifNo) ? order.SiparisNo : order.TeklifNo)
            : (string.IsNullOrEmpty(order.SiparisNo) ? order.TeklifNo : order.SiparisNo);

        // ── 1) Items table — WinForms 5-cell pattern  ─────────────────────────
        // Tek bir #URUN satırı şablonu var; her item için bir satır insert et,
        // şablonu klonla, alt satırı placeholder'ları korusun diye olduğu gibi bırak.
        // Sonunda kalan #URUN satırı silinir (rowsToDelete).
        var urunCell = ws.CellsUsed()
            .FirstOrDefault(c => string.Equals(c.GetString().Trim(), "#URUN", StringComparison.OrdinalIgnoreCase));

        if (urunCell is not null)
        {
            // Items'ları DB sırasına göre çek — kategori + altındaki bileşenler
            // bu sırayla insert edildiği için sıralama anlam taşır.
            var items = order.Items.OrderBy(i => i.SiparisIslemID).ToList();
            int firstRow = urunCell.Address.RowNumber;

            // İlk şablon satırı zaten yerinde — items.Count satır gerekiyor (1 zaten var, n-1 ekle)
            // Aşağıya doğru çoğalt; orijinal şablon satırı en sonda kalır ve silinir.
            for (int i = 0; i < items.Count; i++)
            {
                ws.Row(firstRow + i).InsertRowsBelow(1);
                ws.Row(firstRow).CopyTo(ws.Row(firstRow + i + 1));
            }

            // Şablondan ürettiğimiz satırların ilk N tanesini doldur
            for (int i = 0; i < items.Count; i++)
            {
                int row = firstRow + i;
                var item = items[i];

                bool isCategory = item.KategoriID.HasValue && !item.BilesenID.HasValue;
                decimal fiyat = item.Fiyat ?? 0m;

                string urunText, birimText, birimFiyatText, fiyatText;

                if (isCategory)
                {
                    catLookup.TryGetValue(item.KategoriID!.Value, out var name);
                    urunText  = !string.IsNullOrEmpty(name) ? name : $"SET #{item.KategoriID}";
                    birimText = "SET";
                    decimal birim = item.Adet > 0 ? fiyat / item.Adet : fiyat;
                    birimFiyatText = paraBirimi + birim.ToString("N2", TrTR);
                    fiyatText      = paraBirimi + fiyat.ToString("N2", TrTR);
                }
                else
                {
                    Component? comp = item.BilesenID.HasValue && compLookup.TryGetValue(item.BilesenID.Value, out var c) ? c : null;
                    string bname = comp?.BilesenAdi ?? $"Bileşen #{item.BilesenID}";
                    urunText = string.IsNullOrEmpty(item.OznitelikAdi)
                        ? bname
                        : item.OznitelikAdi + " " + bname;
                    birimText = comp?.Birim ?? string.Empty;
                    birimFiyatText = string.Empty;   // WinForms: bileşen satırında birim/toplam fiyat boş
                    fiyatText      = string.Empty;
                }

                var rowMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["#URUN"]       = urunText,
                    ["#MIKTAR"]     = item.Adet.ToString(TrTR),
                    ["#BIRIM"]      = birimText,
                    ["#BIRIMFIYAT"] = birimFiyatText,
                    ["#FIYAT"]      = fiyatText,
                };

                foreach (var cell in ws.Row(row).CellsUsed().ToList())
                {
                    var v = cell.GetString().Trim();
                    if (rowMap.TryGetValue(v, out var val))
                        cell.Value = val;
                }
            }
        }

        // ── 2) Header / metadata + koşullu satırlar ───────────────────────────
        var headerMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["#SIPARISNO"]        = siparisNo,
            ["#TARIH"]            = order.Tarih.ToString("dd.MM.yyyy", TrTR),
            ["#MUSTERI"]          = order.MusteriAd,
            ["#MUSTERIADRES"]     = order.MAdres ?? string.Empty,
            ["#MUSTERINUMBER"]    = order.MTelefon ?? string.Empty,
            ["#MUSTERIEMAIL"]     = order.MMail ?? string.Empty,
            ["#MUSTERIVATNUMBER"] = order.MVATNumarasi ?? string.Empty,
            ["#MUSTERIZIPKODU"]   = order.MZipKod ?? string.Empty,
            ["#SIRKET"]           = SirketDisplay(order.Sirket),
            ["#SIRKETALT"]        = SirketDisplay(order.Sirket),
            ["#TOPLAMPARABIRIMI"] = ToplamParaBirimi(order.ParaTipi),
            ["#BRUTTOPLAMFIYAT"]  = paraBirimi + (order.BrutToplamFiyat ?? 0m).ToString("N2", TrTR),
            ["#TOPLAMFIYAT"]      = paraBirimi + (order.ToplamFiyat ?? 0m).ToString("N2", TrTR),
            ["#LUTFENSADECEORAN"] = $"PLEASE PAY ONLY: %{order.PesinYüzde}",
            ["#ODEMEORANI"]       = $"payment: %{order.PesinYüzde} cash, %{100 - order.PesinYüzde} before loading",
        };

        bool teslimatVar = order.Teslimat == "Var" && (order.TeslimatFiyat ?? 0m) > 0m;
        bool montajVar   = order.Montaj   == "Var" && (order.MontajFiyat   ?? 0m) > 0m;
        decimal indirim  = order.Indirim ?? 0m;
        decimal kdv      = order.Kdv     ?? 0m;

        var rowsToDelete = new HashSet<int>();

        foreach (var cell in ws.CellsUsed().ToList())
        {
            var v = cell.GetString().Trim();
            if (string.IsNullOrEmpty(v) || v[0] != '#') continue;

            // Tek-değer header placeholder'ları
            if (headerMap.TryGetValue(v, out var rep))
            {
                cell.Value = rep;
                continue;
            }

            switch (v.ToUpperInvariant())
            {
                // ── Teslimat ────────────────────────────────────────────────
                case "#TESLIMATADRES":
                    if (teslimatVar && !string.IsNullOrEmpty(order.TAdres))
                        cell.Value = "Delivered Address: " + order.TAdres;
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;
                case "#TESLIMATZIPKOD":
                    if (teslimatVar && !string.IsNullOrEmpty(order.TZipKod))
                        cell.Value = order.TZipKod;
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;
                case "#TESLIMAT":
                    if (teslimatVar) cell.Value = "Transport cost";
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;
                case "#TESLIMATMIKTAR":
                    if (teslimatVar) cell.Value = order.MTeslimat;
                    break;
                case "#TESLIMATBIRIMFIYAT":
                    if (teslimatVar && order.MTeslimat > 0)
                        cell.Value = paraBirimi + ((order.TeslimatFiyat ?? 0m) / order.MTeslimat).ToString("N2", TrTR);
                    break;
                case "#TESLIMATFIYAT":
                    if (teslimatVar)
                        cell.Value = paraBirimi + (order.TeslimatFiyat ?? 0m).ToString("N2", TrTR);
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;
                case "#TESLIMATCESITI":
                    if (!string.IsNullOrEmpty(order.TeslimatÇeşiti))
                        cell.Value = "Delivery Type: " + order.TeslimatÇeşiti;
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;

                // ── Montaj ──────────────────────────────────────────────────
                case "#MONTAJ":
                    if (montajVar) cell.Value = "Installation cost";
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;
                case "#MONTAJMIKTAR":
                    if (montajVar) cell.Value = order.MAdet;
                    break;
                case "#MONTAJBIRIMFIYAT":
                    if (montajVar && order.MAdet > 0)
                        cell.Value = paraBirimi + ((order.MontajFiyat ?? 0m) / order.MAdet).ToString("N2", TrTR);
                    break;
                case "#MONTAJFIYAT":
                    if (montajVar)
                        cell.Value = paraBirimi + (order.MontajFiyat ?? 0m).ToString("N2", TrTR);
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;

                // ── İndirim / KDV ───────────────────────────────────────────
                case "#INDIRIM":
                    if (indirim > 0)
                        cell.Value = "Discount: -" + indirim.ToString("N2", TrTR);
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;
                case "#EKSIINDIRIM":
                    if (indirim > 0)
                        cell.Value = "-" + paraBirimi + indirim.ToString("N2", TrTR);
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;
                case "#KDV":
                    if (kdv > 0)
                    {
                        decimal toplam   = order.ToplamFiyat ?? 0m;
                        decimal kdvTutar = toplam * (kdv / 100m);
                        cell.Value = "+ " + kdvTutar.ToString("N2", TrTR) + " % " + ((int)kdv).ToString(TrTR);
                    }
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;

                // ── Detay döngüsü (her detay için hücre ofseti) ─────────────
                case "#DETAY":
                {
                    int rowIdx = 0, colIdx = 0, count = 1;
                    int baseR = cell.Address.RowNumber;
                    int baseC = cell.Address.ColumnNumber;
                    foreach (var d in order.Details)
                    {
                        if (string.IsNullOrWhiteSpace(d.Text)) continue;
                        ws.Cell(baseR + rowIdx, baseC + colIdx).Value = $"{count}. {d.Text}";
                        rowIdx++;
                        count++;
                        if (rowIdx > 10) { rowIdx = 0; colIdx = 1; }
                    }
                    break;
                }

                // ── Items şablon kalıntısı — son satırdaki placeholder marker'ı sil
                case "#URUN":
                case "#MIKTAR":
                case "#BIRIM":
                case "#BIRIMFIYAT":
                case "#FIYAT":
                    rowsToDelete.Add(cell.Address.RowNumber);
                    break;
            }
        }

        // Silinmesi gereken satırlar — aşağıdan yukarıya doğru sil ki indeksler kaymasın
        foreach (var rowNum in rowsToDelete.OrderByDescending(x => x))
            ws.Row(rowNum).Delete();

        using var outMs = new MemoryStream();
        wb.SaveAs(outMs);
        return outMs.ToArray();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // FAZ 7 — DASHBOARD AGGREGATIONS
    // WinForms'taki yorum satırı 4 grafiğin yerine, modern UI için minimum dashboard.
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<DashboardKpiDto> GetDashboardKpisAsync(int currentUserId, string role)
    {
        var cacheKey = $"kpis:{currentUserId}:{role}";
        if (cache.TryGetValue(cacheKey, out DashboardKpiDto? cached) && cached is not null)
            return cached;

        // Paket 1 — DbContext thread-safe değildir; paralel `Task.WhenAll` ile
        // tüm sorguları aynı context üzerinde çalıştırmak InvalidOperationException
        // ("A second operation was started on this context instance") fırlatıyordu.
        // SIRALI await — sorgular zaten ms cinsinden hızlı; paralelden gerçek kazanç yok.
        int siparis30        = await uow.Orders.CountSiparisInLastDaysAsync(30);
        var ciro             = await uow.Orders.SumCiroByCurrencyInLastDaysAsync(30);
        int bekleyenKtrl     = await uow.Orders.CountBekleyenKontrolAsync();
        int uretim           = await uow.Orders.CountUretimdekiAsync();
        int sevk             = await uow.Orders.CountSevkiyatBekleyenAsync();
        int odeme            = await uow.Orders.CountOdemeBekleyenAsync();
        int bekleyenSA       = await uow.PurchaseRequests.CountPendingAsync();
        int kendi            = await uow.Orders.CountAcikSiparisByKullaniciAsync(currentUserId);

        decimal euro    = ciro.TryGetValue("Euro",    out var e) ? e : 0m;
        decimal dolar   = ciro.TryGetValue("Dolar",   out var d) ? d : 0m;
        decimal tl      = ciro.TryGetValue("TL",      out var t) ? t : 0m;
        decimal sterlin = ciro.TryGetValue("Sterlin", out var s) ? s : 0m;

        var result = new DashboardKpiDto(
            Son30GunSiparisSayisi:        siparis30,
            Son30GunCiroEuro:             euro,
            Son30GunCiroDolar:            dolar,
            Son30GunCiroTL:               tl,
            Son30GunCiroSterlin:          sterlin,
            BekleyenKontrolSayisi:        bekleyenKtrl,
            UretimdekiSiparisSayisi:      uretim,
            SevkiyatBekleyenSayisi:       sevk,
            OdemeBekleyenSayisi:          odeme,
            BekleyenSatinAlmaTalepSayisi: bekleyenSA,
            KendiAcikSiparisSayisi:       kendi);

        cache.Set(cacheKey, result, DashboardTtl);
        return result;
    }

    public Task<IReadOnlyList<OrderTrendPointDto>> GetOrdersByMonthAsync(int months = 12) =>
        cache.GetOrCreateAsync($"trend:{months}", e =>
        {
            e.AbsoluteExpirationRelativeToNow = DashboardTtl;
            return uow.Orders.GetOrdersByMonthAsync(months);
        })!;

    public Task<IReadOnlyList<StageDistributionDto>> GetOrdersByStageAsync() =>
        cache.GetOrCreateAsync("stages", e =>
        {
            e.AbsoluteExpirationRelativeToNow = DashboardTtl;
            return uow.Orders.GetOrdersByStageAsync();
        })!;

    public Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(int days = 90, int limit = 10) =>
        cache.GetOrCreateAsync($"top:{days}:{limit}", e =>
        {
            e.AbsoluteExpirationRelativeToNow = DashboardTtl;
            return uow.Orders.GetTopCustomersAsync(days, limit);
        })!;

    public Task<IReadOnlyList<CurrencyDistributionDto>> GetCurrencyDistributionAsync(int days = 90) =>
        cache.GetOrCreateAsync($"currency:{days}", e =>
        {
            e.AbsoluteExpirationRelativeToNow = DashboardTtl;
            return uow.Orders.GetCurrencyDistributionAsync(days);
        })!;
}
