using System.Linq.Expressions;
using CrmModern.Core.Entities;

namespace CrmModern.Core.Workflow;

/// <summary>
/// Sipariş iş akışının tek tanımı (iç denetim). Kuyruklar yalnız üç kolonla
/// belirlenir: SiparisMiTeklifMi (aşama), Kontrol ve LojistikOnay. Peşinat bir
/// kapı değildir; "1./2./3. peşinat" Burcu'nun cari onay / lojistik onay /
/// kapanış sırasında girdiği tahsilatın etiketidir.
/// </summary>
/// <param name="Code">Frontend i18n anahtarı (workflow.steps.&lt;code&gt;).</param>
/// <param name="Department">Adımın sahibi: Satis | Kontrol | Muhasebe | Fabrika | Lojistik.</param>
/// <param name="Predicate">EF'e çevrilebilir koşul; adımlar birbirini dışlar.</param>
/// <param name="SinceApproval">
/// Bekleme başlangıcı için SiparisOnaylari.OnayDurumu (ör. "MuhasebeOnaylandi");
/// bulunamazsa sıradaki kaynağa düşülür.
/// </param>
/// <param name="SinceStageDate">Aşama tarihi (STarih) kullanılsın mı; son çare her zaman Tarih.</param>
public sealed record WorkflowStep(
    string Code,
    string Department,
    Expression<Func<Order, bool>> Predicate,
    string? SinceApproval = null,
    bool SinceStageDate = false)
{
    private Func<Order, bool>? _compiled;
    public bool Matches(Order o) => (_compiled ??= Predicate.Compile())(o);
}

/// <summary>Bir ekranın "önceki aşamada bekleyenler" tanımı.</summary>
public sealed record WorkflowScreen(WorkflowStep Upstream, Expression<Func<Order, bool>>? Narrow = null);

public static class OrderWorkflow
{
    public static readonly WorkflowStep TemsilciDuzeltme = new(
        "temsilciDuzeltme", "Satis",
        o => !o.Silindi && o.Kontrol == "Reddet",
        SinceApproval: "Reddedildi");

    public static readonly WorkflowStep KontrolOnayi = new(
        "kontrolOnayi", "Kontrol",
        o => !o.Silindi && o.Kontrol == "Kontrol"
             && (o.SiparisMiTeklifMi == "Teklif" || o.SiparisMiTeklifMi == "Siparis"));

    // Kontrol onaylı teklif, temsilcinin "Siparişe Çevir"ini bekler. Hiçbir ekranda
    // "önceki aşama" olarak gösterilmez (kullanıcı kararı); yalnız sipariş detayında.
    public static readonly WorkflowStep SiparisCevirme = new(
        "siparisCevirme", "Satis",
        o => !o.Silindi && o.Kontrol == "Onay" && o.SiparisMiTeklifMi == "Teklif",
        SinceApproval: "Onaylandi");

    public static readonly WorkflowStep CariOnay = new(
        "cariOnay", "Muhasebe",
        o => o.Kontrol == "Onay" && o.SiparisMiTeklifMi == "Siparis",
        SinceApproval: "Onaylandi");

    public static readonly WorkflowStep UretimeAlma = new(
        "uretimeAlma", "Fabrika",
        o => o.SiparisMiTeklifMi == "Planlama",
        SinceApproval: "MuhasebeOnaylandi");

    public static readonly WorkflowStep Uretim = new(
        "uretim", "Fabrika",
        o => o.SiparisMiTeklifMi == "Uretim",
        SinceStageDate: true);

    public static readonly WorkflowStep LojistikOnay = new(
        "lojistikOnay", "Muhasebe",
        o => o.SiparisMiTeklifMi == "Hazir" && o.LojistikOnay == "Bekliyor",
        SinceStageDate: true);

    public static readonly WorkflowStep Sevkiyat = new(
        "sevkiyat", "Lojistik",
        o => o.SiparisMiTeklifMi == "Hazir" && o.Kontrol == "Onay"
             && (o.LojistikOnay == null || o.LojistikOnay == "Onay"),
        SinceApproval: "LojistikOnaylandi", SinceStageDate: true);

    public static readonly WorkflowStep Teslimat = new(
        "teslimat", "Lojistik",
        o => o.SiparisMiTeklifMi == "Lojistik",
        SinceStageDate: true);

    public static readonly WorkflowStep Kapanis = new(
        "kapanis", "Muhasebe",
        o => o.SiparisMiTeklifMi == "TamamlanmaBekliyor",
        SinceStageDate: true);

    /// <summary>Akış sırası; Tamamlandi / Iptal terminaldir (adım yok).</summary>
    public static readonly IReadOnlyList<WorkflowStep> Steps =
    [
        TemsilciDuzeltme, KontrolOnayi, SiparisCevirme, CariOnay,
        UretimeAlma, Uretim, LojistikOnay, Sevkiyat, Teslimat, Kapanis,
    ];

    /// <summary>
    /// Ekran → yalnız bir önceki adım. Önceki adımı kendi departmanına ait olan
    /// ekranlar (Lojistik Geçmiş vb.) burada yoktur.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, WorkflowScreen> Screens =
        new Dictionary<string, WorkflowScreen>(StringComparer.OrdinalIgnoreCase)
        {
            ["qc"]                    = new(TemsilciDuzeltme),
            ["accounting-cari"]       = new(KontrolOnayi, o => o.SiparisMiTeklifMi == "Siparis"),
            ["factory"]               = new(CariOnay),
            ["logistics-offers"]      = new(UretimeAlma),
            ["accounting-lojistik"]   = new(Uretim),
            ["logistics-ready"]       = new(LojistikOnay),
            ["accounting-tamamlanma"] = new(Teslimat),
            ["final-approval"]        = new(Kapanis),
        };

    /// <summary>Siparişin şu an beklediği adım; terminal / silinmiş ise null.</summary>
    public static WorkflowStep? CurrentStep(Order o) => Steps.FirstOrDefault(s => s.Matches(o));
}
