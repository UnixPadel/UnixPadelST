using System.Data;
using CrmModern.Core;
using CrmModern.Core.DTOs.WarehouseStock;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces.Services;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Services;

internal sealed class WarehouseStockService : IWarehouseStockService
{
    private readonly AppDbContext _ctx;
    private readonly IBeyannameExtractor _extractor;
    private readonly IAuditService _audit;
    private readonly ILogger<WarehouseStockService> _logger;

    public WarehouseStockService(
        AppDbContext ctx,
        IBeyannameExtractor extractor,
        IAuditService audit,
        ILogger<WarehouseStockService> logger)
    {
        _ctx = ctx;
        _extractor = extractor;
        _audit = audit;
        _logger = logger;
    }

    public async Task<AnalyzeResultDto> AnalyzeAsync(byte[] data, string mimeType, CancellationToken ct = default)
    {
        if (data == null || data.Length == 0)
            throw new BusinessException("Belge verisi boş.", "fileEmpty");

        if (data.Length > WarehouseStockRules.MaxBelgeBayt)
            throw new BusinessException("Belge boyutu 10 MB'tan büyük olamaz.", "fileTooLarge");

        try
        {
            var draft = await _extractor.ExtractAsync(data, mimeType, ct);

            int? existingId = null;
            if (!string.IsNullOrWhiteSpace(draft.BeyannameNo))
            {
                var existing = await _ctx.AntrepoBeyanname
                    .Where(b => b.BeyannameNo == draft.BeyannameNo)
                    .Select(b => (int?)b.Id)
                    .FirstOrDefaultAsync(ct);

                if (existing.HasValue)
                {
                    existingId = existing.Value;
                    var warnings = draft.Uyarilar.ToList();
                    warnings.Insert(0, new DraftWarningDto(
                        "declarationAlreadyExists",
                        $"Bu beyanname numarası ({draft.BeyannameNo}) zaten sistemde kayıtlı."));
                    draft = draft with { Uyarilar = warnings };
                }
            }

            return new AnalyzeResultDto(
                Basarili: true,
                HataKodu: null,
                HataMesaji: null,
                Taslak: draft,
                MevcutBeyannameId: existingId);
        }
        catch (BusinessException ex)
        {
            _logger.LogInformation("Beyanname analizi hata döndü ({Code}): {Message}", ex.Code, ex.Message);
            return new AnalyzeResultDto(
                Basarili: false,
                HataKodu: ex.Code ?? "geminiFailed",
                HataMesaji: ex.Message,
                Taslak: null,
                MevcutBeyannameId: null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Beyanname analizi sırasında beklenmeyen hata.");
            return new AnalyzeResultDto(
                Basarili: false,
                HataKodu: "geminiFailed",
                HataMesaji: "Otomatik okuma servisi şu an kullanılamıyor. Bilgileri elle girebilirsiniz.",
                Taslak: null,
                MevcutBeyannameId: null);
        }
    }

    public async Task<StockListDto> GetItemsAsync(string? konum, bool tamamlananlar, string? q)
    {
        // 1. Fetch raw items, declarations, and active exits
        var itemsQuery = _ctx.AntrepoStokKalem.AsNoTracking();
        var declarations = await _ctx.AntrepoBeyanname.AsNoTracking()
            .Select(b => new { b.Id, b.BeyannameNo })
            .ToDictionaryAsync(b => b.Id, b => b.BeyannameNo);

        var exitsGrouped = await _ctx.AntrepoStokCikis.AsNoTracking()
            .Where(c => c.GeriAlinmaZamani == null)
            .GroupBy(c => c.KalemId)
            .Select(g => new
            {
                KalemId = g.Key,
                TotalMiktar = g.Sum(x => x.Miktar),
                TotalKap = g.Sum(x => x.KapAdedi ?? 0m),
                SonCikis = g.Max(x => x.Tarih)
            })
            .ToDictionaryAsync(g => g.KalemId);

        var allItems = await itemsQuery.ToListAsync();

        var dtoList = new List<StockItemListDto>();
        foreach (var item in allItems)
        {
            exitsGrouped.TryGetValue(item.Id, out var exitInfo);
            var exitedMiktar = exitInfo?.TotalMiktar ?? 0m;
            var exitedKap = exitInfo?.TotalKap ?? 0m;

            var kalan = Math.Max(0m, item.Miktar - exitedMiktar);
            decimal? kalanKap = item.KapAdedi.HasValue
                ? Math.Max(0m, item.KapAdedi.Value - exitedKap)
                : null;

            string durum = kalan <= 0m
                ? "Tamam"
                : (kalan < item.Miktar ? "Kismen" : "Bekliyor");

            string? beyannameNo = null;
            if (item.BeyannameId.HasValue && declarations.TryGetValue(item.BeyannameId.Value, out var bNo))
                beyannameNo = bNo;

            dtoList.Add(new StockItemListDto(
                Id: item.Id,
                BeyannameId: item.BeyannameId,
                BeyannameNo: beyannameNo,
                Konum: item.Konum,
                MalAdi: item.MalAdi,
                TicariTanim: item.TicariTanim,
                Miktar: item.Miktar,
                Kalan: kalan,
                Birim: item.Birim,
                KapAdedi: item.KapAdedi,
                KalanKap: kalanKap,
                KapCinsi: item.KapCinsi,
                Durum: durum,
                OlusturmaTarihi: item.OlusturmaTarihi,
                SonCikisTarihi: exitInfo?.SonCikis));
        }

        // Apply text search q if provided
        var queryFiltered = dtoList.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            queryFiltered = queryFiltered.Where(i =>
                (i.MalAdi != null && i.MalAdi.ToLowerInvariant().Contains(term)) ||
                (i.TicariTanim != null && i.TicariTanim.ToLowerInvariant().Contains(term)) ||
                (i.BeyannameNo != null && i.BeyannameNo.ToLowerInvariant().Contains(term)));
        }

        // Compute counts based on the 'tamamlananlar' rule:
        // By default (tamamlananlar=false), counts represent active stock (Bekliyor or Kismen).
        // If tamamlananlar=true, counts include finished stock too.
        var countBase = tamamlananlar
            ? queryFiltered
            : queryFiltered.Where(i => i.Durum != "Tamam");

        var countTumu = countBase.Count();
        var countAntrepo = countBase.Count(i => i.Konum == WarehouseStockRules.KonumAntrepo);
        var countDepo = countBase.Count(i => i.Konum == WarehouseStockRules.KonumDepo);
        var sayac = new StockCountsDto(countTumu, countAntrepo, countDepo);

        // Apply tamamlananlar filter
        if (!tamamlananlar)
            queryFiltered = queryFiltered.Where(i => i.Durum != "Tamam");

        // Apply konum filter
        if (!string.IsNullOrWhiteSpace(konum) && konum != "Tumu")
            queryFiltered = queryFiltered.Where(i => string.Equals(i.Konum, konum, StringComparison.OrdinalIgnoreCase));

        // Order: active first, then created desc
        var ordered = queryFiltered
            .OrderBy(i => i.Durum == "Tamam" ? 1 : 0)
            .ThenByDescending(i => i.OlusturmaTarihi)
            .ToList();

        return new StockListDto(ordered, sayac);
    }

