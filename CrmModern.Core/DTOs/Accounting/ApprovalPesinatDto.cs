namespace CrmModern.Core.DTOs.Accounting;

/// <summary>
/// Cari / Lojistik onay ekranında opsiyonel peşinat girişi.
/// Pesinat (> 0 ise) aşama geçişiyle AYNI çağrıda MuhasebeIslemTablo'ya
/// tahsilat satırı olarak işlenir (Cari → 1. Peşinat, Lojistik → 2. Peşinat).
/// SatinAlmaTalep.Maliyet'e ASLA yazılmaz — Maliyet yalnız "Talep Gönder"
/// (SubmitMaliyetTalep) ve "Tamamla" (FinalizeCompletion) yollarıyla değişir.
/// </summary>
public sealed record ApprovalPesinatDto(
    decimal?  Pesinat,
    DateTime? PesinatTarihi);
