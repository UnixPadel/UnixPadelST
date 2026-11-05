namespace CrmModern.Core.DTOs.Accounting;

/// <summary>
/// Sipariş finalize girişi:
/// Pesinat (> 0 ise) MuhasebeIslemTablo'ya tahsilat olarak işlenir;
/// FinalMaliyet (> 0 ise) SatinAlmaTalep.Maliyet'e yazılır (Maliyet Reçetesi okur).
/// KapanisNotu TamamlandiTablo.Aciklama'ya yazılır ve sipariş detayında gösterilir.
/// </summary>
public sealed record FinalizeCompletionDto(
    decimal?  Pesinat,
    DateTime? PesinatTarihi,
    decimal?  FinalMaliyet,
    string?   MaliyetDetayi,
    string?   KapanisNotu = null);
