namespace CrmModern.Core.Proforma;

/// <summary>
/// Round-8 §4 — DetayTablo standart şart KODLARI ve dil-duyarlı çözümleme.
///
/// Yeni siparişler standart şartları "@@KOD" biçiminde saklar (yapılandırılmış
/// kod). Proforma ve ekranlar bu kodu hedef dile çevirir; böylece aynı sipariş
/// hem TR hem EN proforma üretebilir. Kullanıcının elle yazdığı serbest metin ve
/// eski (legacy) Türkçe satırlar olduğu gibi geçer.
///
/// Frontend karşılığı: <c>CrmModern.Web/src/lib/clauses.ts</c> — iki taraf AYNI
/// metinleri üretmelidir.
/// </summary>
public static class ClauseText
{
    public const string Prefix = "@@";

    // Round-9 §20 — Eski (legacy) TR standart metinleri → kod eşlemesi.
    // Frontend `clauses.ts` LEGACY_TR ile BİREBİR aynı; böylece kod öncesi
    // kaydedilmiş Türkçe literal şartlar da hedef dile çevrilir (örn. İngilizce
    // proforma'da İngilizce çıkar). Yeni siparişler zaten "@@KOD" saklar.
    private static readonly Dictionary<string, string> LegacyTr = new(StringComparer.Ordinal)
    {
        ["Fiyatlar 2 hafta geçerlidir."]                                      = "@@FIYAT",
        ["Fiyatlara KDV dahil değildir."]                                     = "@@KDV",
        ["Fiyatlara nakliye dahil değildir."]                                 = "@@KARGO",
        ["Fiyatlara montaj dahil değildir."]                                  = "@@MONTAJ",
        ["Bu belgedeki fiyat ve bilgiler üzerindeki tüm haklar saklıdır."]    = "@@HAKLAR",
    };

    /// <summary>
    /// Tek satırı koda normalleştirir (legacy TR / "Teslimat Şekli:" /
    /// "Ödeme Şekli:" → kod); zaten kod ya da serbest metin ise aynen döner.
    /// Frontend `clauses.ts` normalizeToCode ile aynı kuralları izler.
    /// </summary>
    public static string NormalizeToCode(string line)
    {
        if (string.IsNullOrWhiteSpace(line)) return line;
        var s = line.Trim();
        if (s.StartsWith(Prefix, StringComparison.Ordinal)) return s;
        if (LegacyTr.TryGetValue(s, out var code)) return code;

        if (s.StartsWith("Teslimat Şekli:", StringComparison.Ordinal))
            return "@@TESLIMAT:" + s["Teslimat Şekli:".Length..].Trim();

        if (s.StartsWith("Ödeme Şekli:", StringComparison.Ordinal))
        {
            var rest = s["Ödeme Şekli:".Length..].Trim();
            if (rest.Contains("Vadeli", StringComparison.OrdinalIgnoreCase))
            {
                var m = System.Text.RegularExpressions.Regex.Match(rest, @"%?\s*(\d+)");
                return m.Success ? $"@@ODEME:Vadeli:{m.Groups[1].Value}" : "@@ODEME:Vadeli";
            }
            return "@@ODEME:Pesin";
        }

        return line; // gerçek serbest metin
    }

    /// <summary>Bir detay satırını hedef dile çevirir. Kod değilse aynen döner.</summary>
    public static string Resolve(string line, string lang)
    {
        if (string.IsNullOrWhiteSpace(line)) return line;
        // Round-9 §20 — önce legacy TR literal'i koda çevir, sonra dile çöz.
        var s = NormalizeToCode(line).Trim();
        if (!s.StartsWith(Prefix, StringComparison.Ordinal)) return line; // gerçek serbest metin

        bool en = string.Equals(lang, "en", StringComparison.OrdinalIgnoreCase);

        if (s.StartsWith("@@TESLIMAT:", StringComparison.Ordinal))
        {
            var v = s["@@TESLIMAT:".Length..].Trim();
            return en ? $"Delivery Term: {v}" : $"Teslimat Şekli: {v}";
        }

        if (s.StartsWith("@@ODEME:", StringComparison.Ordinal))
        {
            var rest = s["@@ODEME:".Length..].Trim();
            if (rest.StartsWith("Pesin", StringComparison.OrdinalIgnoreCase))
                return en ? "Payment Method: Upfront" : "Ödeme Şekli: Peşin";
            var parts = rest.Split(':', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length >= 2 && int.TryParse(parts[1], out var p))
                return en ? $"Payment Method: Installments — {p}% upfront"
                          : $"Ödeme Şekli: Vadeli — %{p} peşin";
            return en ? "Payment Method: Installments" : "Ödeme Şekli: Vadeli";
        }

        return s switch
        {
            "@@FIYAT"  => en ? "Prices are valid for 2 weeks." : "Fiyatlar 2 hafta geçerlidir.",
            "@@KDV"    => en ? "VAT is not included in the prices." : "Fiyatlara KDV dahil değildir.",
            "@@KARGO"  => en ? "Shipping is not included in the prices." : "Fiyatlara nakliye dahil değildir.",
            "@@MONTAJ" => en ? "Assembly is not included in the prices." : "Fiyatlara montaj dahil değildir.",
            "@@HAKLAR" => en
                ? "All rights to the prices and information in this document are reserved."
                : "Bu belgedeki fiyat ve bilgiler üzerindeki tüm haklar saklıdır.",
            _ => line,
        };
    }
}
