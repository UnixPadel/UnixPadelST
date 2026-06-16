namespace CrmModern.Core.DTOs.Accounting;

/// <summary>
/// Round-9 §19 — "Tamamlanmayı Bekleyen" tabında Burcu'nun finalize girişi.
/// Pesinat (> 0 ise) MuhasebeIslemTablo'ya tahsilat olarak işlenir;
/// FinalMaliyet SatinAlmaTalep.Maliyet'e yazılır (Maliyet Reçetesi okur).
/// Ardından sipariş 'TamamlanmaBekliyor' → 'Tamamlandi' olur.
/// </summary>
public sealed record FinalizeCompletionDto(
    decimal?  Pesinat,
    DateTime? PesinatTarihi,
    decimal   FinalMaliyet,
    string?   MaliyetDetayi);