    public async Task<StockItemDetailDto> GetItemDetailAsync(int id, int currentUserId, bool isManager)
    {
        var item = await _ctx.AntrepoStokKalem.FindAsync(id)
            ?? throw new NotFoundException("StockItem", id);

        var exits = await _ctx.AntrepoStokCikis
            .Where(c => c.KalemId == id)
            .OrderByDescending(c => c.KayitZamani)
            .ToListAsync();

        var users = await _ctx.KullaniciBilgileri.AsNoTracking()
            .Select(u => new { u.KullaniciID, AdSoyad = (u.Ad + " " + u.Soyad).Trim() })
            .ToDictionaryAsync(u => u.KullaniciID, u => u.AdSoyad);

        var activeExits = exits.Where(c => c.GeriAlinmaZamani == null).ToList();
        var exitedMiktar = activeExits.Sum(c => c.Miktar);
        var exitedKap = activeExits.Sum(c => c.KapAdedi ?? 0m);

        var kalan = Math.Max(0m, item.Miktar - exitedMiktar);
        decimal? kalanKap = item.KapAdedi.HasValue
            ? Math.Max(0m, item.KapAdedi.Value - exitedKap)
            : null;

        string durum = kalan <= 0m ? "Tamam" : (kalan < item.Miktar ? "Kismen" : "Bekliyor");

        BeyannameOzetDto? beyannameOzet = null;
        string? beyannameNo = null;

        if (item.BeyannameId.HasValue)
        {
            var b = await _ctx.AntrepoBeyanname.FindAsync(item.BeyannameId.Value);
            if (b != null)
            {
                beyannameNo = b.BeyannameNo;
                users.TryGetValue(b.YukleyenKullaniciID, out var yukleyenAd);

                beyannameOzet = new BeyannameOzetDto(
                    Id: b.Id,
                    No: b.BeyannameNo,
                    TescilTarihi: b.TescilTarihi,
                    RejimKodu: b.RejimKodu,
                    GumrukIdaresi: b.GumrukIdaresi,
                    Gonderici: b.Gonderici,
                    Alici: b.Alici,
                    Doviz: b.Doviz,
                    FaturaTutari: b.FaturaTutari,
                    Kaynak: b.Kaynak,
                    BelgeVar: b.Belge != null && b.Belge.Length > 0,
                    BelgeAdi: b.BelgeAdi,
                    YukleyenAd: yukleyenAd,
                    YuklemeTarihi: b.YuklemeTarihi);
            }
        }

        var itemListDto = new StockItemListDto(
            Id: item.Id,
            BeyannameId: item.BeyannameId,
            BeyannameNo: beyannameNo,
            Konum: item.Konum,
            MalAdi: item.MalAdi,
            TicariTanim: item.TicariTanim,
            Miktar: item.Miktar,
            Kalan: kalan,
            Birim: item.Birim,
            KapAdedi: item.KapAdedi,
            KalanKap: kalanKap,
            KapCinsi: item.KapCinsi,
            Durum: durum,
            OlusturmaTarihi: item.OlusturmaTarihi,
            SonCikisTarihi: activeExits.Count > 0 ? activeExits.Max(c => c.Tarih) : null);

        var now = DateTime.Now;
        var exitDtos = new List<StockExitDto>();
        foreach (var c in exits)
        {
            users.TryGetValue(c.GirenKullaniciID, out var girenAd);
            string? geriAlanAd = null;
            if (c.GeriAlanKullaniciID.HasValue)
                users.TryGetValue(c.GeriAlanKullaniciID.Value, out geriAlanAd);

            bool geriAlinabilir = false;
            if (c.GeriAlinmaZamani == null)
            {
                var days = (now - c.KayitZamani).TotalDays;
                if (days <= WarehouseStockRules.CikisGeriAlmaSuresiGun &&
                    (c.GirenKullaniciID == currentUserId || isManager))
                {
                    geriAlinabilir = true;
                }
            }

            exitDtos.Add(new StockExitDto(
                Id: c.Id,
                Miktar: c.Miktar,
                KapAdedi: c.KapAdedi,
                Tarih: c.Tarih,
                Not: c.Aciklama,
                GirenKullaniciId: c.GirenKullaniciID,
                GirenAd: girenAd,
                KayitZamani: c.KayitZamani,
                GeriAlinmaZamani: c.GeriAlinmaZamani,
                GeriAlanAd: geriAlanAd,
                GeriAlinabilir: geriAlinabilir));
        }

        return new StockItemDetailDto(
            Item: itemListDto,
            Gtip: item.Gtip,
            MenseUlke: item.MenseUlke,
            BrutKg: item.BrutKg,
            NetKg: item.NetKg,
            KalemNo: item.KalemNo,
            KalemFiyati: item.KalemFiyati,
            Beyanname: beyannameOzet,
            Cikislar: exitDtos,
            GeriAlmaSuresiGun: WarehouseStockRules.CikisGeriAlmaSuresiGun);
    }

