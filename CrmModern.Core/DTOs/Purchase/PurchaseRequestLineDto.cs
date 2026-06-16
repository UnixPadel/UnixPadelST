namespace CrmModern.Core.DTOs.Purchase;

/// <summary>Round-9 §9 — detayda gösterilen kalem satırı (read).</summary>
public sealed record PurchaseRequestLineDto(
    int      KalemID,
    string   UrunAdi,
    string   Birim,
    decimal  Miktar,
    decimal? BirimFiyat,
    decimal  Toplam,
    decimal? Indirim,
    string?  IndirimTipi,
    string   FiyatModu);

/// <summary>Round-9 §9 — yeni talep oluştururken gönderilen kalem satırı (write).</summary>
public sealed record CreatePurchaseRequestLineDto(
    string   UrunAdi,
    string   Birim,
    decimal  Miktar,
    decimal? BirimFiyat,
    decimal  Toplam,
    decimal? Indirim,
    string?  IndirimTipi,
    string   FiyatModu);
