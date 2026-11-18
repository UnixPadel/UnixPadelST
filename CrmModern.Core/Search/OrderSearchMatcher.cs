using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using CrmModern.Core.Entities;

namespace CrmModern.Core.Search;

/// <summary>Sipariş kaleminin aranabilir adları (hafif sorgu satırı).</summary>
public sealed record OrderSearchItemName(
    string  SiparisNo,
    string? Kategori,
    string? Bilesen,
    string? Serbest,
    string? Oznitelik);

/// <summary>Sorgunun bir kelimesi. Tutar aralığı [AmountMin, AmountMax) biçimindedir.</summary>
public sealed record OrderSearchToken(string Text, string Digits, decimal? AmountMin, decimal? AmountMax);

public sealed record OrderSearchMatch(int Score, IReadOnlyList<string> Fields);

/// <summary>Eşleşen alan kodları; ön yüzde search.fields.&lt;kod&gt; etiketine karşılık gelir.</summary>
public static class OrderSearchFields
{
    public const string No = "no";
    public const string Musteri = "musteri";
    public const string Ulke = "ulke";
    public const string Telefon = "telefon";
    public const string Eposta = "eposta";
    public const string Vergi = "vergi";
    public const string Adres = "adres";
    public const string TeslimAlan = "teslimAlan";
    public const string Temsilci = "temsilci";
    public const string Sirket = "sirket";
    public const string Urun = "urun";
    public const string Durum = "durum";
    public const string Para = "para";
    public const string Tarih = "tarih";
    public const string Tutar = "tutar";
}

/// <summary>
/// Sipariş aramasının kuralları (veritabanından bağımsız). Her kelime en az bir alanda
/// bulunmalıdır. Türkçe harfler katlanır (İ/ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c), telefonlar
/// yalnız rakamla karşılaştırılır, tutarlar TR ve EN yazımıyla okunur.
/// Para görmeyen kullanıcıda tutar alanları hiç denenmez; fiyat deneme yoluyla öğrenilemez.
/// </summary>
public static partial class OrderSearchMatcher
{
    public const int MinQueryLength = 2;
    private const int MaxQueryLength = 200;
    private const int MaxTokens = 8;
    private const int MinPhoneDigits = 4;
    private const int MinWordPrefix = 3;

    private static readonly char[] EdgePunctuation = [',', ';', ':', '(', ')', '[', ']', '{', '}', '"', '\'', '.'];

    private static readonly Dictionary<string, string> StageWords = new(StringComparer.Ordinal)
    {
        ["Teklif"]             = "teklif quote",
        ["Siparis"]            = "siparis order",
        ["Planlama"]           = "planlama planning",
        ["Uretim"]             = "uretim production",
        ["Hazir"]              = "hazir ready",
        ["Lojistik"]           = "lojistik logistics sevkiyat shipment",
        ["TamamlanmaBekliyor"] = "tamamlanma bekliyor kapanis closing",
        ["Tamamlandi"]         = "tamamlandi completed",
        ["Iptal"]              = "iptal cancelled",
    };

    private static readonly Dictionary<string, string> ControlWords = new(StringComparer.Ordinal)
    {
        ["Kontrol"] = "kontrol kontrolde review",
        ["Onay"]    = "onay onaylandi approved",
        ["Reddet"]  = "reddet reddedildi rejected",
    };

    private static readonly Dictionary<string, string> CurrencyWords = new(StringComparer.Ordinal)
    {
        ["Euro"]    = "euro eur",
        ["Dolar"]   = "dolar dollar usd",
        ["TL"]      = "tl try lira",
        ["Sterlin"] = "sterlin sterling gbp",
    };

    [GeneratedRegex(@"^[€$£₺]?(?<n>\d[\d.,]*)(?:[€$£₺]|eur|euro|usd|tl|try|gbp)?$")]
    private static partial Regex AmountShape();

