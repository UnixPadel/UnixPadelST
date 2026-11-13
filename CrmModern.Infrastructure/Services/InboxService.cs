using CrmModern.Core.DTOs.Inbox;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.Inbox;
using CrmModern.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Bekleyen İşler özeti. Sayılar, Bekleyen İşler sayfasının kullandığı liste
/// servislerinin AYNISINDAN, aynı filtrelerle üretilir (frontend
/// <c>useWorkQueues.ts</c>) — panel, menü rozeti ve sayfa aynı sayıyı gösterir.
/// Her kaynak bağımsızdır: biri hata verirse yalnız o kuyruk <c>Error</c> döner.
/// DbContext thread-safe olmadığı için kaynaklar SIRALI çağrılır.
/// </summary>
internal sealed class InboxService(
    IQualityControlService qc,
    IAccountingService accounting,
    IFactoryService factory,
    ILogisticsService logistics,
    IPurchaseService purchase,
    IOrderService orders,
    IMemoryCache cache,
    ILogger<InboxService> logger) : IInboxService
{
    // Kısa TTL: menü rozeti + Ana Sayfa paneli aynı anda sorar; bir onaydan sonra
    // sayının en geç ~15 sn içinde düşmesi gerekir (KPI'ların 60 sn'si burada uzun).
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(15);

    public async Task<InboxSummaryDto> GetSummaryAsync(int userId, string? role, string? userName, bool superAdmin)
    {
        var cacheKey = $"inbox:{userId}:{role}:{userName}:{superAdmin}";
        if (cache.TryGetValue(cacheKey, out InboxSummaryDto? cached) && cached is not null)
            return cached;

        var ids = InboxQueues.For(role, userName, superAdmin).ToHashSet();
        var result = new Dictionary<string, InboxQueueSummaryDto>();

        void Put(string id, IEnumerable<DateTime?> since)
        {
            var (count, oldest) = InboxQueues.Summarize(since);
            result[id] = new InboxQueueSummaryDto(id, count, oldest);
        }

        async Task Load(string[] queueIds, Func<Task> load)
        {
            if (!queueIds.Any(ids.Contains)) return;
            try { await load(); }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Inbox kaynağı yüklenemedi: {Queues}", string.Join(",", queueIds));
                foreach (var id in queueIds.Where(ids.Contains))
                    result[id] = new InboxQueueSummaryDto(id, 0, null, Error: true);
            }
        }

        await Load([InboxQueues.Qc], async () =>
        {
            var rows = await qc.GetPendingAsync();
            Put(InboxQueues.Qc, rows.Where(r => r.Kontrol == "Kontrol").Select(r => (DateTime?)r.Tarih));
        });

        await Load([InboxQueues.Cari, InboxQueues.LojistikOnay, InboxQueues.Tamamlanma], async () =>
        {
            var rows = await accounting.GetAccountingOrdersAsync();
            Put(InboxQueues.Cari, rows.Where(o => o.SiparisMiTeklifMi == "Siparis").Select(o => (DateTime?)o.Tarih));
            Put(InboxQueues.LojistikOnay, rows.Where(o => o.SiparisMiTeklifMi == "Hazir" && o.LojistikOnay == "Bekliyor").Select(o => (DateTime?)o.Tarih));
            Put(InboxQueues.Tamamlanma, rows.Where(o => o.SiparisMiTeklifMi == "TamamlanmaBekliyor").Select(o => (DateTime?)o.Tarih));
        });

        await Load([InboxQueues.Planning, InboxQueues.Production], async () =>
        {
            var rows = await factory.GetProductionOrdersAsync(new OrderFilterDto(null, null, null, null, null, null, null, null));
            Put(InboxQueues.Planning, rows.Where(r => r.SiparisMiTeklifMi == "Planlama").Select(r => (DateTime?)(r.CariOnayTarih ?? r.Tarih)));
            Put(InboxQueues.Production, rows.Where(r => r.SiparisMiTeklifMi == "Uretim").Select(r => r.STarih));
        });

        await Load([InboxQueues.Shipment], async () =>
        {
            var rows = await logistics.GetReadyForShipmentAsync();
            Put(InboxQueues.Shipment, rows.Where(r => r.SiparisMiTeklifMi == "Hazir").Select(r => (DateTime?)(r.STarih ?? r.Tarih)));
        });

        await Load([InboxQueues.InTransit], async () =>
        {
            var rows = await logistics.GetHistoryAsync(null, null);
            // Sevkiyat kaydında bekleme tarihi yok (sayfada da yaş gösterilmez).
            Put(InboxQueues.InTransit, rows.Where(r => r.SiparisMiTeklifMi == "Lojistik").Select(_ => (DateTime?)null));
        });

        await Load([InboxQueues.FinalApproval], async () =>
        {
            var rows = await purchase.GetPendingFinalApprovalAsync();
            Put(InboxQueues.FinalApproval, rows.Select(r => (DateTime?)r.TalepTarihi));
        });

        await Load([InboxQueues.Payment], async () =>
        {
            var rows = await purchase.GetPendingPaymentAsync();
            Put(InboxQueues.Payment, rows.Select(r => (DateTime?)r.TalepTarihi));
        });

        await Load([InboxQueues.Rejected], async () =>
        {
            var rows = await orders.GetMyOrdersAsync(userId);
            Put(InboxQueues.Rejected, rows.Where(o => o.Kontrol == "Reddet" && !o.Silindi).Select(o => (DateTime?)o.Tarih));
        });

        var queues = InboxQueues.Order.Where(result.ContainsKey).Select(id => result[id]).ToList();
        var summary = new InboxSummaryDto(queues, queues.Where(q => !q.Error).Sum(q => q.Count));

        // Hatalı kaynak varsa önbelleğe alma — bir sonraki istek yeniden denesin.
        if (queues.All(q => !q.Error))
            cache.Set(cacheKey, summary, Ttl);
        return summary;
    }
}
