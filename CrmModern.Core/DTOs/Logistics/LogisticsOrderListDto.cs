namespace CrmModern.Core.DTOs.Logistics;

public sealed record LogisticsOrderListDto(
    string  SiparisNo,
    string  MusteriAd,
    string? MUlke,
    string  SiparisMiTeklifMi,
    string? LojistikNot,
    DateTime? STarih,
    DateTime Tarih);