    public async Task<CreateStockResultDto> CreateAsync(
        CreateStockRequest req, byte[]? belge, string? belgeAdi, string? belgeTip, int currentUserId)
    {
        if (!WarehouseStockRules.GecerliKonum(req.Konum))
            throw new BusinessException("Geçersiz konum seçildi (Antrepo veya Depo olmalı).", "invalidLocation");

        if (req.Kalemler == null || req.Kalemler.Count == 0)
            throw new BusinessException("En az bir mal kalemi girilmelidir.", "itemsRequired");

        var cleanBeyannameNo = string.IsNullOrWhiteSpace(req.BeyannameNo) ? null : req.BeyannameNo.Trim();
        int? beyannameId = null;
        var now = DateTime.Now;

        // If BeyannameNo is specified or document is attached or header fields present, create AntrepoBeyanname
        if (cleanBeyannameNo != null || belge != null || !string.IsNullOrWhiteSpace(req.Gonderici) || !string.IsNullOrWhiteSpace(req.GumrukIdaresi))
        {
            if (cleanBeyannameNo != null)
            {
                var exists = await _ctx.AntrepoBeyanname.AnyAsync(b => b.BeyannameNo == cleanBeyannameNo);
                if (exists)
                    throw new BusinessException($"Bu beyanname numarası ({cleanBeyannameNo}) zaten kayıtlı.", "declarationAlreadyExists");
            }

            var beyanname = new AntrepoBeyanname
            {
                BeyannameNo = cleanBeyannameNo,
                TescilTarihi = req.TescilTarihi,
                RejimKodu = req.RejimKodu,
                GumrukIdaresi = req.GumrukIdaresi,
                Gonderici = req.Gonderici,
                Alici = req.Alici,
                Doviz = req.Doviz,
                FaturaTutari = req.FaturaTutari,
                Kur = req.Kur,
                Kaynak = req.Kaynak ?? (belge != null ? WarehouseStockRules.KaynakOtomatik : WarehouseStockRules.KaynakElle),
                BelgeAdi = belgeAdi,
                BelgeTip = belgeTip,
                Belge = belge,
                HamJson = req.HamJson,
                YukleyenKullaniciID = currentUserId,
                YuklemeTarihi = now
            };

            _ctx.AntrepoBeyanname.Add(beyanname);
            await _ctx.SaveChangesAsync();
            beyannameId = beyanname.Id;
        }

        var createdIds = new List<int>();
        int seq = 1;
        foreach (var k in req.Kalemler)
        {
            var malAdi = string.IsNullOrWhiteSpace(k.MalAdi) ? $"Kalem {seq}" : k.MalAdi.Trim();
            if (k.Miktar <= 0)
                throw new BusinessException($"'{malAdi}' kaleminin miktarı 0'dan büyük olmalıdır.", "amountMustBePositive");

            var birim = string.IsNullOrWhiteSpace(k.Birim) ? "ADET" : k.Birim.Trim().ToUpperInvariant();

            var kalem = new AntrepoStokKalem
            {
                BeyannameId = beyannameId,
                Konum = req.Konum,
                MalAdi = malAdi,
                TicariTanim = k.TicariTanim,
                Miktar = k.Miktar,
                Birim = birim,
                KapAdedi = k.KapAdedi,
                KapCinsi = k.KapCinsi,
                Gtip = k.Gtip,
                MenseUlke = k.MenseUlke,
                BrutKg = k.BrutKg,
                NetKg = k.NetKg,
                KalemNo = k.KalemNo ?? seq,
                KalemFiyati = k.KalemFiyati,
                OlusturanKullaniciID = currentUserId,
                OlusturmaTarihi = now
            };

            _ctx.AntrepoStokKalem.Add(kalem);
            seq++;
        }

        await _ctx.SaveChangesAsync();

        foreach (var k in _ctx.ChangeTracker.Entries<AntrepoStokKalem>().Where(e => e.State == EntityState.Unchanged))
        {
            createdIds.Add(k.Entity.Id);
        }

        await _audit.LogAsync(
            "StockCreate",
            "AntrepoStokKalem",
            beyannameId?.ToString() ?? createdIds.FirstOrDefault().ToString(),
            currentUserId,
            $"{req.Konum} stoğuna {req.Kalemler.Count} kalem eklendi. (Beyanname: {cleanBeyannameNo ?? "—"})");

        return new CreateStockResultDto(beyannameId ?? 0, createdIds);
    }

