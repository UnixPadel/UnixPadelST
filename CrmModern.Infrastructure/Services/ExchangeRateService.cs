using System.Globalization;
using System.Xml.Linq;
using CrmModern.Core.DTOs.Currency;
using CrmModern.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// TCMB günlük kurları (https://www.tcmb.gov.tr/kurlar/today.xml) — ForexSelling
/// ("Döviz Satış") değeri, 1 birim yabancı paranın TL karşılığı. 1 saat önbelleklenir;
/// TCMB erişilemezse son başarılı kur (24 saate kadar) döner, o da yoksa boş liste —
/// sipariş ekranı bu durumda kurların elle girilmesine izin verir.
/// </summary>
public sealed class ExchangeRateService(
    HttpClient http,
    IMemoryCache cache,
    ILogger<ExchangeRateService> logger) : IExchangeRateService
{
    private const string TcmbUrl   = "https://www.tcmb.gov.tr/kurlar/today.xml";
    private const string FreshKey  = "exchange-rates:fresh";
    private const string LastKey   = "exchange-rates:last-good";
    private static readonly string[] Codes = ["EUR", "USD", "GBP"];

    public async Task<ExchangeRatesDto> GetRatesAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(FreshKey, out ExchangeRatesDto? fresh) && fresh is not null)
            return fresh;

        try
        {
            var xml = await http.GetStringAsync(TcmbUrl, ct);
            var dto = Parse(xml);
            cache.Set(FreshKey, dto, TimeSpan.FromHours(1));
            cache.Set(LastKey,  dto, TimeSpan.FromHours(24));
            return dto;
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "TCMB kurları alınamadı.");
            if (cache.TryGetValue(LastKey, out ExchangeRatesDto? last) && last is not null)
                return last;
            return new ExchangeRatesDto(null, "TCMB (erişilemedi)",
                new Dictionary<string, decimal> { ["TRY"] = 1m });
        }
    }

    private static ExchangeRatesDto Parse(string xml)
    {
        var doc   = XDocument.Parse(xml);
        var rates = new Dictionary<string, decimal> { ["TRY"] = 1m };

        foreach (var cur in doc.Root?.Elements("Currency") ?? [])
        {
            var code = (string?)cur.Attribute("CurrencyCode");
            if (code is null || !Codes.Contains(code)) continue;
            // Unit: bazı dövizler 100 birim için verilir (JPY vb.); EUR/USD/GBP için 1.
            var unit    = decimal.TryParse((string?)cur.Element("Unit"), NumberStyles.Number, CultureInfo.InvariantCulture, out var u) && u > 0 ? u : 1m;
            var selling = (string?)cur.Element("ForexSelling");
            if (decimal.TryParse(selling, NumberStyles.Number, CultureInfo.InvariantCulture, out var v) && v > 0)
                rates[code] = v / unit;
        }

        // <Tarih_Date Tarih="14.10.2026" Date="10/14/2026">
        DateOnly? tarih = DateOnly.TryParseExact((string?)doc.Root?.Attribute("Tarih"), "dd.MM.yyyy",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;

        return new ExchangeRatesDto(tarih, "TCMB", rates);
    }
}
