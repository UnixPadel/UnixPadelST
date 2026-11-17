using CrmModern.Core;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces.Services;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Muhasebe Klasörü. Yeni dosyalar SiparisMuhasebeEk tablosuna EKLENİR (üzerine
/// yazılmaz). Eski tek-blob ekler (SiparisAlTablo.MuhasebeEk / Ek) taşınmaz;
/// klasörde ayrı satır olarak gösterilir, türü ilk baytlardan tespit edilir.
/// Hiçbir sorgu gereksiz blob yüklemez (projeksiyon / LENGTH + SUBSTRING).
/// 40+ ergonomi K5 — silme yumuşaktır (Silindi bayrağı); silinen dosya liste,
/// sayaç ve indirmeden düşer, RestoreAsync ile geri gelir.
/// </summary>
internal sealed class OrderFolderService(AppDbContext ctx, IAuditService audit) : IOrderFolderService
{
    private const string AuditEntity = "OrderFolder";

    public async Task<OrderFolderRef> ResolveAsync(string siparisNo)
    {
        // Teklif numarası (T…) aynı satırın SiparisNo'suna (S…) karşılık gelir.
        var no = siparisNo.StartsWith('T') ? "S" + siparisNo[1..] : siparisNo;
        var order = await ctx.SiparisAlTablo
            .AsNoTracking()
            .Where(o => o.SiparisNo == no || o.TeklifNo == siparisNo)
            .Select(o => new OrderFolderRef(o.SiparisAlID, o.SiparisNo, o.TeklifNo, o.KullaniciID))
            .FirstOrDefaultAsync();
        return order ?? throw new NotFoundException("Order", siparisNo);
    }

    public async Task<(IReadOnlyList<OrderFolderFileDto> Dosyalar,
                       OrderFolderLegacyFileDto? OncekiMuhasebeEk,
                       OrderFolderLegacyFileDto? SaticiEk)> GetContentAsync(OrderFolderRef order, bool includeDeleted = false)
    {
        var dosyalar = await ctx.SiparisMuhasebeEk
            .AsNoTracking()
            .Where(e => e.SiparisAlID == order.SiparisAlID && (includeDeleted || !e.Silindi))
            .OrderByDescending(e => e.EkID)
            // Projeksiyon: Veri (blob) sorguya dahil edilmez.
            .Select(e => new OrderFolderFileDto(e.EkID, e.Ad, e.Tip, e.Boyut, e.Tarih, e.YukleyenAdSoyad,
                                                e.Silindi, e.SilinmeTarihi))
            .ToListAsync();

        var legacy = await GetLegacyInfoAsync(order.SiparisAlID);
        var onceki = Legacy(legacy?.MuhasebeEkBoyut, legacy?.MuhasebeEkBas, $"muhasebe_ek_{order.SiparisNo}");
        var satici = Legacy(legacy?.EkBoyut, legacy?.EkBas, $"siparis_ek_{order.SiparisNo}");
        return (dosyalar, onceki, satici);
    }

    public async Task<OrderFolderFileDto> UploadAsync(OrderFolderRef order, string ad, string tip, byte[] veri, int kullaniciId)
    {
        var user = await ctx.KullaniciBilgileri.AsNoTracking()
            .Where(k => k.KullaniciID == kullaniciId)
            .Select(k => (k.Ad + " " + k.Soyad).Trim())
            .FirstOrDefaultAsync();

        var entity = new OrderAccountingFile
        {
            SiparisAlID         = order.SiparisAlID,
            Ad                  = ad.Length > 255 ? ad[..255] : ad,
            Tip                 = tip,
            Boyut               = veri.LongLength,
            Veri                = veri,
            Tarih               = DateTime.Now,
            YukleyenKullaniciID = kullaniciId,
            YukleyenAdSoyad     = string.IsNullOrWhiteSpace(user) ? null : user,
        };
        ctx.SiparisMuhasebeEk.Add(entity);
        await ctx.SaveChangesAsync();

        await audit.LogAsync("Upload", AuditEntity, order.SiparisNo, kullaniciId,
            $"{entity.Ad} ({entity.Boyut} bayt)");

        return new OrderFolderFileDto(entity.EkID, entity.Ad, entity.Tip, entity.Boyut, entity.Tarih, entity.YukleyenAdSoyad);
    }

    public async Task<OrderFolderFileDataDto?> GetFileAsync(OrderFolderRef order, int ekId) =>
        await ctx.SiparisMuhasebeEk
            .AsNoTracking()
            .Where(e => e.EkID == ekId && e.SiparisAlID == order.SiparisAlID && !e.Silindi)
            .Select(e => new OrderFolderFileDataDto(e.Veri, e.Ad, e.Tip))
            .FirstOrDefaultAsync();

    public async Task<OrderFolderFileDataDto?> GetLegacyFileAsync(OrderFolderRef order, string kind)
    {
        byte[]? veri;
        string prefix;
        switch (kind?.ToLowerInvariant())
        {
            case "muhasebe":
                veri = await ctx.SiparisAlTablo.AsNoTracking()
                    .Where(o => o.SiparisAlID == order.SiparisAlID).Select(o => o.MuhasebeEk).FirstOrDefaultAsync();
                prefix = "muhasebe_ek_";
                break;
            case "satici":
                veri = await ctx.SiparisAlTablo.AsNoTracking()
                    .Where(o => o.SiparisAlID == order.SiparisAlID).Select(o => o.Ek).FirstOrDefaultAsync();
                prefix = "siparis_ek_";
                break;
            default:
                throw new BusinessException($"Geçersiz ek türü: {kind}.", "invalidAttachmentType", new { type = kind });
        }
        if (veri is null || veri.Length == 0) return null;
        var (uzanti, tip) = FileSignature.Detect(veri.AsSpan(0, Math.Min(8, veri.Length)));
        return new OrderFolderFileDataDto(veri, $"{prefix}{order.SiparisNo}{uzanti}", tip);
    }

    public async Task DeleteAsync(OrderFolderRef order, int ekId, int kullaniciId)
    {
        var info = await ctx.SiparisMuhasebeEk.AsNoTracking()
            .Where(e => e.EkID == ekId && e.SiparisAlID == order.SiparisAlID && !e.Silindi)
            .Select(e => new { e.Ad, e.Boyut })
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("OrderFolderFile", ekId);

        // Yumuşak silme: blob korunur, satır bayraklanır (Geri al için).
        var now = DateTime.Now;
        await ctx.SiparisMuhasebeEk.Where(e => e.EkID == ekId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Silindi, true)
                .SetProperty(e => e.SilinmeTarihi, now)
                .SetProperty(e => e.SilenKullaniciID, kullaniciId));
        await audit.LogAsync("Delete", AuditEntity, order.SiparisNo, kullaniciId, $"{info.Ad} ({info.Boyut} bayt)");
    }

    public async Task<OrderFolderFileDto> RestoreAsync(OrderFolderRef order, int ekId, int kullaniciId)
    {
        var row = await ctx.SiparisMuhasebeEk.AsNoTracking()
            .Where(e => e.EkID == ekId && e.SiparisAlID == order.SiparisAlID)
            .Select(e => new OrderFolderFileDto(e.EkID, e.Ad, e.Tip, e.Boyut, e.Tarih, e.YukleyenAdSoyad,
                                                e.Silindi, e.SilinmeTarihi))
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("OrderFolderFile", ekId);
        if (!row.Silindi)
            throw new BusinessException("Bu dosya silinmemiş.", "fileNotDeleted", new { name = row.Ad });

        await ctx.SiparisMuhasebeEk.Where(e => e.EkID == ekId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Silindi, false)
                .SetProperty(e => e.SilinmeTarihi, (DateTime?)null)
                .SetProperty(e => e.SilenKullaniciID, (int?)null));
        await audit.LogAsync("Restore", AuditEntity, order.SiparisNo, kullaniciId, $"{row.Ad} ({row.Boyut} bayt)");

        return row with { Silindi = false, SilinmeTarihi = null };
    }

    public async Task<int> DeleteLegacyMuhasebeEkAsync(OrderFolderRef order, int kullaniciId)
    {
        var veri = await ctx.SiparisAlTablo.AsNoTracking()
            .Where(o => o.SiparisAlID == order.SiparisAlID)
            .Select(o => o.MuhasebeEk)
            .FirstOrDefaultAsync();
        if (veri is null || veri.Length == 0) throw new NotFoundException("OrderFolderFile", "muhasebe");

        // Yumuşak silme: eski tek blob klasöre SİLİNMİŞ bir dosya satırı olarak
        // kopyalanır, sonra eski kolon boşaltılır. Geri al → normal klasör dosyası.
        var (uzanti, tip) = FileSignature.Detect(veri.AsSpan(0, Math.Min(8, veri.Length)));
        var now = DateTime.Now;
        int ekId = 0;

        // Kopya + kolon boşaltma tek transaction (retry stratejisiyle uyumlu:
        // her denemede yeni satır eklenir, deneme sonunda takipten çıkarılır).
        var strategy = ctx.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            var entity = new OrderAccountingFile
            {
                SiparisAlID      = order.SiparisAlID,
                Ad               = "onceki_muhasebe_eki" + uzanti,
                Tip              = tip,
                Boyut            = veri.LongLength,
                Veri             = veri,
                Tarih            = now,
                Silindi          = true,
                SilinmeTarihi    = now,
                SilenKullaniciID = kullaniciId,
            };
            await using var tx = await ctx.Database.BeginTransactionAsync();
            ctx.SiparisMuhasebeEk.Add(entity);
            try
            {
                await ctx.SaveChangesAsync();
                await ctx.SiparisAlTablo
                    .Where(o => o.SiparisAlID == order.SiparisAlID)
                    .ExecuteUpdateAsync(s => s.SetProperty(o => o.MuhasebeEk, (byte[]?)null));
                await tx.CommitAsync();
                ekId = entity.EkID;
            }
            finally
            {
                ctx.Entry(entity).State = EntityState.Detached;
            }
        });

        await audit.LogAsync("Delete", AuditEntity, order.SiparisNo, kullaniciId,
            $"Önceki muhasebe eki (SiparisAlTablo.MuhasebeEk) → silinmiş klasör dosyası #{ekId}");
        return ekId;
    }

    public async Task<IReadOnlyDictionary<string, int>> GetCountsAsync()
    {
        var yeni = await ctx.SiparisMuhasebeEk.AsNoTracking()
            .Where(e => !e.Silindi)
            .GroupBy(e => e.SiparisAlID)
            .Select(g => new { SiparisAlID = g.Key, Adet = g.Count() })
            .ToListAsync();
        var eski = await ctx.Database
            .SqlQuery<int>($"SELECT SiparisAlID AS Value FROM SiparisAlTablo WHERE MuhasebeEk IS NOT NULL AND LENGTH(MuhasebeEk) > 0")
            .ToListAsync();

        var adet = new Dictionary<int, int>();
        foreach (var r in yeni) adet[r.SiparisAlID] = r.Adet;
        foreach (var id in eski) adet[id] = adet.GetValueOrDefault(id) + 1;
        if (adet.Count == 0) return new Dictionary<string, int>();

        var ids = adet.Keys.ToList();
        var nolar = await ctx.SiparisAlTablo.AsNoTracking()
            .Where(o => ids.Contains(o.SiparisAlID))
            .Select(o => new { o.SiparisAlID, o.SiparisNo })
            .ToListAsync();

        var result = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var o in nolar)
            if (!string.IsNullOrEmpty(o.SiparisNo))
                result[o.SiparisNo] = adet[o.SiparisAlID];
        return result;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static OrderFolderLegacyFileDto? Legacy(long? boyut, byte[]? bas, string adKoku)
    {
        if (boyut is not > 0) return null;
        var (uzanti, tip) = FileSignature.Detect(bas ?? Array.Empty<byte>());
        return new OrderFolderLegacyFileDto(adKoku + uzanti, tip, boyut.Value);
    }

    private async Task<LegacyBlobInfo?> GetLegacyInfoAsync(int siparisAlId)
    {
        // Blob'un tamamını değil yalnız boyutunu + ilk 8 baytını okur.
        var rows = await ctx.Database.SqlQuery<LegacyBlobInfo>($@"
            SELECT LENGTH(Ek)               AS EkBoyut,
                   SUBSTRING(Ek, 1, 8)         AS EkBas,
                   LENGTH(MuhasebeEk)       AS MuhasebeEkBoyut,
                   SUBSTRING(MuhasebeEk, 1, 8) AS MuhasebeEkBas
            FROM SiparisAlTablo WHERE SiparisAlID = {siparisAlId}")
            .ToListAsync();
        return rows.FirstOrDefault();
    }

    internal sealed class LegacyBlobInfo
    {
        public long?   EkBoyut         { get; set; }
        public byte[]? EkBas           { get; set; }
        public long?   MuhasebeEkBoyut { get; set; }
        public byte[]? MuhasebeEkBas   { get; set; }
    }
}
