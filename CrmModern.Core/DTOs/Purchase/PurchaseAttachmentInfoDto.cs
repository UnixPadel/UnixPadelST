namespace CrmModern.Core.DTOs.Purchase;

/// <summary>Ek dosya meta verisi (blob YOK) — indirme düğmesini göstermek için.</summary>
public sealed record PurchaseAttachmentInfoDto(
    int      TalepID,
    string   Ad,
    string   Tip,
    DateTime Tarih,
    string?  Yukleyen);
