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
        o => !o.Silindi && o.Kontrol == "Reddet" && o.SiparisMiTeklifMi != "Tamamlandi" && o.SiparisMiTeklifMi != "Iptal",
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

    /// <summary>
    /// 40+ ergonomi (etki önizlemesi) — mevcut adım olağan yoldan (onay/ilerletme)
    /// tamamlanınca siparişin bekleyeceği adım. Onay pencereleri "Sonraki adım: …"
    /// olarak gösterir. Red yolu (Kontrol → Reddet → temsilci düzeltmesi) ayrıca
    /// TemsilciDuzeltme ile bilinir; burada yalnız ileri yön vardır.
    /// Kapanış sonrası (Tamamlandı) ve terminal durumlarda null.
    /// </summary>
    public static WorkflowStep? NextStep(Order o)
    {
        var current = CurrentStep(o);
        if (current is null) return null;
        if (current == TemsilciDuzeltme) return KontrolOnayi;
        // Kontrol onayı: teklif → temsilcinin siparişe çevirmesi; sipariş → muhasebe cari onayı.
        if (current == KontrolOnayi) return o.SiparisMiTeklifMi == "Teklif" ? SiparisCevirme : CariOnay;
        // Siparişe çevirme Kontrol'ü sıfırlamaz (OrderService.ConvertToOrderAsync) → doğrudan cari onay.
        if (current == SiparisCevirme) return CariOnay;
        if (current == CariOnay) return UretimeAlma;
        if (current == UretimeAlma) return Uretim;
        // "Hazır" olunca LojistikOnay='Bekliyor' yazılır (OrderRepository.MarkAsReadyAsync).
        if (current == Uretim) return LojistikOnay;
        if (current == LojistikOnay) return Sevkiyat;
        if (current == Sevkiyat) return Teslimat;
        if (current == Teslimat) return Kapanis;
        return null; // Kapanis → Tamamlandı (terminal)
    }

    /// <summary>
    /// Bir siparişin toplam ciroya ve dashboard para metriklerine eklenme kriteri:
    /// 1) Silinmemiş ve iptal edilmemiş olmalı,
    /// 2) Teklif olmamalı,
    /// 3) Peşinatı girilmiş olmalı (OdenenMiktar > 0) VEYA Kalite Kontrol onayından geçip
    ///    Cari Onay tamamlanarak Planlama/üretim/tamamlanma aşamasına geçmiş olmalı.
    /// (Kalite kontrolde bekleyen veya QC'den yeni geçip peşinatı ödenmemiş ham siparişler ciroya girmez).
    /// </summary>
    public static readonly Expression<Func<Order, bool>> CiroPredicate = o =>
        !o.Silindi
        && o.SiparisMiTeklifMi != "Teklif"
        && o.SiparisMiTeklifMi != "Iptal"
        && ((o.OdenenMiktar != null && o.OdenenMiktar > 0m)
            || (o.SiparisMiTeklifMi != "Siparis" && o.Kontrol == "Onay"));

    private static Func<Order, bool>? _ciroCompiled;
    public static bool IsCiroEligible(Order o) => (_ciroCompiled ??= CiroPredicate.Compile())(o);
}
