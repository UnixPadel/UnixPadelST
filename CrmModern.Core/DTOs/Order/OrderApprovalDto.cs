namespace CrmModern.Core.DTOs.Order;

public sealed record OrderApprovalDto(
    int       OnayID,
    string    SiparisNo,
    int       KullaniciID,
    string?   KullaniciAdi,
    string    OnayDurumu,
    string?   Aciklama,
    DateTime? OnayTarih);

public sealed record ApproveOrderDto(string? Aciklama);
public sealed record RejectOrderDto(string Aciklama);   // sebep zorunlu
