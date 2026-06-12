namespace CrmModern.Core.DTOs.Logistics;

// PROMPT-v6 §4 — PesinYuzde + OdemeDurum yalnız ödeme TÜRÜ bilgisi içindir
// (Peşin / Vadeli + Ödendi / Beklemede). Parasal TUTAR alanı bilinçli olarak
// YOK — Lojistik'e bakiye/fiyat açılmaz (v5 §2 karartma ruhu).
public sealed record LogisticsOrderListDto(
    string  SiparisNo,
    string  MusteriAd,
    string? MUlke,
    string  SiparisMiTeklifMi,
    string? LojistikNot,
    DateTime? STarih,
    DateTime Tarih,
    int     PesinYuzde = 0,
    string? OdemeDurum = null);
