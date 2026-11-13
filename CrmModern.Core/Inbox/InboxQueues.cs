namespace CrmModern.Core.Inbox;

/// <summary>
/// E-10 / Bekleyen İşler — kullanıcıya düşen iş kuyrukları. Frontend
/// <c>hooks/useWorkQueues.ts → useQueueAccess</c> ile BİREBİR aynı kural:
/// menü görünürlüğü (<c>lib/navigation.ts</c>, elshan.rasulov + süper-admin
/// bypass'ı dahil) + salt-okunur Gözlemci'ye iş kuyruğu atanmaz.
/// Bir taraf değişirse diğeri de değişmeli; <c>InboxQueuesTests</c> matrisi korur.
/// </summary>
public static class InboxQueues
{
    public const string Qc            = "qc";
    public const string Cari          = "cari";
    public const string LojistikOnay  = "lojistikOnay";
    public const string Tamamlanma    = "tamamlanma";
    public const string Planning      = "planning";
    public const string Production    = "production";
    public const string Shipment      = "shipment";
    public const string InTransit     = "inTransit";
    public const string FinalApproval = "finalApproval";
    public const string Payment       = "payment";
    public const string Rejected      = "rejected";

    /// <summary>Sabit iş akışı sırası (Bekleyen İşler ve Ana Sayfa paneli aynı sırayı kullanır).</summary>
    public static readonly IReadOnlyList<string> Order =
    [
        Qc, Cari, LojistikOnay, Tamamlanma, Planning, Production,
        Shipment, InTransit, FinalApproval, Payment, Rejected,
    ];

    private const string ControlUser = "elshan.rasulov";
    private const string AccountingApprover = "burcu.karaman";

    /// <summary>Kullanıcının sahip olduğu kuyruklar, <see cref="Order"/> sırasıyla.</summary>
    public static IReadOnlyList<string> For(string? role, string? userName, bool superAdmin)
    {
        // Menü kuralı: elshan.rasulov ve süper-admin tüm menü öğelerini görür.
        bool bypass = userName == ControlUser || superAdmin;
        bool Can(string[] roles, params string[] userNames) =>
            bypass
            || (role is not null && roles.Contains(role))
            || (userName is not null && userNames.Contains(userName));

        bool observer = role == "Gozlemci";
        bool approver = Can([], AccountingApprover);   // burcu.karaman | elshan | süper-admin
        bool factory  = Can(["Yonetici", "Fabrika", "Gozlemci"]) && !observer;

        var has = new Dictionary<string, bool>
        {
            [Qc]            = Can([], ControlUser),
            [Cari]          = approver,
            [LojistikOnay]  = approver,
            [Tamamlanma]    = approver,
            [Planning]      = factory,
            [Production]    = factory,
            [Shipment]      = Can(["Yonetici", "Lojistik"]),
            [InTransit]     = Can(["Yonetici", "Lojistik", "Gozlemci"], ControlUser) && !observer,
            [FinalApproval] = Can(["Yonetici"], ControlUser),
            [Payment]       = Can(["Muhasebe"]),
            [Rejected]      = role == "Temsilci",
        };
        return Order.Where(id => has[id]).ToList();
    }

    /// <summary>Kuyruk özeti: kalem sayısı + en eski bekleme tarihi (null'lar atlanır).</summary>
    public static (int Count, DateTime? OldestSince) Summarize(IEnumerable<DateTime?> since)
    {
        int count = 0;
        DateTime? oldest = null;
        foreach (var d in since)
        {
            count++;
            if (d is { } v && (oldest is null || v < oldest)) oldest = v;
        }
        return (count, oldest);
    }
}
