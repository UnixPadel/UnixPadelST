using System.Globalization;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Excel ve proforma çıktılarının dil yardımcısı. <c>lang</c> arayüz dilidir ("tr" | "en").
/// Veritabanındaki Türkçe durum değerleri değişmez; yalnız dosyadaki adı çevrilir.
/// </summary>
internal sealed class ExportText(string? lang)
{
    private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");
    private static readonly CultureInfo British = CultureInfo.GetCultureInfo("en-GB");

    private static readonly Dictionary<string, (string Tr, string En)> Values = new(StringComparer.Ordinal)
    {
        ["Teklif"]              = ("Teklif", "Quote"),
        ["Siparis"]             = ("Sipariş", "Order"),
        ["Planlama"]            = ("Planlama", "Planning"),
        ["Uretim"]              = ("Üretim", "Production"),
        ["Hazir"]               = ("Hazır", "Ready"),
        ["Lojistik"]            = ("Lojistik", "Logistics"),
        ["TamamlanmaBekliyor"]  = ("Kapanış bekliyor", "Waiting to close"),
        ["Tamamlandi"]          = ("Tamamlandı", "Completed"),
        ["Iptal"]               = ("İptal edildi", "Cancelled"),
        ["Kontrol"]             = ("Kontrolde", "In review"),
        ["Onay"]                = ("Onaylandı", "Approved"),
        ["Reddet"]              = ("Reddedildi", "Rejected"),
        ["Ödendi"]              = ("Ödendi", "Paid"),
        ["Beklemede"]           = ("Beklemede", "Pending"),
        ["Bekliyor"]            = ("Bekliyor", "Pending"),
        ["Onay Bekliyor"]       = ("Onay bekliyor", "Waiting for approval"),
        ["Ön Onaylandı"]        = ("Ön onaylandı", "Pre-approved"),
        ["Muhasebe Tamamlandı"] = ("Muhasebe tamamladı", "Accounting done"),
        ["Onaylandı"]           = ("Onaylandı", "Approved"),
        ["Reddedildi"]          = ("Reddedildi", "Rejected"),
        ["Euro"]                = ("Euro", "Euro"),
        ["Dolar"]               = ("Dolar", "Dollar"),
        ["TL"]                  = ("TL", "TRY"),
        ["Sterlin"]             = ("Sterlin", "Sterling"),
    };

    public bool En { get; } = lang?.StartsWith("en", StringComparison.OrdinalIgnoreCase) == true;

    public CultureInfo Culture => En ? British : Turkish;

    public string T(string tr, string en) => En ? en : tr;

    public string Date(DateTime value) =>
        value.ToString(En ? "dd/MM/yyyy" : "dd.MM.yyyy", CultureInfo.InvariantCulture);

    public string Percent(object value) => En ? $"{value}%" : $"%{value}";

    public string Value(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return string.Empty;
        return Values.TryGetValue(raw, out var label) ? (En ? label.En : label.Tr) : raw;
    }
}
