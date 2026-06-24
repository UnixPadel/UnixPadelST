namespace CrmModern.Core.DTOs.Purchase;

/// <summary>Ek dosyanın indirme verisi (bayt + ad + içerik tipi).</summary>
public sealed record PurchaseAttachmentDataDto(
    byte[] Veri,
    string Ad,
    string Tip);