    [GeneratedRegex(@"^\d{1,3}(?:\.\d{3})+$|^\d{1,3}(?:,\d{3})+$")]
    private static partial Regex GroupedInteger();

    [GeneratedRegex(@"^(?<i>\d{1,3}(?:\.\d{3})+|\d+),(?<d>\d{1,2})$")]
    private static partial Regex TurkishDecimal();

    [GeneratedRegex(@"^(?<i>\d{1,3}(?:,\d{3})+|\d+)\.(?<d>\d{1,2})$")]
    private static partial Regex EnglishDecimal();

    [GeneratedRegex(@"^[+\d()\-./]+$")]
    private static partial Regex PhoneShape();

    [GeneratedRegex(@"^\d{1,4}[./-]\d{1,2}(?:[./-]\d{1,4})?$")]
    private static partial Regex DateShape();

    /// <summary>Küçük harfe çevirir ve Türkçe/aksanlı harfleri tabana indirir.</summary>
    public static string Fold(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        var sb = new StringBuilder(value.Length);
        foreach (var c in value)
        {
            switch (c)
            {
                case 'İ' or 'I' or 'ı' or 'i' or 'Î' or 'î' or 'Í' or 'í' or 'Ì' or 'ì' or 'Ï' or 'ï': sb.Append('i'); break;
                case 'Ş' or 'ş': sb.Append('s'); break;
                case 'Ğ' or 'ğ': sb.Append('g'); break;
                case 'Ü' or 'ü' or 'Û' or 'û' or 'Ú' or 'ú' or 'Ù' or 'ù': sb.Append('u'); break;
                case 'Ö' or 'ö' or 'Ô' or 'ô' or 'Ó' or 'ó' or 'Ò' or 'ò' or 'Õ' or 'õ': sb.Append('o'); break;
                case 'Ç' or 'ç': sb.Append('c'); break;
                case 'Â' or 'â' or 'Á' or 'á' or 'À' or 'à' or 'Ä' or 'ä' or 'Ã' or 'ã': sb.Append('a'); break;
                case 'Ê' or 'ê' or 'É' or 'é' or 'È' or 'è' or 'Ë' or 'ë': sb.Append('e'); break;
                case 'Ñ' or 'ñ': sb.Append('n'); break;
                case '̇': break; // "İ" küçültülünce kalan birleşik nokta
                default: sb.Append(char.ToLowerInvariant(c)); break;
            }
        }
        return sb.ToString();
    }

    public static string DigitsOnly(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        var sb = new StringBuilder(value.Length);
        foreach (var c in value)
            if (c is >= '0' and <= '9') sb.Append(c);
        return sb.ToString();
    }

    /// <summary>Sorguyu kelimelere böler. Tek harfli kelimeler her kayda uyacağı için atılır.</summary>
    public static IReadOnlyList<OrderSearchToken> Parse(string? query)
    {
        var trimmed = (query ?? string.Empty).Trim();
        if (trimmed.Length < MinQueryLength) return [];
        if (trimmed.Length > MaxQueryLength) trimmed = trimmed[..MaxQueryLength];

        var tokens = new List<OrderSearchToken>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var part in trimmed.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
        {
            var raw = part.Trim(EdgePunctuation);
            var text = Fold(raw);
            if (text.Length < MinQueryLength || !seen.Add(text)) continue;

            var digits = PhoneShape().IsMatch(raw) ? DigitsOnly(raw) : string.Empty;
            var (min, max) = ParseAmount(text);
            tokens.Add(new OrderSearchToken(text, digits, min, max));
            if (tokens.Count == MaxTokens) break;
        }
        return tokens;
    }