    public async Task UpdateItemAsync(int id, UpdateStockItemRequest req, int currentUserId)
    {
        if (!WarehouseStockRules.GecerliKonum(req.Konum))
            throw new BusinessException("Geçersiz konum seçildi.", "invalidLocation");

        var item = await _ctx.AntrepoStokKalem.FindAsync(id)
            ?? throw new NotFoundException("StockItem", id);

        var activeExits = await _ctx.AntrepoStokCikis
            .Where(c => c.KalemId == id && c.GeriAlinmaZamani == null)
            .ToListAsync();

        var exitedMiktar = activeExits.Sum(c => c.Miktar);
        var exitedKap = activeExits.Sum(c => c.KapAdedi ?? 0m);

        if (req.Miktar < exitedMiktar)
        {
            throw new BusinessException(
                $"Yeni miktar ({req.Miktar:N2}) çıkan miktardan ({exitedMiktar:N2}) az olamaz.",
                "quantityLessThanExited");
        }

        if (req.KapAdedi.HasValue && req.KapAdedi.Value < exitedKap)
        {
            throw new BusinessException(
                $"Yeni kap adedi ({req.KapAdedi.Value}) çıkan kap adedinden ({exitedKap}) az olamaz.",
                "packagesLessThanExited");
        }

        var eskiKonum = item.Konum;
        item.Konum = req.Konum;
        item.MalAdi = string.IsNullOrWhiteSpace(req.MalAdi) ? item.MalAdi : req.MalAdi.Trim();
        item.Miktar = req.Miktar;
        item.Birim = string.IsNullOrWhiteSpace(req.Birim) ? item.Birim : req.Birim.Trim().ToUpperInvariant();
        item.KapAdedi = req.KapAdedi;
        item.KapCinsi = req.KapCinsi;

        await _ctx.SaveChangesAsync();

        await _audit.LogAsync(
            "StockUpdate",
            "AntrepoStokKalem",
            item.Id.ToString(),
            currentUserId,
            $"Stok kalemi güncellendi ({item.MalAdi}, Konum: {eskiKonum} → {item.Konum}, Miktar: {item.Miktar} {item.Birim})");
    }

