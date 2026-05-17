using System.ComponentModel.DataAnnotations;

namespace CrmModern.Core.DTOs.Accounting;

/// <summary>
/// Yeni tahsilat. WinForms `MuhasebeIslemTablo` kolonları sınırlı:
/// IslemTuru/OdemeYontemi DB'de YOK → bu DTO'da yer almıyor.
/// MusteriID Order'dan resolve edilir, KullaniciID JWT'den alınır.
/// </summary>
public sealed record AddTransactionDto(
    [Required]                         string    SiparisNo,
    [Required, Range(0.01, double.MaxValue)] decimal OdenenMiktar,
    DateTime?                                    Tarih   // null → DateTime.Today
);
