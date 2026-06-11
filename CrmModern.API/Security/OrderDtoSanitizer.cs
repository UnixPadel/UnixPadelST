using CrmModern.Core.DTOs.Order;
using CrmModern.Core.DTOs.Search;

namespace CrmModern.API.Security;

/// <summary>
/// PROMPT-v5 §2 — Fabrika rolü hiçbir aşamada hiçbir sipariş parasal değeri göremez.
/// Karartma seti: ToplamFiyat, BrutToplamFiyat, MontajFiyat, TeslimatFiyat, Indirim,
/// Kdv, PesinYuzde, OdenenMiktar, kaparo/kalan bakiye türevleri ve kalem bazlı Fiyat.
/// Fabrika JWT'sine sipariş verisi servis eden HER endpoint dönüşten önce bu
/// helper'dan geçmek zorundadır — UI gizlemesi tek başına yeterli değildir.
/// (Satın alma modülündeki urunMaliyeti kapsam dışıdır: o değeri Fabrika kullanıcısı
/// talep formunda kendisi girer.)
/// </summary>
public static class OrderDtoSanitizer
{
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
        Items           = dto.Items.Select(i => i with { Fiyat = null }).ToList(),
    };

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
