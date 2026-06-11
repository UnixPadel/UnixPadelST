namespace CrmModern.Core.DTOs.Order;

/// <summary>PROMPT-v4 §5.4 — Kontrol ekranı "Cari Güncelle" (legacy button2_Click_2).</summary>
public sealed record UpdatePaidAmountDto(decimal OdenenMiktar);

/// <summary>PROMPT-v4 §5.5 — Kontrol ekranı "Aşama Kaydet" (legacy fabrikaButton_Click_1).</summary>
public sealed record UpdateStageDto(string Asama, DateTime STarih, string? KontrolNot);
