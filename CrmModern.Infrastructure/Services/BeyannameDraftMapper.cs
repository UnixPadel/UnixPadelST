using System.Globalization;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CrmModern.Core.DTOs.WarehouseStock;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// AI modelinden (Claude veya Gemini) dönen JSON verisini ortak <see cref="BeyannameDraftDto"/> yapısına dönüştürür.
/// </summary>
internal static class BeyannameDraftMapper
{
    public static BeyannameDraftDto Map(JsonNode docNode, string rawJson)
    {
        var beyannameNo = docNode["beyanname_no"]?.GetValue<string>()?.Trim();
        DateTime? tescilTarihi = null;
        var tescilStr = docNode["tescil_tarihi"]?.GetValue<string>()?.Trim();
        if (!string.IsNullOrWhiteSpace(tescilStr) && DateTime.TryParse(tescilStr, out var parsedDate))
            tescilTarihi = parsedDate;

        var rejim = docNode["rejim_kodu"]?.GetValue<string>()?.Trim();
        var gumrukIdaresi = docNode["gumruk_idaresi"]?.GetValue<string>()?.Trim();
        var gonderici = docNode["gonderici"]?.GetValue<string>()?.Trim();
        var alici = docNode["alici"]?.GetValue<string>()?.Trim();
        var doviz = docNode["doviz"]?.GetValue<string>()?.Trim();
        decimal? faturaTutari = TryGetDecimal(docNode["fatura_tutari"]);
        decimal? kur = TryGetDecimal(docNode["kur"]);
        int? kalemSayisi = TryGetInt(docNode["kalem_sayisi"]);

        var kalemlerList = new List<DraftItemDto>();
        var kalemlerArray = docNode["kalemler"]?.AsArray();
        if (kalemlerArray != null)
        {
            int index = 1;
            foreach (var k in kalemlerArray)
            {
                var malAdi = k?["mal_adi"]?.GetValue<string>()?.Trim() ?? $"Kalem {index}";
                var ticariTanim = k?["ticari_tanim"]?.GetValue<string>()?.Trim();
                var miktar = TryGetDecimal(k?["miktar"]) ?? 0m;
                var birim = k?["birim"]?.GetValue<string>()?.Trim()?.ToUpperInvariant() ?? "ADET";
                var kapAdedi = TryGetDecimal(k?["kap_adedi"]);
                var kapCinsi = k?["kap_cinsi"]?.GetValue<string>()?.Trim()?.ToUpperInvariant();
                var gtip = k?["gtip"]?.GetValue<string>()?.Trim();
                var mense = k?["mense_ulke"]?.GetValue<string>()?.Trim();
                var brutKg = TryGetDecimal(k?["brut_kg"]);
                var netKg = TryGetDecimal(k?["net_kg"]);
                var kalemNo = TryGetInt(k?["kalem_no"]) ?? index;
                var kalemFiyati = TryGetDecimal(k?["kalem_fiyati"]);

                var belirsiz = new List<string>();
                if (miktar <= 0) belirsiz.Add("miktar");
                if (string.IsNullOrWhiteSpace(birim)) belirsiz.Add("birim");
                if (string.IsNullOrWhiteSpace(malAdi)) belirsiz.Add("malAdi");

                kalemlerList.Add(new DraftItemDto(
                    KalemNo: kalemNo,
                    MalAdi: malAdi,
                    TicariTanim: ticariTanim,
                    Miktar: miktar,
                    Birim: birim,
                    KapAdedi: kapAdedi,
                    KapCinsi: kapCinsi,
                    Gtip: gtip,
                    MenseUlke: mense,
                    BrutKg: brutKg,
                    NetKg: netKg,
                    KalemFiyati: kalemFiyati,
                    BelirsizAlanlar: belirsiz));

                index++;
            }
        }

        // Uyarılar
        var uyarilar = new List<DraftWarningDto>();
        var docBelirsiz = new List<string>();

        if (string.IsNullOrWhiteSpace(beyannameNo))
        {
            docBelirsiz.Add("beyannameNo");
        }
        else
        {
            if (!Regex.IsMatch(beyannameNo, @"^\d{8}AN\d{6}$", RegexOptions.IgnoreCase))
            {
                uyarilar.Add(new DraftWarningDto(
                    "notAnDeclaration",
                    $"Beyanname numarası ({beyannameNo}) standart AN antrepo biçiminde değil. Kontrol edip devam edebilirsiniz.",
                    new { no = beyannameNo }));
            }
        }

        if (kalemSayisi.HasValue && kalemSayisi.Value > 0 && kalemSayisi.Value != kalemlerList.Count)
        {
            uyarilar.Add(new DraftWarningDto(
                "declarationItemCountMismatch",
                $"Beyannamede {kalemSayisi.Value} kalem belirtilmiş, ancak {kalemlerList.Count} kalem okundu.",
                new { declared = kalemSayisi.Value, read = kalemlerList.Count }));
        }

        if (faturaTutari.HasValue && faturaTutari.Value > 0)
        {
            var sumKalem = kalemlerList.Sum(k => k.KalemFiyati ?? 0m);
            if (sumKalem > 0 && Math.Abs(sumKalem - faturaTutari.Value) > (faturaTutari.Value * 0.02m))
            {
                uyarilar.Add(new DraftWarningDto(
                    "invoiceAmountMismatch",
                    $"Kalem fiyatları toplamı ({sumKalem:N2}) beyanname fatura bedelinden ({faturaTutari.Value:N2}) farklı.",
                    new { sum = sumKalem, invoice = faturaTutari.Value }));
            }
        }

        var onerilenKonum = "Antrepo";
        if (rejim != null && (rejim.Contains("AN", StringComparison.OrdinalIgnoreCase) || rejim.StartsWith("71", StringComparison.OrdinalIgnoreCase)))
            onerilenKonum = "Antrepo";
        else if (rejim != null && rejim.StartsWith("40", StringComparison.OrdinalIgnoreCase))
            onerilenKonum = "Depo";

        return new BeyannameDraftDto(
            BeyannameNo: beyannameNo,
            TescilTarihi: tescilTarihi,
            RejimKodu: rejim,
            GumrukIdaresi: gumrukIdaresi,
            Gonderici: gonderici,
            Alici: alici,
            Doviz: doviz,
            FaturaTutari: faturaTutari,
            Kur: kur,
            BeyanKalemSayisi: kalemSayisi,
            OnerilenKonum: onerilenKonum,
            Kalemler: kalemlerList,
            BelirsizAlanlar: docBelirsiz,
            Uyarilar: uyarilar,
            HamJson: rawJson);
    }

    public static decimal? TryGetDecimal(JsonNode? node)
    {
        if (node == null) return null;
        try
        {
            if (node is JsonValue val)
            {
                if (val.TryGetValue<decimal>(out var d)) return d;
                if (val.TryGetValue<double>(out var dbl)) return Convert.ToDecimal(dbl);
                if (val.TryGetValue<string>(out var str))
                {
                    str = str.Replace(" ", "").Replace(".", "").Replace(",", ".");
                    if (decimal.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
                        return parsed;
                }
            }
        }
        catch { }
        return null;
    }

    public static int? TryGetInt(JsonNode? node)
    {
        if (node == null) return null;
        try
        {
            if (node is JsonValue val)
            {
                if (val.TryGetValue<int>(out var i)) return i;
                if (val.TryGetValue<long>(out var l)) return (int)l;
                if (val.TryGetValue<string>(out var str) && int.TryParse(str.Trim(), out var parsed))
                    return parsed;
            }
        }
        catch { }
        return null;
    }
}

