using ClosedXML.Excel;
using CrmModern.Core.DTOs.Accounting;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Muhasebe + MuhasebeGecmis ekranları.
/// </summary>
internal sealed class AccountingService(IUnitOfWork uow) : IAccountingService
{
    public async Task<IReadOnlyList<AccountingOrderListDto>> GetAccountingOrdersAsync()
    {
        var orders = await uow.Orders.GetAccountingOrdersAsync();
        var result = new List<AccountingOrderListDto>(orders.Count);

        foreach (var o in orders)
        {
            decimal odenen      = o.OdenenMiktar ?? 0m;
            decimal toplam      = o.ToplamFiyat  ?? 0m;
            decimal pesinOran   = o.PesinYüzde / 100m;
            decimal kaparo      = Math.Max(toplam * pesinOran - odenen, 0m);
            decimal kalanBakiye = toplam - odenen;

            PurchaseRequest? pr = null;
            if (!string.IsNullOrEmpty(o.SiparisNo))
                pr = await uow.PurchaseRequests.GetMuhasebeBySiparisNoAsync(o.SiparisNo);

            result.Add(new AccountingOrderListDto(
                SiparisNo:        o.SiparisNo,
                MusteriAd:        o.MusteriAd,
                MUlke:            o.MUlke,
                ParaTipi:         o.ParaTipi,
                ToplamFiyat:      o.ToplamFiyat,
                KaparoFiyat:      kaparo,
                KalanBakiye:      kalanBakiye,
                OdenenMiktar:     o.OdenenMiktar,
                OdemeDurum:       o.OdemeDurum,
                SiparisMiTeklifMi: o.SiparisMiTeklifMi,
                Maliyet:          pr?.Maliyet,
                MaliyetDetayi:    pr?.MaliyetDetayi,
                Kar:              pr?.Kar,
                MuhasebeDurumu:   pr?.Durum,
                MuhasebeTalepID:  pr?.TalepID,
                MuhasebeRedNotu:  pr?.RedNotu,
                Sirket:           o.Sirket,
                PesinYuzde:       o.PesinYüzde,
                TeslimatCesiti:   o.TeslimatÇeşiti,
                Kontrol:          o.Kontrol,
                Tarih:            o.Tarih,
                // PROMPT-v2 §10.2: Maliyet Reçetesi math için.
                Indirim:          o.Indirim,
                Kdv:              o.Kdv,
                // PROMPT-v6 §1 — Burcu kuyruk seçicisi.
                LojistikOnay:     o.LojistikOnay));
        }

        return result.AsReadOnly();
    }

    public async Task<AccountingOrderListDto> GetOrderAccountingDetailAsync(string siparisNo)
    {
        var o = await uow.Orders.GetByNoAsync(NormalizeNo(siparisNo))
            ?? throw new NotFoundException("Order", siparisNo);

        decimal odenen      = o.OdenenMiktar ?? 0m;
        decimal toplam      = o.ToplamFiyat  ?? 0m;
        decimal pesinOran   = o.PesinYüzde / 100m;
        decimal kaparo      = Math.Max(toplam * pesinOran - odenen, 0m);
        decimal kalanBakiye = toplam - odenen;

        var pr = await uow.PurchaseRequests.GetMuhasebeBySiparisNoAsync(o.SiparisNo);

        return new AccountingOrderListDto(
            SiparisNo:        o.SiparisNo,
            MusteriAd:        o.MusteriAd,
            MUlke:            o.MUlke,
            ParaTipi:         o.ParaTipi,
            ToplamFiyat:      o.ToplamFiyat,
            KaparoFiyat:      kaparo,
            KalanBakiye:      kalanBakiye,
            OdenenMiktar:     o.OdenenMiktar,
            OdemeDurum:       o.OdemeDurum,
            SiparisMiTeklifMi: o.SiparisMiTeklifMi,
            Maliyet:          pr?.Maliyet,
            MaliyetDetayi:    pr?.MaliyetDetayi,
            Kar:              pr?.Kar,
            MuhasebeDurumu:   pr?.Durum,
            MuhasebeTalepID:  pr?.TalepID,
            MuhasebeRedNotu:  pr?.RedNotu,
            Sirket:           o.Sirket,
            PesinYuzde:       o.PesinYüzde,
            TeslimatCesiti:   o.TeslimatÇeşiti,
            Kontrol:          o.Kontrol,
            Tarih:            o.Tarih,
            // PROMPT-v2 §10.2: Maliyet Reçetesi math için.
            Indirim:          o.Indirim,
            Kdv:              o.Kdv,
            // PROMPT-v6 §1 — Burcu kuyruk seçicisi.
            LojistikOnay:     o.LojistikOnay);
    }

