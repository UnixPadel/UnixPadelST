namespace CrmModern.Core.DTOs.Accounting;

/// <summary>
/// PROMPT.md ACCOUNTING #14 — Muhasebe ekranındaki "Talep Gönder" butonu.
///
/// SatinAlmaTalep (TalepTipi='Muhasebe') için **upsert** payload'u. Aynı
/// SiparisNo için kayıt zaten varsa güncellenir ve Durum yeniden
/// 'Onay Bekliyor' yapılır (re-arm); yoksa yeni satır eklenir. UrunAdi,
/// Departman ve TalepEden server-side türetilir — istemci bunlardan
/// haberdar olmak zorunda değil.
/// </summary>
public sealed record SubmitMaliyetTalepDto(
    decimal  Maliyet,
    string?  MaliyetDetayi,
    decimal? ToplamSiparis,
    decimal? KaporaBakiyesi,
    decimal? KalanBakiyeTalep,
    decimal? PesinYuzde);
