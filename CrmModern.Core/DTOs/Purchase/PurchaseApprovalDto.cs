namespace CrmModern.Core.DTOs.Purchase;

public sealed record PurchaseApprovalDto(
    int       OnayID,
    int       TalepID,
    string    Asama,
    string    Durum,
    string    KullaniciAdi,
    DateTime  Tarih,
    string?   Not);
