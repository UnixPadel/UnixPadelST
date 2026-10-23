namespace CrmModern.Core.Exceptions;

/// <summary>
/// Thrown when a requested entity does not exist → HTTP 404.
/// Mesaj Türkçe üretilir; istemci <c>notFound</c> kodu + <c>{ entity, key }</c> ile kendi
/// dilinde gösterir (varlık adları i18n <c>apiErrors.entities.*</c>).
/// </summary>
public sealed class NotFoundException(string entityName, object key)
    : Exception($"{Describe(entityName).Tr} bulunamadı ({key}).")
{
    public string Code => "notFound";
    public object Args => new { entity = Describe(entityName).Key, key = key?.ToString() };

    // Çağrı yerlerinde karışık (İngilizce/Türkçe) varlık adları kullanılıyor; tek sözlükte toplanır.
    private static (string Key, string Tr) Describe(string entityName) => entityName switch
    {
        "Order" or "Sipariş" => ("order", "Sipariş"),
        "Quote" => ("quote", "Teklif"),
        "Kullanici" or "User" => ("user", "Kullanıcı"),
        "Musteri" => ("customer", "Müşteri"),
        "Tahsilat" => ("payment", "Tahsilat"),
        "EkMaliyet" => ("extraCost", "Ek maliyet"),
        "Category" or "ProductCategory" => ("category", "Kategori"),
        "Component" => ("part", "Parça"),
        "Attribute" => ("option", "Özellik"),
        "LogisticsEntry" => ("shipment", "Sevkiyat"),
        "LogisticsOffer" => ("shippingQuote", "Nakliye teklifi"),
        "PurchaseRequest" => ("purchaseRequest", "Satın alma talebi"),
        _ => ("record", "Kayıt"),
    };
}
