namespace CrmModern.Core.DTOs.Logistics;

public sealed record MoveToLogisticsDto(
    DateTime STarih,
    string   LojistikNot,
    int      KullaniciID,
    string   FirmaAdi,
    string   LojistikCesit,
    decimal  Fiyat,
    string?  LNot);