    /// <summary>
    /// "12500", "12.500", "12,500" → [12500, 12501) · "12.500,50", "12,500.50" → [12500.50, 12500.51).
    /// Tutar olamayan yazımda ve sıfırda null döner.
    /// </summary>
    public static (decimal? Min, decimal? Max) ParseAmount(string? token)
    {
        var shape = AmountShape().Match(Fold(token));
        if (!shape.Success) return (null, null);
        var number = shape.Groups["n"].Value;

        string integerPart;
        string decimalPart = string.Empty;
        var tr = TurkishDecimal().Match(number);
        var en = EnglishDecimal().Match(number);
        if (number.All(char.IsDigit) || GroupedInteger().IsMatch(number))
            integerPart = number;
        else if (tr.Success) { integerPart = tr.Groups["i"].Value; decimalPart = tr.Groups["d"].Value; }
        else if (en.Success) { integerPart = en.Groups["i"].Value; decimalPart = en.Groups["d"].Value; }
        else return (null, null);

        var canonical = DigitsOnly(integerPart) + (decimalPart.Length > 0 ? "." + decimalPart : string.Empty);
        if (!decimal.TryParse(canonical, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value) || value <= 0m)
            return (null, null);

        return (value, value + (decimalPart.Length > 0 ? 0.01m : 1m));
    }

    /// <summary>Kayıt tüm kelimelere uyuyorsa puan ve eşleşen alanları döner; uymuyorsa null.</summary>
    public static OrderSearchMatch? Match(
        Order order,
        string? temsilci,
        IEnumerable<string>? urunler,
        IReadOnlyList<OrderSearchToken> tokens,
        bool canSeeMoney)
    {
        if (tokens.Count == 0) return new OrderSearchMatch(0, []);

        var fields = BuildFields(order, temsilci, urunler);
        var codes = new List<string>(tokens.Count);
        var total = 0;

        foreach (var token in tokens)
        {
            var bestScore = 0;
            string? bestCode = null;

            foreach (var field in fields)
            {
                var score = ScoreField(field, token);
                if (score > bestScore) { bestScore = score; bestCode = field.Code; }
            }
            if (canSeeMoney && MatchesAmount(order, token) && bestScore < AmountScore)
            {
                bestScore = AmountScore;
                bestCode = OrderSearchFields.Tutar;
            }

            if (bestCode is null) return null;
            total += bestScore;
            if (!codes.Contains(bestCode)) codes.Add(bestCode);
        }
        return new OrderSearchMatch(total, codes);
    }

    private const int AmountScore = 80;

    private enum FieldKind { Number, Name, Text, Words, Phone, Date }

    private readonly record struct SearchField(string Code, string Value, FieldKind Kind);

    private static List<SearchField> BuildFields(Order o, string? temsilci, IEnumerable<string>? urunler)
    {
        var list = new List<SearchField>(24);

        void Add(string code, string? value, FieldKind kind = FieldKind.Text)
        {
            if (string.IsNullOrWhiteSpace(value)) return;
            var normalized = kind == FieldKind.Phone ? DigitsOnly(value) : Fold(value);
            if (normalized.Length > 0) list.Add(new SearchField(code, normalized, kind));
        }

        Add(OrderSearchFields.No, o.SiparisNo, FieldKind.Number);
        Add(OrderSearchFields.No, o.TeklifNo, FieldKind.Number);
        Add(OrderSearchFields.Musteri, o.MusteriAd, FieldKind.Name);
        Add(OrderSearchFields.Ulke, o.MUlke);
        Add(OrderSearchFields.Ulke, o.TUlke);
        Add(OrderSearchFields.Telefon, o.MTelefon, FieldKind.Phone);
        Add(OrderSearchFields.Telefon, o.TTelefon, FieldKind.Phone);
        Add(OrderSearchFields.Telefon, o.TAltTelefon, FieldKind.Phone);
        Add(OrderSearchFields.Eposta, o.MMail);
        Add(OrderSearchFields.Eposta, o.TE_Mail);
        Add(OrderSearchFields.Vergi, o.MVATNumarasi);
        Add(OrderSearchFields.Vergi, o.TVATNumarasi);
        Add(OrderSearchFields.Adres, o.MAdres);
        Add(OrderSearchFields.Adres, o.TAdres);
        Add(OrderSearchFields.Adres, o.MZipKod);
        Add(OrderSearchFields.Adres, o.TZipKod);
        Add(OrderSearchFields.TeslimAlan, o.TTeslimAlanAdi);
        Add(OrderSearchFields.TeslimAlan, o.TIlgiliKisi);
        Add(OrderSearchFields.Temsilci, temsilci);
        Add(OrderSearchFields.Sirket, o.Sirket);

        if (urunler is not null)
            foreach (var urun in urunler) Add(OrderSearchFields.Urun, urun);

        var words = new StringBuilder(o.SiparisMiTeklifMi == "Teklif" ? "teklif quote" : "siparis order");
        if (StageWords.TryGetValue(o.SiparisMiTeklifMi, out var stage)) words.Append(' ').Append(stage);
        if (ControlWords.TryGetValue(o.Kontrol, out var control)) words.Append(' ').Append(control);
        if (o.Silindi) words.Append(" silindi deleted");
        list.Add(new SearchField(OrderSearchFields.Durum, words.ToString(), FieldKind.Words));

        if (CurrencyWords.TryGetValue(o.ParaTipi, out var currency))
            list.Add(new SearchField(OrderSearchFields.Para, currency, FieldKind.Words));

        list.Add(new SearchField(OrderSearchFields.Tarih,
            o.Tarih.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture), FieldKind.Date));