    public async Task DeleteItemAsync(int id, int currentUserId)
    {
        var item = await _ctx.AntrepoStokKalem.FindAsync(id)
            ?? throw new NotFoundException("StockItem", id);

        var hasActiveExits = await _ctx.AntrepoStokCikis
            .AnyAsync(c => c.KalemId == id && c.GeriAlinmaZamani == null);

        if (hasActiveExits)
        {
            throw new BusinessException(
                "Bu maldan yola çıkış yapılmış. Çıkışı olan kayıt doğrudan silinemez (önce çıkışı geri almalısınız).",
                "itemHasExits");
        }

        // Also clean up undone exits if any
        var undoneExits = await _ctx.AntrepoStokCikis.Where(c => c.KalemId == id).ToListAsync();
        if (undoneExits.Count > 0)
            _ctx.AntrepoStokCikis.RemoveRange(undoneExits);

        _ctx.AntrepoStokKalem.Remove(item);
        await _ctx.SaveChangesAsync();

        await _audit.LogAsync(
            "StockDelete",
            "AntrepoStokKalem",
            id.ToString(),
            currentUserId,
            $"Stok kalemi silindi: {item.MalAdi} ({item.Konum})");
    }

    public async Task<int> AddExitAsync(int itemId, AddStockExitRequest req, int currentUserId)
    {
        var item = await _ctx.AntrepoStokKalem.FindAsync(itemId)
            ?? throw new NotFoundException("StockItem", itemId);

        var activeExits = await _ctx.AntrepoStokCikis
            .Where(c => c.KalemId == itemId && c.GeriAlinmaZamani == null)
            .ToListAsync();

        var exitedMiktar = activeExits.Sum(c => c.Miktar);
        var exitedKap = activeExits.Sum(c => c.KapAdedi ?? 0m);

        var remainingMiktar = Math.Max(0m, item.Miktar - exitedMiktar);
        decimal? remainingKap = item.KapAdedi.HasValue
            ? Math.Max(0m, item.KapAdedi.Value - exitedKap)
            : null;

        if (remainingMiktar <= 0m)
            throw new BusinessException("Bu malın tamamı zaten çıkmış durumda.", "stockAlreadyExhausted");

        decimal exitMiktar;
        decimal? exitKap;

        if (req.Tamami)
        {
            exitMiktar = remainingMiktar;
            exitKap = remainingKap;
        }
        else
        {
            if (!req.Miktar.HasValue || req.Miktar.Value <= 0m)
                throw new BusinessException("Çıkan miktar 0'dan büyük olmalıdır.", "amountMustBePositive");

            if (req.Miktar.Value > remainingMiktar)
            {
                throw new BusinessException(
                    $"Çıkan miktar ({req.Miktar.Value:N2}) kalan miktardan ({remainingMiktar:N2}) fazla olamaz.",
                    "exitQuantityExceedsRemaining",
                    new { max = remainingMiktar });
            }

            exitMiktar = req.Miktar.Value;

            if (req.KapAdedi.HasValue)
            {
                if (req.KapAdedi.Value < 0m)
                    throw new BusinessException("Kap adedi eksi olamaz.", "packagesNegative");

                if (remainingKap.HasValue && req.KapAdedi.Value > remainingKap.Value)
                {
                    throw new BusinessException(
                        $"Çıkan kap ({req.KapAdedi.Value}) kalan kaptan ({remainingKap.Value}) fazla olamaz.",
                        "exitPackagesExceedsRemaining",
                        new { max = remainingKap.Value });
                }
                exitKap = req.KapAdedi.Value;
            }
            else
            {
                // Optional: if exiting all remaining quantity and kap is present, exit all remaining kap
                if (exitMiktar == remainingMiktar && remainingKap.HasValue)
                    exitKap = remainingKap;
                else
                    exitKap = null;
            }
        }

        var exit = new AntrepoStokCikis
        {
            KalemId = itemId,
            Miktar = exitMiktar,
            KapAdedi = exitKap,
            Tarih = req.Tarih ?? DateTime.Today,
            Aciklama = string.IsNullOrWhiteSpace(req.Not) ? null : req.Not.Trim(),
            GirenKullaniciID = currentUserId,
            KayitZamani = DateTime.Now
        };

        _ctx.AntrepoStokCikis.Add(exit);
        await _ctx.SaveChangesAsync();

        try
        {
            await _audit.LogAsync(
                "StockExit",
                "AntrepoStokKalem",
                itemId.ToString(),
                currentUserId,
                $"{item.MalAdi} kaleminden {exitMiktar} {item.Birim} yola çıktı olarak işaretlendi. (Kalan: {remainingMiktar - exitMiktar} {item.Birim})");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Stok çıkış audit kaydı oluşturulamadı: KalemId={ItemId}", itemId);
        }

        return exit.Id;
    }