    public async Task<IReadOnlyList<AccountingTransactionDto>> GetTransactionsForOrderAsync(string siparisNo)
    {
        var rows = await uow.Accounting.GetBySiparisNoAsync(NormalizeNo(siparisNo));
        return rows.Select(MapTx).ToList().AsReadOnly();
    }

    public async Task<AccountingTransactionDto> AddTransactionAsync(AddTransactionDto dto, int currentUserId)
    {
        if (dto.OdenenMiktar <= 0)
            throw new BusinessException("Tutar 0'dan büyük olmalı.");

        var order = await uow.Orders.GetByNoAsync(NormalizeNo(dto.SiparisNo))
            ?? throw new NotFoundException("Order", dto.SiparisNo);

        // MusteriID Order'dan (DB kolonu NOT NULL — Order.MusteriId nullable, fallback 0).
        int musteriId = order.MusteriId ?? 0;

        var entity = new AccountingTransaction
        {
            SiparisNo    = order.SiparisNo,
            KullaniciID  = currentUserId,
            MusteriID    = musteriId,
            OdenenMiktar = dto.OdenenMiktar,
            Tarih        = (dto.Tarih ?? DateTime.Today).Date
        };
        await uow.Accounting.AddAsync(entity);
        await uow.SaveChangesAsync();

        // SiparisAlTablo.OdenenMiktar = SUM + OdemeDurum
        decimal toplamOdenen = await uow.Accounting.GetSumBySiparisNoAsync(order.SiparisNo);
        decimal toplam       = order.ToplamFiyat ?? 0m;
        order.OdenenMiktar = toplamOdenen;
        // WinForms birebir: Beklemede / Ödendi (sadece iki durum)
        order.OdemeDurum = (toplam - toplamOdenen <= 0m) ? "Ödendi" : "Beklemede";

        uow.Orders.Update(order);
        await uow.SaveChangesAsync();

        return MapTx(entity);
    }

    public async Task<IReadOnlyList<AccountingTransactionDto>> GetTransactionHistoryAsync()
    {
        var transactions = await uow.Accounting.GetAllOrderedAsync();
        return transactions.Select(MapTx).ToList().AsReadOnly();
    }