        return list;
    }

    private static int ScoreField(SearchField field, OrderSearchToken token)
    {
        var value = field.Value;
        var text = token.Text;

        switch (field.Kind)
        {
            case FieldKind.Number:
                if (value == text) return 1000;
                if (value.StartsWith(text, StringComparison.Ordinal)) return 500;
                return value.Contains(text, StringComparison.Ordinal) ? 300 : 0;

            case FieldKind.Name:
                if (value == text) return 400;
                if (value.StartsWith(text, StringComparison.Ordinal)) return 250;
                if (HasWordStart(value, text)) return 180;
                return value.Contains(text, StringComparison.Ordinal) ? 100 : 0;

            case FieldKind.Text:
                if (HasWordStart(value, text)) return 70;
                return value.Contains(text, StringComparison.Ordinal) ? 50 : 0;

            case FieldKind.Words:
                // Kısa kelime yalnız tam eşleşir ("tl"); uzunu kelime başından eşleşir ("onayl").
                return text.Length >= MinWordPrefix
                    ? (HasWordStart(value, text) ? 40 : 0)
                    : (HasWholeWord(value, text) ? 40 : 0);

            case FieldKind.Phone:
                return token.Digits.Length >= MinPhoneDigits && value.Contains(token.Digits, StringComparison.Ordinal) ? 90 : 0;

            case FieldKind.Date:
                if (!DateShape().IsMatch(text)) return 0;
                return value.Contains(text.Replace('/', '.').Replace('-', '.'), StringComparison.Ordinal) ? 60 : 0;

            default:
                return 0;
        }
    }

    private static bool MatchesAmount(Order o, OrderSearchToken token)
    {
        if (token.AmountMin is not decimal min || token.AmountMax is not decimal max) return false;
        bool InRange(decimal? v) => v is decimal d && d >= min && d < max;
        return InRange(o.ToplamFiyat) || InRange(o.BrutToplamFiyat) || InRange(o.OdenenMiktar);
    }

    private static bool HasWordStart(string value, string text)
    {
        var index = value.IndexOf(text, StringComparison.Ordinal);
        while (index >= 0)
        {
            if (index == 0 || !char.IsLetterOrDigit(value[index - 1])) return true;
            index = value.IndexOf(text, index + 1, StringComparison.Ordinal);
        }
        return false;
    }

    private static bool HasWholeWord(string value, string text) =>
        value.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains(text, StringComparer.Ordinal);
}
