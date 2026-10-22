namespace CrmModern.Core.DTOs.Workflow;

// İç denetim — "önceki aşamada bekleyenler". Tüm roller (Fabrika dahil) okur:
// hiçbir parasal alan (fiyat/bakiye/kaparo) EKLENMEMELİDİR.
public sealed record WaitingOrderDto(
    string    SiparisNo,
    string    MusteriAd,
    string?   MUlke,
    string    Asama,
    string    StepCode,
    string    Department,
    DateTime? WaitingSince,
    string?   Temsilci);

/// <summary>Siparişin şu an beklediği adım; StepCode null = terminal (Tamamlandı/İptal) veya silinmiş.</summary>
public sealed record OrderWorkflowStatusDto(
    string    SiparisNo,
    string    Asama,
    string?   StepCode,
    string?   Department,
    DateTime? WaitingSince);