    public async Task UndoExitAsync(int exitId, int currentUserId, bool isManager)
    {
        var exit = await _ctx.AntrepoStokCikis.FindAsync(exitId)
            ?? throw new NotFoundException("StockExit", exitId);

        if (exit.GeriAlinmaZamani != null)
            throw new BusinessException("Bu çıkış işlemi zaten geri alınmış.", "exitAlreadyUndone");

        // Permission: creator or manager
        if (exit.GirenKullaniciID != currentUserId && !isManager)
            throw new UnauthorizedException("Bu çıkışı yalnızca işlemi yapan kullanıcı veya Yönetici geri alabilir.");

        // Time limit check: 30 days
        var age = (DateTime.Now - exit.KayitZamani).TotalDays;
        if (age > WarehouseStockRules.CikisGeriAlmaSuresiGun)
        {
            throw new BusinessException(
                $"Geri alma süresi ({WarehouseStockRules.CikisGeriAlmaSuresiGun} gün) dolmuştur. Bu işlem geri alınamaz.",
                "exitUndoExpired");
        }

        exit.GeriAlinmaZamani = DateTime.Now;
        exit.GeriAlanKullaniciID = currentUserId;

        await _ctx.SaveChangesAsync();

        var item = await _ctx.AntrepoStokKalem.FindAsync(exit.KalemId);

        try
        {
            await _audit.LogAsync(
                "StockExitUndo",
                "AntrepoStokKalem",
                exit.KalemId.ToString(),
                currentUserId,
                $"{item?.MalAdi ?? "—"} kalemine ait {exit.Miktar} miktarındaki çıkış geri alındı.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Stok çıkış geri alma audit kaydı oluşturulamadı: ExitId={ExitId}", exitId);
        }
    }

    public async Task<StockDocumentDto?> GetDocumentAsync(int beyannameId)
    {
        var row = await _ctx.AntrepoBeyanname
            .Where(b => b.Id == beyannameId)
            .Select(b => new { b.Belge, b.BelgeAdi, b.BelgeTip })
            .FirstOrDefaultAsync();

        if (row?.Belge == null || row.Belge.Length == 0)
            return null;

        var name = string.IsNullOrWhiteSpace(row.BelgeAdi) ? $"beyanname_{beyannameId}.pdf" : row.BelgeAdi;
        var type = string.IsNullOrWhiteSpace(row.BelgeTip) ? "application/pdf" : row.BelgeTip;

        return new StockDocumentDto(row.Belge, name, type);
    }
}
