using System.Globalization;
using System.IO.Compression;
using System.Xml.Linq;
using ClosedXML.Excel;
using CrmModern.Core.DTOs.Dashboard;
using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;
using CrmModern.Core.Proforma;
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

    public async Task<byte[]> ExportOrderProformaAsync(string siparisNo, string lang = "tr")
    {
        // Normalize: accept T-prefixed TeklifNo
        string sno = siparisNo.StartsWith('T') ? "S" + siparisNo[1..] : siparisNo;

        var order = await uow.Orders.GetByNoAsync(sno)
            ?? throw new KeyNotFoundException($"Order '{siparisNo}' not found.");

        // ── Faz 8 / Hotfix Proforma: ExcelIndir BLOB template varsa onu kullan ─
        var templateBytes = await uow.ExcelTemplates.GetLatestBytesAsync();
        if (templateBytes is not { Length: > 0 })
        {
            throw new InvalidOperationException("Proforma şablonu (ExcelIndir) bulunamadı.");
        }

        // Categories + Components için bir kerelik in-memory lookup —
        // ProForma satır şablonu kategori adı / bileşen adı + birim gerektirir.
        var allCategories = await uow.ProductCategories.GetAllAsync();
        var allComponents = await uow.Components.GetAllAsync();
        var catLookup = allCategories.ToDictionary(c => c.KategoriID, c => c.KategoriAdi);
        var compLookup = allComponents.ToDictionary(c => c.BilesenID, c => c);

        // Muhasebe ekstra maliyet kalemleri — her biri proformada ayrı satır olur.
        // Tutarları zaten ToplamFiyat'a eklendiği için #TOPLAMFIYAT tekrar toplamaz.
        var extras = await uow.Orders.GetExtraCostsByOrderIdAsync(order.SiparisAlID);

        return GenerateProformaFromTemplate(templateBytes, order, catLookup, compLookup, extras, lang);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PDF proforma — aynı xlsx'i LibreOffice headless ile PDF'e çevirir (birebir görünüm)
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<byte[]> ExportOrderProformaPdfAsync(string siparisNo, string lang = "tr")
    {
        var xlsx = await ExportOrderProformaAsync(siparisNo, lang);
        return XlsxToPdf(xlsx);
    }

    // soffice (LibreOffice) binary; Docker imajında PATH'te. Override için env var.
    private static readonly string SofficePath =
        Environment.GetEnvironmentVariable("LIBREOFFICE_PATH") ?? "soffice";

    /// <summary>
    /// xlsx baytlarını LibreOffice headless ile PDF'e çevirir. Her çağrı için BENZERSİZ
    /// UserInstallation profili kullanılır → eşzamanlı çağrılarda tek-örnek kilidi
    /// (single-instance lock) çakışması olmaz. Geçici dosyalar finally'de temizlenir.
    /// </summary>
    private static byte[] XlsxToPdf(byte[] xlsx)
    {
        var work = Path.Combine(Path.GetTempPath(), "proforma_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(work);
        try
        {
            var xlsxPath = Path.Combine(work, "proforma.xlsx");
            File.WriteAllBytes(xlsxPath, xlsx);
            var profileUri = new Uri(Path.Combine(work, "louser")).AbsoluteUri; // file:///...

            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName               = SofficePath,
                RedirectStandardError  = true,
                RedirectStandardOutput = true,
                UseShellExecute        = false,
                CreateNoWindow         = true,
            };
            foreach (var a in new[]
            {
                "--headless", "--norestore", "--nologo", "--nolockcheck",
                $"-env:UserInstallation={profileUri}",
                "--convert-to", "pdf:calc_pdf_Export",
                "--outdir", work, xlsxPath,
            }) psi.ArgumentList.Add(a);

            using var p = System.Diagnostics.Process.Start(psi)
                ?? throw new InvalidOperationException("LibreOffice (soffice) başlatılamadı.");
            // Render free-tier'da ilk (soğuk) dönüşüm yavaş olabilir → 120 sn tolerans.
            if (!p.WaitForExit(120_000))
            {
                try { p.Kill(entireProcessTree: true); } catch { /* ignore */ }
                throw new InvalidOperationException("PDF dönüşümü zaman aşımına uğradı.");
            }

            var pdfPath = Path.Combine(work, "proforma.pdf");
            if (!File.Exists(pdfPath))
                throw new InvalidOperationException(
                    "PDF dönüşümü başarısız (LibreOffice kurulu mu?). stderr: " + p.StandardError.ReadToEnd());

            return File.ReadAllBytes(pdfPath);
        }
        finally
        {
            try { Directory.Delete(work, recursive: true); } catch { /* best-effort temizlik */ }
        }
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

    /// <summary>
    /// Aynı medyaya aynı from-hücresinden işaret eden mükerrer resim anchor'larını
    /// (drawing XML) şablon byte'larından ayıklar — ClosedXML'e YÜKLEMEDEN önce.
    /// ClosedXML.Pictures üzerinden silmek işe yaramaz: SaveAs eski anchor'ları
    /// XML'de bırakıp yenilerini ekliyor (23 anchor'a çıkıyor).
    /// </summary>
    private static byte[] RemoveDuplicatePictureAnchors(byte[] templateBytes)
    {
        using var ms = new MemoryStream();
        ms.Write(templateBytes, 0, templateBytes.Length);
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Update, leaveOpen: true))
        {
            XNamespace xdr = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
            XNamespace a   = "http://schemas.openxmlformats.org/drawingml/2006/main";
            XNamespace rNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
            XNamespace pr  = "http://schemas.openxmlformats.org/package/2006/relationships";

            foreach (var entry in zip.Entries
                         .Where(e => e.FullName.StartsWith("xl/drawings/", StringComparison.Ordinal)
                                  && e.FullName.EndsWith(".xml", StringComparison.Ordinal))
                         .ToList())
            {
                XDocument doc;
                using (var s = entry.Open()) doc = XDocument.Load(s);

                // rId -> media hedefi (mükerrerler aynı medyaya farklı rId ile işaret edebilir)
                var relTargets = new Dictionary<string, string>();
                var relsEntry = zip.GetEntry("xl/drawings/_rels/" + Path.GetFileName(entry.FullName) + ".rels");
                if (relsEntry is not null)
                {
                    XDocument relsDoc;
                    using (var rs = relsEntry.Open()) relsDoc = XDocument.Load(rs);
                    foreach (var rel in relsDoc.Root!.Elements(pr + "Relationship"))
                        relTargets[(string)rel.Attribute("Id")!] = (string?)rel.Attribute("Target") ?? "";
                }

                var seen  = new HashSet<string>();
                var dupes = new List<XElement>();
                foreach (var anchor in doc.Root!.Elements()
                             .Where(e => e.Name == xdr + "oneCellAnchor" || e.Name == xdr + "twoCellAnchor"))
                {
                    var embed = anchor.Descendants(a + "blip").FirstOrDefault()?.Attribute(rNs + "embed")?.Value;
                    if (embed is null) continue; // resim değil (textbox vb.) — dokunma
                    var media = relTargets.TryGetValue(embed, out var t) ? t : embed;
                    var from  = anchor.Element(xdr + "from");
                    var key   = media + "|" + string.Concat(from?.Elements().Select(x => x.Value + ",") ?? Enumerable.Empty<string>());
                    if (!seen.Add(key)) dupes.Add(anchor);
                }

                if (dupes.Count == 0) continue;
                foreach (var d in dupes) d.Remove();

                entry.Delete();
                var rewritten = zip.CreateEntry(entry.FullName);
                using var os = rewritten.Open();
                doc.Save(os);
            }
        }
        return ms.ToArray();
    }

    /// <summary>
    /// Excel reçeteli 4 kategori (migrator 13): Panoramic Padel Court, Full Panoramic Court,
    /// Padbol, Standard Padel Court. Bunların bileşen satırları proformada YALNIZ adla
    /// (+ miktar/birim) basılır; birim fiyat ve tutar hücreleri boş kalır — fiyat set
    /// satırında durur. Dönen küme: fiyatı gizlenecek bileşen satırlarının SiparisIslemID'leri.
    /// Yalnız görünüm — DB'ye yazılmaz.
    /// </summary>
    private static HashSet<int> NameOnlyComponentRows(
        IReadOnlyList<Core.Entities.OrderItem> items, IReadOnlyDictionary<int, string> catLookup)
    {
        var hidden = new HashSet<int>();
        for (int i = 0; i < items.Count; i++)
        {
            var set = items[i];
            if (!(set.KategoriID.HasValue && !set.BilesenID.HasValue)) continue;
            if (!catLookup.TryGetValue(set.KategoriID.Value, out var ad) || !IsExcelRecipeCategory(ad)) continue;

            // Setin bileşenleri: kategori satırını izleyen BilesenID'li satırlar.
            for (int j = i + 1; j < items.Count && items[j].BilesenID.HasValue && !items[j].KategoriID.HasValue; j++)
                hidden.Add(items[j].SiparisIslemID);
        }
        return hidden;
    }

    private static bool IsExcelRecipeCategory(string? ad)
    {
        var n = (ad ?? string.Empty).Trim();
        return n.Equals("Panoramic Padel Court", StringComparison.OrdinalIgnoreCase)
            || n.Equals("Full Panoramic Court",  StringComparison.OrdinalIgnoreCase)
            || n.Equals("Standard Padel Court",  StringComparison.OrdinalIgnoreCase)
            || n.Equals("Padbol",                StringComparison.OrdinalIgnoreCase);
    }

    private static byte[] GenerateProformaFromTemplate(
        byte[] templateBytes,
        Core.Entities.Order order,
        IReadOnlyDictionary<int, string> catLookup,
        IReadOnlyDictionary<int, Component> compLookup,
        IReadOnlyList<Core.Entities.OrderExtraCost> extras,
        string lang = "tr")
    {
        // Şablon blob'unda 5 sertifika logosu MÜKERRER (aynı medya + aynı hücre,
        // üst üste iki kopya). ClosedXML 0.102 SaveAs'i mükerrer resimlerde eski
        // anchor'ları drawing XML'inde bırakıyor → satır insert'ten sonra logolar
        // ürün tablosunun ORTASINDA kalıyordu (Excel + PDF bozuk görünüm).
        // Interop (WinForms) tüm anchor'ları Excel'e kaydırttığı için fark edilmiyordu.
        templateBytes = RemoveDuplicatePictureAnchors(templateBytes);

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

        // Şablondaki ürün satırları bir Excel Table (ListObject) içinde. Hiç satır
        // render edilmezse (kalemsiz sipariş + ekstra maliyet de yoksa) şablon satırını
        // SİLMEK tabloyu 0 satırlı bırakır → ClosedXML SaveAs'te EmptyTableException
        // ("Table 'Table145' should have at least 1 row") → /excel ve /pdf 500.
        // Bu durumda satır silinmez, yalnız placeholder'lar boşaltılır.
        bool itemRowsRendered = false;

        if (urunCell is not null)
        {
            // Items'ları DB sırasına göre çek — kategori + altındaki bileşenler
            // bu sırayla insert edildiği için sıralama anlam taşır.
            var items = order.Items.OrderBy(i => i.SiparisIslemID).ToList();
            int firstRow = urunCell.Address.RowNumber;

            // Excel reçeteli setlerde bileşen satırları yalnız adla basılır (fiyatsız).
            var nameOnly = NameOnlyComponentRows(items, catLookup);

            // Render satır haritaları: önce gerçek sipariş kalemleri, sonra muhasebe
            // ekstra maliyet kalemleri (açıklama + tutar; tek adet, birim fiyat = tutar).
            var rowMaps = new List<Dictionary<string, string>>(items.Count + extras.Count);

            foreach (var item in items)
            {
                bool isCategory = item.KategoriID.HasValue && !item.BilesenID.HasValue;

                // Web Products/Components paritesi (OrderDetailModal.tsx): kategori VE
                // bileşen satırları AYNI formülle fiyatlanır — item.Fiyat tekil (birim)
                // fiyat, toplam = tekil × adet. Eski proformada bileşen satırı fiyatsızdı
                // ve kategori "birim = fiyat/adet" (whole-set total) varsayıyordu; web ile
                // birebir aynı görünüm için ikisi de kaldırıldı.
                decimal birimFiyat = item.Fiyat ?? 0m;
                decimal toplam     = birimFiyat * item.Adet;

                string urunText, birimText;

                if (isCategory)
                {
                    catLookup.TryGetValue(item.KategoriID!.Value, out var name);
                    urunText  = !string.IsNullOrEmpty(name) ? name : $"SET #{item.KategoriID}";
                    birimText = "SET";
                }
                else
                {
                    string bname;
                    string bunit;
                    if (item.BilesenID.HasValue && compLookup.TryGetValue(item.BilesenID.Value, out var c))
                    {
                        bname = c.BilesenAdi;
                        bunit = c.Birim ?? string.Empty;
                    }
                    else
                    {
                        // Serbest kalem (Özel Kalem) — master tabloya bağlı değil
                        bname = item.SBilesenAdi ?? "Özel Kalem";
                        bunit = item.SBirim ?? string.Empty;
                    }
                    urunText = string.IsNullOrEmpty(item.OznitelikAdi)
                        ? bname
                        : item.OznitelikAdi + " " + bname;
                    birimText = bunit;
                }

                bool fiyatsiz = nameOnly.Contains(item.SiparisIslemID);
                string birimFiyatText = fiyatsiz ? string.Empty : paraBirimi + birimFiyat.ToString("N2", TrTR);
                string fiyatText      = fiyatsiz ? string.Empty : paraBirimi + toplam.ToString("N2", TrTR);

                rowMaps.Add(new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["#URUN"]       = urunText,
                    ["#MIKTAR"]     = item.Adet.ToString(TrTR),
                    ["#BIRIM"]      = birimText,
                    ["#BIRIMFIYAT"] = birimFiyatText,
                    ["#FIYAT"]      = fiyatText,
                });
            }

            // Ekstra maliyet kalemleri — kategori satırı gibi fiyatlı tek-adet satırlar.
            foreach (var ex in extras)
            {
                string tutarText = paraBirimi + ex.Tutar.ToString("N2", TrTR);
                rowMaps.Add(new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["#URUN"]       = ex.Aciklama,
                    ["#MIKTAR"]     = "1",
                    ["#BIRIM"]      = string.Empty,
                    ["#BIRIMFIYAT"] = tutarText,
                    ["#FIYAT"]      = tutarText,
                });
            }

            itemRowsRendered = rowMaps.Count > 0;

            // İlk şablon satırı zaten yerinde — rowMaps.Count satır gerekiyor; aşağıya
            // doğru çoğalt; orijinal şablon satırı en sonda kalır ve #URUN case'inde silinir.
            for (int i = 0; i < rowMaps.Count; i++)
            {
                ws.Row(firstRow + i).InsertRowsBelow(1);
                ws.Row(firstRow).CopyTo(ws.Row(firstRow + i + 1));
            }

            for (int i = 0; i < rowMaps.Count; i++)
            {
                int row = firstRow + i;
                var rowMap = rowMaps[i];
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
                    // §29 — WinForms (Muhasebe.cs excelYazOzet_Click #KDV) BIREBIR: `Kdv`
                    // kolonu MUTLAK bir tutardır (ör. 6000 = €6.000,00), YÜZDE DEĞİL.
                    // Diverjans: önceki kod onu yüzde sanıp `ToplamFiyat * Kdv/100`
                    // hesaplıyordu → 6000 değeri için "+ 4.920.000,00 % 6000" gibi saçma
                    // satır üretiyordu. Orijinal çıktı: "+<sembol> <tutar>".
                    if (kdv > 0)
                        cell.Value = "+" + paraBirimi + kdv.ToString("N2", TrTR);
                    else rowsToDelete.Add(cell.Address.RowNumber);
                    break;

                // ── Detay döngüsü (her detay için hücre ofseti) ─────────────
                // Round-8 §4/§8 — standart şart kodları hedef dile çevrilir;
                // detay yoksa orphan "#DETAY" kalmasın diye placeholder temizlenir.
                case "#DETAY":
                {
                    int rowIdx = 0, colIdx = 0, count = 1;
                    int baseR = cell.Address.RowNumber;
                    int baseC = cell.Address.ColumnNumber;
                    bool wroteAny = false;
                    foreach (var d in order.Details)
                    {
                        if (string.IsNullOrWhiteSpace(d.Text)) continue;
                        // §31 — Otomatik/kodlu şartları #DETAY'dan ELE: @@TESLIMAT/@@ODEME/@@MONTAJ
                        // ve diğer @@kodlar (+ bunlara normalize olan legacy "Teslimat Şekli:" /
                        // "Ödeme Şekli:" / TR ticari literalleri). Teslimat/ödeme/montaj zaten
                        // proformanın KENDİ satırlarında (#TESLIMATCESITI/#ODEMEORANI/#MONTAJ)
                        // render edilir → #DETAY'da tekrar etmesin. Yalnız literal metin
                        // (eski CRM 17 İngilizce standart şart + kullanıcı serbest notları) yazılır.
                        if (ClauseText.NormalizeToCode(d.Text).StartsWith(ClauseText.Prefix, StringComparison.Ordinal))
                            continue;
                        var text = ClauseText.Resolve(d.Text, lang);
                        ws.Cell(baseR + rowIdx, baseC + colIdx).Value = $"{count}. {text}";
                        rowIdx++;
                        count++;
                        wroteAny = true;
                        if (rowIdx > 10) { rowIdx = 0; colIdx = 1; }
                    }
                    if (!wroteAny) cell.Value = string.Empty; // orphan placeholder'ı sil
                    break;
                }

                // ── Items şablon kalıntısı — son satırdaki placeholder marker'ı sil.
                // Hiç ürün satırı render edilmediyse satır KORUNUR (Excel Table en az
                // 1 satır ister), yalnız placeholder metni temizlenir.
                case "#URUN":
                case "#MIKTAR":
                case "#BIRIM":
                case "#BIRIMFIYAT":
                case "#FIYAT":
                    if (itemRowsRendered) rowsToDelete.Add(cell.Address.RowNumber);
                    else                  cell.Value = string.Empty;
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

        // PROMPT-v2 §2: Parasal görünürlüğü olmayan roller için ciro alanları
        // sıfırlanır — backend gate'in frontend `ROLE_LAYOUT.revenue=false` ile
        // uyumlu kalması için. (Yonetici/Muhasebe/Gozlemci tam ciro görür.)
        bool revenueHidden = role is "Fabrika" or "Lojistik" or "Temsilci";
        if (revenueHidden)
        {
            euro = 0m; dolar = 0m; tl = 0m; sterlin = 0m;
        }

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

    // ─────────────────────────────────────────────────────────────────────────────
    // Round-8 §13 — Temsilci performans raporu (Yönetici-only)
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<RepPerformanceDto>> GetRepPerformanceAsync(DateTime start, DateTime end)
    {
        var orders = await uow.Orders.GetOrdersInRangeAsync(start, end);

        // §19 — TÜM Temsilci kullanıcıları listelenir. Eski kod sonucu siparişlerden
        // türetip sözlüğü yalnız FİLTRE olarak kullandığı için, o dönemde siparişi
        // olmayan temsilciler hiç görünmüyordu. Artık roster'dan sürülür: siparişi
        // olmayan temsilci de SIFIR satırla görünür.
        // §26 — pasif (ayrılan) temsilciler performans rosterında görünmez.
        var temsilciler = (await uow.Kullanicilar.GetActiveAsync())
            .Where(u => u.YetkiTuru == "Temsilci")
            .ToList();
        var ids = temsilciler.Select(u => u.KullaniciID).ToHashSet();

        var byRep = orders
            .Where(o => ids.Contains(o.KullaniciID))
            .GroupBy(o => o.KullaniciID)
            .ToDictionary(g => g.Key, g => g.ToList());

        static decimal CiroOf(IEnumerable<Order> rows, string para) =>
            rows.Where(o => o.ParaTipi == para).Sum(o => o.ToplamFiyat ?? 0m);

        return temsilciler
            .Select(u =>
            {
                var g = byRep.TryGetValue(u.KullaniciID, out var rows) ? rows : new List<Order>();
                int olusturulan = g.Count;
                int teklif      = g.Count(o => o.SiparisMiTeklifMi == "Teklif");
                int siparis     = g.Count(o => o.SiparisMiTeklifMi != "Teklif" && o.SiparisMiTeklifMi != "Iptal");
                return new RepPerformanceDto(
                    KullaniciID:  u.KullaniciID,
                    AdSoyad:      $"{u.Ad} {u.Soyad}".Trim(),
                    Olusturulan:  olusturulan,
                    Teklif:       teklif,
                    Siparis:      siparis,
                    Onaylanan:    g.Count(o => o.Kontrol == "Onay"),
                    Reddedilen:   g.Count(o => o.Kontrol == "Reddet"),
                    Bekleyen:     g.Count(o => o.Kontrol == "Kontrol"),
                    Tamamlanan:   g.Count(o => o.SiparisMiTeklifMi == "Tamamlandi"),
                    DonusumOrani: olusturulan > 0 ? Math.Round((decimal)siparis / olusturulan * 100m, 1) : 0m,
                    CiroEuro:     CiroOf(g, "Euro"),
                    CiroDolar:    CiroOf(g, "Dolar"),
                    CiroTL:       CiroOf(g, "TL"),
                    CiroSterlin:  CiroOf(g, "Sterlin"));
            })
            .OrderByDescending(r => r.Olusturulan)
            .ThenBy(r => r.AdSoyad, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // §19 — Tek temsilci detay analizi + 5-sayfalık markalı Excel raporu
    // ─────────────────────────────────────────────────────────────────────────────

    public async Task<RepDetailDto> GetRepDetailAsync(int kullaniciID, DateTime start, DateTime end)
    {
        var user   = (await uow.Kullanicilar.GetAllAsync()).FirstOrDefault(u => u.KullaniciID == kullaniciID);
        var orders = await uow.Orders.GetRepReportOrdersAsync(kullaniciID, start, end);

        // Satış = gerçek sipariş (Teklif/Iptal dışı). Ciro/ülke/ürün bunlardan türetilir.
        var sales = orders
            .Where(o => o.SiparisMiTeklifMi != "Teklif" && o.SiparisMiTeklifMi != "Iptal")
            .ToList();

        // Kalemler: satış siparişlerinin SiparisNo ∪ TeklifNo anahtarlarıyla toplu çek.
        var keys = sales
            .SelectMany(o => new[] { o.SiparisNo, o.TeklifNo })
            .Where(s => !string.IsNullOrEmpty(s))
            .Distinct()
            .ToList();
        var items     = await uow.Orders.GetItemsForOrdersAsync(keys!);
        var catLookup = (await uow.ProductCategories.GetAllAsync()).ToDictionary(c => c.KategoriID, c => c.KategoriAdi);
        var catItems  = items.Where(i => i.KategoriID != null).ToList();   // ürün = kategori/SET satırı

        static decimal Ciro(IEnumerable<Order> rows, string p) =>
            rows.Where(o => o.ParaTipi == p).Sum(o => o.ToplamFiyat ?? 0m);
        decimal Aov(string p)
        {
            var rs = sales.Where(o => o.ParaTipi == p).ToList();
            return rs.Count > 0 ? Math.Round(rs.Sum(o => o.ToplamFiyat ?? 0m) / rs.Count, 2) : 0m;
        }

        var urunler = catItems
            .GroupBy(i => catLookup.TryGetValue(i.KategoriID!.Value, out var n) ? n : $"#{i.KategoriID}")
            .Select(g => new RepProductStatDto(g.Key, g.Sum(i => i.Adet), g.Select(i => i.SiparisNo).Distinct().Count()))
            .OrderByDescending(p => p.Adet).ThenBy(p => p.Urun, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var ulkeler = sales
            .GroupBy(o => string.IsNullOrWhiteSpace(o.MUlke) ? "—" : o.MUlke!)
            .Select(g =>
            {
                var snos = g.SelectMany(o => new[] { o.SiparisNo, o.TeklifNo }).Where(s => !string.IsNullOrEmpty(s)).ToHashSet();
                int adet = catItems.Where(i => snos.Contains(i.SiparisNo)).Sum(i => i.Adet);
                return new RepCountryStatDto(g.Key, g.Count(), adet,
                    Ciro(g, "Euro"), Ciro(g, "Dolar"), Ciro(g, "TL"), Ciro(g, "Sterlin"));
            })
            .OrderByDescending(c => c.SiparisSayisi)
            .ThenByDescending(c => c.CiroEuro + c.CiroDolar + c.CiroTL + c.CiroSterlin)
            .ToList();

        var aylik = sales
            .GroupBy(o => new { o.Tarih.Year, o.Tarih.Month })
            .Select(g => new RepMonthlyStatDto($"{g.Key.Year:D4}-{g.Key.Month:D2}", g.Count(),
                Ciro(g, "Euro"), Ciro(g, "Dolar"), Ciro(g, "TL"), Ciro(g, "Sterlin")))
            .OrderBy(m => m.Ay, StringComparer.Ordinal)
            .ToList();

        int olusturulan   = orders.Count;
        int siparisSayisi = sales.Count;

        return new RepDetailDto(
            KullaniciID:   kullaniciID,
            AdSoyad:       user != null ? $"{user.Ad} {user.Soyad}".Trim() : $"#{kullaniciID}",
            KullaniciAdi:  user?.KullaniciAdi,
            SiparisSayisi: siparisSayisi,
            TeklifSayisi:  orders.Count(o => o.SiparisMiTeklifMi == "Teklif"),
            ToplamAdet:    catItems.Sum(i => i.Adet),
            UlkeSayisi:    sales.Select(o => o.MUlke).Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().Count(),
            DonusumOrani:  olusturulan > 0 ? Math.Round((decimal)siparisSayisi / olusturulan * 100m, 1) : 0m,
            CiroEuro:      Ciro(sales, "Euro"),  CiroDolar:   Ciro(sales, "Dolar"),
            CiroTL:        Ciro(sales, "TL"),    CiroSterlin: Ciro(sales, "Sterlin"),
            AovEuro:       Aov("Euro"),  AovDolar: Aov("Dolar"),  AovTL: Aov("TL"),  AovSterlin: Aov("Sterlin"),
            Ulkeler:       ulkeler,
            Urunler:       urunler,
            AylikCiro:     aylik);
    }

    public async Task<byte[]> ExportRepReportAsync(int kullaniciID, DateTime start, DateTime end)
    {
        var d      = await GetRepDetailAsync(kullaniciID, start, end);
        var orders = await uow.Orders.GetRepReportOrdersAsync(kullaniciID, start, end);

        var brand     = XLColor.FromArgb(68, 114, 196);
        var brandDark = XLColor.FromArgb(31, 56, 100);
        string period = $"{start:dd.MM.yyyy} – {end:dd.MM.yyyy}";

        static void HeaderRow(IXLWorksheet ws, int row, XLColor brand, params string[] headers)
        {
            for (int c = 0; c < headers.Length; c++)
            {
                var cell = ws.Cell(row, c + 1);
                cell.Value = headers[c];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = brand;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }
        }
        void BrandTitle(IXLWorksheet ws, string subtitle, int cols)
        {
            // Logo alanı + marka başlığı (kurumsal görünüm).
            ws.Cell(1, 1).Value = "UNIXPADEL";
            ws.Range(1, 1, 1, cols).Merge();
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Font.FontSize = 18;
            ws.Cell(1, 1).Style.Font.FontColor = XLColor.White;
            ws.Cell(1, 1).Style.Fill.BackgroundColor = brandDark;
            ws.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Row(1).Height = 30;
            ws.Cell(2, 1).Value = subtitle;
            ws.Range(2, 1, 2, cols).Merge();
            ws.Cell(2, 1).Style.Font.Italic = true;
            ws.Cell(2, 1).Style.Font.FontColor = XLColor.FromArgb(90, 90, 90);
        }
        static void Currency(IXLWorksheet ws, params int[] cols)
        {
            foreach (var c in cols) ws.Column(c).Style.NumberFormat.Format = "#,##0.00";
        }

        using var wb = new XLWorkbook();

        // ── Sheet 1: Executive Summary ───────────────────────────────────────────
        var s1 = wb.AddWorksheet("Executive Summary");
        BrandTitle(s1, $"Temsilci Performans Raporu · {d.AdSoyad} · {period}", 4);
        int r = 4;
        void Kv(string k, XLCellValue v)
        {
            s1.Cell(r, 1).Value = k; s1.Cell(r, 1).Style.Font.Bold = true;
            s1.Cell(r, 2).Value = v; r++;
        }
        Kv("Temsilci",        d.AdSoyad);
        Kv("Kullanıcı Adı",   d.KullaniciAdi ?? "—");
        Kv("Dönem",           period);
        r++;
        Kv("Sipariş Sayısı",  d.SiparisSayisi);
        Kv("Teklif Sayısı",   d.TeklifSayisi);
        Kv("Dönüşüm Oranı",   $"%{d.DonusumOrani}");
        Kv("Satılan Ürün Adedi", d.ToplamAdet);
        Kv("Satış Yapılan Ülke", d.UlkeSayisi);
        r++;
        s1.Cell(r, 1).Value = "Ciro (Para Birimi Bazında)"; s1.Cell(r, 1).Style.Font.Bold = true; r++;
        HeaderRow(s1, r, brand, "Para Birimi", "Ciro", "Ort. Sipariş Değeri (AOV)"); r++;
        void Cur(string name, decimal ciro, decimal aov)
        {
            if (ciro == 0m && aov == 0m) return;
            s1.Cell(r, 1).Value = name;
            s1.Cell(r, 2).Value = (double)ciro;
            s1.Cell(r, 3).Value = (double)aov;
            r++;
        }
        Cur("Euro", d.CiroEuro, d.AovEuro);
        Cur("Dolar", d.CiroDolar, d.AovDolar);
        Cur("TL", d.CiroTL, d.AovTL);
        Cur("Sterlin", d.CiroSterlin, d.AovSterlin);
        Currency(s1, 2, 3);
        s1.Columns().AdjustToContents();
        s1.Column(1).Width = Math.Max(s1.Column(1).Width, 24);

        // ── Sheet 2: Country Analysis ────────────────────────────────────────────
        var s2 = wb.AddWorksheet("Country Analysis");
        BrandTitle(s2, $"Ülke Analizi · {d.AdSoyad} · {period}", 7);
        HeaderRow(s2, 4, brand, "Ülke", "Sipariş", "Adet", "Ciro €", "Ciro $", "Ciro ₺", "Ciro £");
        int row2 = 5;
        foreach (var u in d.Ulkeler)
        {
            s2.Cell(row2, 1).Value = u.Ulke;
            s2.Cell(row2, 2).Value = u.SiparisSayisi;
            s2.Cell(row2, 3).Value = u.Adet;
            s2.Cell(row2, 4).Value = (double)u.CiroEuro;
            s2.Cell(row2, 5).Value = (double)u.CiroDolar;
            s2.Cell(row2, 6).Value = (double)u.CiroTL;
            s2.Cell(row2, 7).Value = (double)u.CiroSterlin;
            row2++;
        }
        Currency(s2, 4, 5, 6, 7);
        s2.Columns().AdjustToContents();
        s2.SheetView.FreezeRows(4);

        // ── Sheet 3: Product Analysis ────────────────────────────────────────────
        var s3 = wb.AddWorksheet("Product Analysis");
        BrandTitle(s3, $"Ürün Analizi · {d.AdSoyad} · {period}", 3);
        HeaderRow(s3, 4, brand, "Ürün (Kategori)", "Satılan Adet", "Sipariş Sayısı");
        int row3 = 5;
        foreach (var p in d.Urunler)
        {
            s3.Cell(row3, 1).Value = p.Urun;
            s3.Cell(row3, 2).Value = p.Adet;
            s3.Cell(row3, 3).Value = p.SiparisSayisi;
            row3++;
        }
        s3.Columns().AdjustToContents();
        s3.SheetView.FreezeRows(4);

        // ── Sheet 4: Order Details ───────────────────────────────────────────────
        var s4 = wb.AddWorksheet("Order Details");
        BrandTitle(s4, $"Sipariş Detayı · {d.AdSoyad} · {period}", 8);
        HeaderRow(s4, 4, brand, "No", "Müşteri", "Ülke", "Aşama", "Kontrol", "Para Birimi", "Toplam", "Tarih");
        int row4 = 5;
        foreach (var o in orders)
        {
            s4.Cell(row4, 1).Value = string.IsNullOrEmpty(o.SiparisNo) ? o.TeklifNo : o.SiparisNo;
            s4.Cell(row4, 2).Value = o.MusteriAd;
            s4.Cell(row4, 3).Value = o.MUlke ?? "";
            s4.Cell(row4, 4).Value = o.SiparisMiTeklifMi;
            s4.Cell(row4, 5).Value = o.Kontrol ?? "";
            s4.Cell(row4, 6).Value = o.ParaTipi;
            s4.Cell(row4, 7).Value = (double)(o.ToplamFiyat ?? 0m);
            s4.Cell(row4, 8).Value = o.Tarih.ToString("dd.MM.yyyy");
            row4++;
        }
        Currency(s4, 7);
        s4.Columns().AdjustToContents();
        s4.SheetView.FreezeRows(4);

        // ── Sheet 5: Monthly Revenue Trend ───────────────────────────────────────
        var s5 = wb.AddWorksheet("Monthly Revenue Trend");
        BrandTitle(s5, $"Aylık Ciro Trendi · {d.AdSoyad} · {period}", 6);
        HeaderRow(s5, 4, brand, "Ay", "Sipariş", "Ciro €", "Ciro $", "Ciro ₺", "Ciro £");
        int row5 = 5;
        foreach (var m in d.AylikCiro)
        {
            s5.Cell(row5, 1).Value = m.Ay;
            s5.Cell(row5, 2).Value = m.SiparisSayisi;
            s5.Cell(row5, 3).Value = (double)m.CiroEuro;
            s5.Cell(row5, 4).Value = (double)m.CiroDolar;
            s5.Cell(row5, 5).Value = (double)m.CiroTL;
            s5.Cell(row5, 6).Value = (double)m.CiroSterlin;
            row5++;
        }
        Currency(s5, 3, 4, 5, 6);
        s5.Columns().AdjustToContents();
        s5.SheetView.FreezeRows(4);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
