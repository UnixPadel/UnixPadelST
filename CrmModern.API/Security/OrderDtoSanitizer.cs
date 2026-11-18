using System.Text.RegularExpressions;
using CrmModern.Core.DTOs.Accounting;
using CrmModern.Core.DTOs.Logistics;
using CrmModern.Core.DTOs.Order;
using CrmModern.Core.DTOs.Search;

namespace CrmModern.API.Security;

/// <summary>
/// PROMPT-v5 §2 — Fabrika rolü hiçbir aşamada hiçbir sipariş parasal değeri göremez;
/// Round-11 §3 — ad bazlı gizlenen kullanıcılar (omur.caliskan) da aynı karartmayı alır.
/// Karartma seti: ToplamFiyat, BrutToplamFiyat, MontajFiyat, TeslimatFiyat, Indirim,
/// Kdv, PesinYuzde, OdenenMiktar, ekstra maliyetler, kaparo/kalan bakiye türevleri,
/// kalem bazlı Fiyat ve tutar geçen onay açıklamaları.
/// Bu kullanıcıların JWT'sine sipariş verisi servis eden HER endpoint dönüşten önce bu
/// helper'dan geçmek zorundadır — UI gizlemesi tek başına yeterli değildir.
/// (Satın alma modülündeki urunMaliyeti kapsam dışıdır: o değeri Fabrika kullanıcısı
/// talep formunda kendisi girer.)
/// </summary>
public static class OrderDtoSanitizer
{
    // Onay açıklamalarını servisler tutarla yazar ("1. Peşinat: 1.250,00",
    // "Final Maliyet: …", "Lojistik teklif onaylandı: Firma — 900,00 (…)"). N2 biçimi
    // ya da parasal bir kelime geçen açıklama bütünüyle kaldırılır; durum ve tarih kalır.
    private static readonly Regex MoneyInNote = new(
        @"\d[.,]\d{2}\b|peşinat|maliyet|fiyat|tutar",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static OrderDetailDto StripPricesForFactory(OrderDetailDto dto) => dto with
    {
        ToplamFiyat     = null,
        BrutToplamFiyat = null,
        MontajFiyat     = null,
        TeslimatFiyat   = null,
        Indirim         = null,
        Kdv             = null,
        PesinYuzde      = 0,
        OdenenMiktar    = null,
        ExtraCosts      = null,
        Items           = dto.Items.Select(i => i with { Fiyat = null }).ToList(),
    };

    public static OrderApprovalDto StripPricesForFactory(OrderApprovalDto dto) =>
        dto.Aciklama is not null && MoneyInNote.IsMatch(dto.Aciklama)
            ? dto with { Aciklama = null }
            : dto;

    public static AccountingTransactionDto StripPricesForFactory(AccountingTransactionDto dto) =>
        dto with { OdenenMiktar = null };

    public static TransactionListItemDto StripPricesForFactory(TransactionListItemDto dto) =>
        dto with { OdenenMiktar = null, Maliyet = null };

    public static TransactionPageDto StripPricesForFactory(TransactionPageDto dto) => dto with
    {
        Items          = dto.Items.Select(StripPricesForFactory).ToList(),
        CurrencyTotals = new Dictionary<string, decimal>(),
    };

    public static LogisticsHistoryDto StripPricesForFactory(LogisticsHistoryDto dto) =>
        dto with { Fiyat = 0m };

    public static OrderListDto StripPricesForFactory(OrderListDto dto) => dto with
    {
        ToplamFiyat  = null,
        OdenenMiktar = null,
        PesinYuzde   = 0,
    };

    public static SearchResultDto StripPricesForFactory(SearchResultDto dto) => dto with
    {
        ToplamFiyat  = null,
        KaparoFiyat  = 0m,
        KalanBakiye  = 0m,
        OdenenMiktar = null,
    };
}
