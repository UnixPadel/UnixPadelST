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
                Tarih:            o.Tarih));
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
            Tarih:            o.Tarih);
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

    public async Task<TransactionPageDto> GetTransactionHistoryPagedAsync(TransactionFilterDto filter)
    {
        var rows = await uow.Accounting.SearchAsync(
            filter.SiparisNo, filter.KullaniciID, filter.BaslangicTarih, filter.BitisTarih);

        var users = (await uow.Kullanicilar.GetAllAsync())
            .ToDictionary(u => u.KullaniciID, u => $"{u.Ad} {u.Soyad}".Trim());

        var allOrders = (await uow.Orders.GetAllAsync())
            .Where(o => !string.IsNullOrEmpty(o.SiparisNo))
            .GroupBy(o => o.SiparisNo)
            .ToDictionary(g => g.Key, g => (g.First().MusteriAd, g.First().ParaTipi));

        IEnumerable<TransactionListItemDto> projected = rows.Select(t =>
        {
            var ord = !string.IsNullOrEmpty(t.SiparisNo) && allOrders.TryGetValue(t.SiparisNo, out var v)
                ? v
                : (MusteriAd: (string?)null, ParaTipi: (string?)null);
            return new TransactionListItemDto(
                t.ID, t.SiparisNo ?? string.Empty, t.MusteriID,
                ord.MusteriAd, t.KullaniciID,
                users.TryGetValue(t.KullaniciID, out var n) ? n : null,
                ord.ParaTipi, t.OdenenMiktar, t.Tarih);
        });

        if (!string.IsNullOrWhiteSpace(filter.MusteriAd))
        {
            var f = filter.MusteriAd.ToLower();
            projected = projected.Where(t => (t.MusteriAd ?? "").ToLower().Contains(f));
        }

        var list = projected.ToList();
        int total = list.Count;
        int page  = Math.Max(1, filter.Page);
        int size  = Math.Clamp(filter.PageSize, 1, 200);

        var pageItems = list.Skip((page - 1) * size).Take(size).ToList().AsReadOnly();
        return new TransactionPageDto(pageItems, total, page, size);
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