    // PROMPT.md ACCOUNTING #15 — legacy MuhasebeGecmis.cs filter strip.
    // SearchAsync still handles SiparisNo / KullaniciID / date range; MUlke,
    // MusteriAd and OdenenMiktar are post-processed against the Order join,
    // matching how MusteriAd worked before.
    public async Task<TransactionPageDto> GetTransactionHistoryPagedAsync(TransactionFilterDto filter)
    {
        var rows = await uow.Accounting.SearchAsync(
            filter.SiparisNo, filter.KullaniciID, filter.BaslangicTarih, filter.BitisTarih);

        // PROMPT-v2 §10.1: SiparisNo başına 1-based installment index. Filtre
        // uygulanmış kümeden hesaplanır — global indeksleme date-range filtresi
        // varken yanıltıcı olabilir; spec'in kabul ettiği basitleştirme.
        var installmentIndex = rows
            .Where(t => !string.IsNullOrEmpty(t.SiparisNo))
            .GroupBy(t => t.SiparisNo!)
            .SelectMany(g => g.OrderBy(t => t.Tarih).Select((t, i) => (t.ID, Index: i + 1)))
            .ToDictionary(x => x.ID, x => x.Index);

        var users = (await uow.Kullanicilar.GetAllAsync())
            .ToDictionary(u => u.KullaniciID, u => $"{u.Ad} {u.Soyad}".Trim());

        // Per-SiparisNo order metadata: MusteriAd / MUlke / ParaTipi.
        // Used by the row projection AND by the MUlke filter below.
        var orderMeta = (await uow.Orders.GetAllAsync())
            .Where(o => !string.IsNullOrEmpty(o.SiparisNo))
            .GroupBy(o => o.SiparisNo)
            .ToDictionary(
                g => g.Key,
                g => (g.First().MusteriAd, MUlke: g.First().MUlke, g.First().ParaTipi));

        // Row projection — joins user + order meta to the transaction.
        IEnumerable<TransactionListItemDto> projected = rows.Select(t =>
        {
            var ord = !string.IsNullOrEmpty(t.SiparisNo) && orderMeta.TryGetValue(t.SiparisNo, out var v)
                ? v
                : (MusteriAd: (string?)null, MUlke: (string?)null, ParaTipi: (string?)null);
            return new TransactionListItemDto(
                t.ID, t.SiparisNo ?? string.Empty, t.MusteriID,
                ord.MusteriAd, t.KullaniciID,
                users.TryGetValue(t.KullaniciID, out var n) ? n : null,
                ord.ParaTipi, t.OdenenMiktar, t.Tarih,
                // PROMPT-v2 §10.1: SiparisNo'su boş satırlar 0; geri kalanlar lookup'tan.
                installmentIndex.TryGetValue(t.ID, out var ix) ? ix : 0);
        });

        if (!string.IsNullOrWhiteSpace(filter.MusteriAd))
        {
            var f = filter.MusteriAd.ToLower();
            projected = projected.Where(t => (t.MusteriAd ?? "").ToLower().Contains(f));
        }

        if (!string.IsNullOrWhiteSpace(filter.MUlke))
        {
            // Legacy used `sat.MUlke = @MUlke` (exact). Compare case-insensitive
            // so the dropdown-supplied value matches stored capitalisation
            // variants without surprises.
            var u = filter.MUlke.Trim();
            projected = projected.Where(t =>
            {
                var no = t.SiparisNo;
                if (string.IsNullOrEmpty(no) || !orderMeta.TryGetValue(no, out var meta))
                    return false;
                return string.Equals(meta.MUlke ?? string.Empty, u, StringComparison.OrdinalIgnoreCase);
            });
        }

        if (filter.OdenenMiktar.HasValue)
        {
            // Exact decimal match — legacy `mit.OdenenMiktar = @OdemeDurum`.
            var target = filter.OdenenMiktar.Value;
            projected = projected.Where(t => t.OdenenMiktar == target);
        }

        var list = projected.ToList();
        int total = list.Count;

        // Currency totals computed across the FULL filtered set (not the page).
        // All four legacy buckets are always present so the UI strip stays stable.
        var totals = new Dictionary<string, decimal>
        {
            ["Euro"]    = 0m,
            ["Dolar"]   = 0m,
            ["TL"]      = 0m,
            ["Sterlin"] = 0m,
        };
        foreach (var item in list)
        {
            if (item.OdenenMiktar is null) continue;
            var key = (item.ParaTipi ?? string.Empty).Trim();
            if (totals.ContainsKey(key))
                totals[key] += item.OdenenMiktar.Value;
        }

        int page = Math.Max(1, filter.Page);
        int size = Math.Clamp(filter.PageSize, 1, 200);

        var pageItems = list.Skip((page - 1) * size).Take(size).ToList().AsReadOnly();
        return new TransactionPageDto(pageItems, total, page, size, totals);
    }

    public async Task<CustomerBalanceDto> GetCustomerBalanceAsync(int musteriId)
    {
        var musteri = await uow.Musteriler.GetByIdAsync(musteriId)
            ?? throw new NotFoundException("Musteri", musteriId);

        var allOrders = await uow.Orders.GetAllAsync();
        var custOrders = allOrders.Where(o => o.MusteriId == musteriId).ToList();

        var custTx = await uow.Accounting.GetByCustomerAsync(musteriId);

        var orderCurrencyMap = custOrders
            .Where(o => !string.IsNullOrEmpty(o.SiparisNo))
            .GroupBy(o => o.SiparisNo)
            .ToDictionary(g => g.Key, g => g.First().ParaTipi);

        string[] currencies = { "Euro", "Dolar", "TL", "Sterlin" };
        var lines = currencies.Select(c =>
        {
            decimal toplam = custOrders.Where(o => o.ParaTipi == c).Sum(o => o.ToplamFiyat ?? 0m);
            decimal odenen = custTx
                .Where(t => !string.IsNullOrEmpty(t.SiparisNo)
                            && orderCurrencyMap.TryGetValue(t.SiparisNo!, out var p) && p == c)
                .Sum(t => t.OdenenMiktar ?? 0m);
            return new CurrencyBalanceLineDto(c, toplam, odenen, toplam - odenen);
        }).ToList().AsReadOnly();

        return new CustomerBalanceDto(musteri.MusteriID, musteri.MusteriAd, lines);
    }

