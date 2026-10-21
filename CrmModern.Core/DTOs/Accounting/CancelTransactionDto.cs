namespace CrmModern.Core.DTOs.Accounting;

/// <summary>
/// Muhasebe Onay — yanlış girilen tahsilat/peşinatın iptali. Gerekçe opsiyonel;
/// satır silinmez, iptal olarak işaretlenir ve toplamlardan düşer.
/// </summary>
public sealed record CancelTransactionDto(string? Gerekce = null);
