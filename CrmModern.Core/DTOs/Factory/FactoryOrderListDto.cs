namespace CrmModern.Core.DTOs.Factory;

public sealed record FactoryOrderListDto(
    string  SiparisNo,
    string  MusteriAd,
    string? MUlke,
    string  SiparisMiTeklifMi,
    string? FabrikaNot,
    DateTime? STarih,
    DateTime Tarih);