    public async Task<byte[]> GenerateAccountingExcelAsync(TransactionFilterDto filter)
    {
        var page = await GetTransactionHistoryPagedAsync(filter with { Page = 1, PageSize = 1000 });

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Muhasebe");
        ws.Cell(1, 1).Value = "ID";
        ws.Cell(1, 2).Value = "Sipariş No";
        ws.Cell(1, 3).Value = "Müşteri";
        ws.Cell(1, 4).Value = "Kullanıcı";
        ws.Cell(1, 5).Value = "Para Tipi";
        ws.Cell(1, 6).Value = "Ödenen";
        ws.Cell(1, 7).Value = "Tarih";
        ws.Range("A1:G1").Style.Font.Bold = true;

        int row = 2;
        foreach (var t in page.Items)
        {
            ws.Cell(row, 1).Value = t.ID;
            ws.Cell(row, 2).Value = t.SiparisNo;
            ws.Cell(row, 3).Value = t.MusteriAd ?? "";
            ws.Cell(row, 4).Value = t.Kullanici ?? "";
            ws.Cell(row, 5).Value = t.ParaTipi ?? "";
            ws.Cell(row, 6).Value = (double)(t.OdenenMiktar ?? 0m);
            ws.Cell(row, 7).Value = t.Tarih.ToString("yyyy-MM-dd");
            row++;
        }
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ── PROMPT.md ACCOUNTING #14 ─────────────────────────────────────────────

    public async Task SubmitMaliyetTalepAsync(string siparisNo, SubmitMaliyetTalepDto dto, string currentUserName)
    {
        if (dto.Maliyet < 0m)
            throw new BusinessException("Maliyet 0'dan küçük olamaz.");

        // Sipariş gerçekten var mı? (Hatalı SiparisNo'larda NotFound vermek
        // ileride duplicate Muhasebe satırı oluşmasından çok daha güvenli.)
        var no = NormalizeNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        // Türetilmiş alanlar — legacy Muhasebe.cs satır 2078-2079, 2104.
        string urunAdi = (order.MusteriAd ?? "").Trim() + " Muhasebe";
        decimal kar    = (dto.ToplamSiparis ?? 0m) - dto.Maliyet;

        var existing = await uow.PurchaseRequests.GetMuhasebeBySiparisNoAsync(no);
        if (existing is not null)
        {
            // Re-arm: legacy UPDATE branch (lines 2100-2108) — kullanıcı talebi
            // yeniden gönderebilir, RedNotu ve önceki İslemYapanKullanici
            // resetlenir, Durum 'Onay Bekliyor' yapılır.
            existing.UrunAdi               = urunAdi;
            existing.MusteriAdi            = order.MusteriAd;
            existing.ToplamSiparis         = dto.ToplamSiparis;
            existing.KaporaBakiyesi        = dto.KaporaBakiyesi;
            existing.KalanBakiyeTalep      = dto.KalanBakiyeTalep;
            existing.PesinYuzde            = dto.PesinYuzde;
            existing.Maliyet               = dto.Maliyet;
            existing.MaliyetDetayi         = dto.MaliyetDetayi;
            existing.Kar                   = kar;
            existing.TalepEdenKullaniciAdi = currentUserName;
            existing.TalepTarihi           = DateTime.Now;
            existing.Durum                 = "Onay Bekliyor";
            existing.RedNotu               = null;
            existing.IslemYapanKullanici   = null;
            existing.IslemTarihi           = null;
            uow.PurchaseRequests.Update(existing);
        }
        else
        {
            // INSERT branch (lines 2128-2152).
            var entity = new PurchaseRequest
            {
                TalepTipi             = "Muhasebe",
                SiparisNo             = no,
                UrunAdi               = urunAdi,
                UrunTuru              = string.Empty,
                UrunMaliyeti          = 0m,
                AlinanYer             = string.Empty,
                MusteriAdi            = order.MusteriAd,
                ToplamSiparis         = dto.ToplamSiparis,
                KaporaBakiyesi        = dto.KaporaBakiyesi,
                KalanBakiyeTalep      = dto.KalanBakiyeTalep,
                PesinYuzde            = dto.PesinYuzde,
                Maliyet               = dto.Maliyet,
                MaliyetDetayi         = dto.MaliyetDetayi,
                Kar                   = kar,
                TalepEdenKullaniciAdi = currentUserName,
                Departman             = "Muhasebe",
                TalepTarihi           = DateTime.Now,
                Durum                 = "Onay Bekliyor",
            };
            await uow.PurchaseRequests.AddAsync(entity);
        }

        await uow.SaveChangesAsync();
    }

    public async Task ApproveMuhasebeAndMoveToPlanningAsync(string siparisNo, int currentUserId)
    {
        var no = NormalizeNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        // Legacy Muhasebe.cs 2229-2245: aşama gates.
        if (order.Kontrol != "Onay")
            throw new BusinessException(
                "Sipariş henüz Kontrol onayı almamış. Önce Kontrol aşamasında onaylanmalı.");

        // İdempotent no-op: zaten Planlama'daysa ikinci tık zararsız.
        if (order.SiparisMiTeklifMi == "Planlama")
            return;

        if (order.SiparisMiTeklifMi != "Siparis")
            throw new BusinessException(
                $"Sipariş zaten '{order.SiparisMiTeklifMi}' aşamasında. " +
                "Muhasebe onayı yalnız 'Siparis' aşamasındaki kayıtlara uygulanır.");

        // Siparis → Planlama. Legacy ayrıca `Muhasebe=1` flag'i yazıyordu
        // (lines 2251-2252) ama modern Order entity'sinde bu kolon
        // modellenmiyor ve downstream hiçbir servis okumuyor — stage
        // transition'ı tek başına semantik etki. Idempotent: aynı butona
        // ikinci basışta state aynı kalır.
        order.SiparisMiTeklifMi = "Planlama";
        uow.Orders.Update(order);

        // PROMPT-v6 §1.1 — Burcu Cari onayı SiparisOnaylari'na audit yazar.
        await uow.OrderApprovals.UpsertAsync(
            order.SiparisNo, currentUserId, "MuhasebeOnaylandi",
            "Cari onay — sipariş Planlama aşamasına alındı.");

        await uow.SaveChangesAsync();
    }

    /// <summary>
    /// PROMPT-v6 §1.1 — Burcu lojistik onayı: Hazir + LojistikOnay='Bekliyor'
    /// siparişi 'Onay' yapar; sipariş lojistik ready-listte belirir.
    /// </summary>
    public async Task ApproveLogisticsAsync(string siparisNo, int currentUserId)
    {
        var no = NormalizeNo(siparisNo);
        var order = await uow.Orders.GetByNoAsync(no)
            ?? throw new NotFoundException("Order", siparisNo);

        if (order.SiparisMiTeklifMi != "Hazir")
            throw new BusinessException(
                $"Sipariş '{order.SiparisMiTeklifMi}' aşamasında. " +
                "Lojistik onayı yalnız 'Hazir' aşamasındaki kayıtlara uygulanır.");

        // İdempotent no-op: zaten onaylıysa (veya NULL = gate'siz eski kayıt)
        // ikinci tık zararsız.
        if (order.LojistikOnay is null or "Onay")
            return;

        order.LojistikOnay = "Onay";
        uow.Orders.Update(order);

        // PROMPT-v6 §1.1 — Burcu lojistik onayı SiparisOnaylari'na audit yazar.
        await uow.OrderApprovals.UpsertAsync(
            order.SiparisNo, currentUserId, "LojistikOnaylandi",
            "Lojistik onay — sipariş sevkiyat kuyruğuna açıldı.");

        await uow.SaveChangesAsync();
    }

    public async Task UploadMuhasebeEkAsync(string siparisNo, byte[] data, int currentUserId)
    {
        var order = await uow.Orders.GetByNoAsync(NormalizeNo(siparisNo))
            ?? throw new NotFoundException("Order", siparisNo);

        // SiparisAlTablo.MuhasebeEk = byte[]  (Faz 3 bloku bu metod ile kalktı)
        order.MuhasebeEk = data;
        uow.Orders.Update(order);

        // SiparisOnaylari audit (Paket 2 — UPSERT)
        await uow.OrderApprovals.UpsertAsync(
            order.SiparisNo, currentUserId, "Onaylandi",
            $"MuhasebeEk yüklendi ({data.Length} bayt).");
        await uow.SaveChangesAsync();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static AccountingTransactionDto MapTx(AccountingTransaction t) =>
        new(t.ID, t.SiparisNo, t.MusteriID, t.KullaniciID, t.OdenenMiktar, t.Tarih);

    private static string NormalizeNo(string no) =>
        no.StartsWith('T') ? "S" + no[1..] : no;
}
