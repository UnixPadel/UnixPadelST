namespace CrmModern.Core.DTOs.WarehouseStock;

/// <summary>Okuma sonrası uyarı — <c>Kod</c> istemcide çevrilir, <c>Mesaj</c> Türkçe yedektir.</summary>
public sealed record DraftWarningDto(string Kod, string Mesaj);

/// <summary>Okunan tek kalem (kontrol ekranında düzenlenebilir taslak).</summary>
public sealed record DraftItemDto(
    int?      KalemNo,
    string?   MalAdi,          // kısa ad önerisi (kullanıcı değiştirir)
    string?   TicariTanim,
    decimal?  Miktar,
    string?   Birim,
    decimal?  KapAdedi,
    string?   KapCinsi,
    string?   Gtip,
    string?   MenseUlke,
    decimal?  BrutKg,
    decimal?  NetKg,
    decimal?  KalemFiyati,
    IReadOnlyList<string> BelirsizAlanlar);   // "Düşük güven" — arayüz sarı işaretler

/// <summary>Belgeden okunan başlık + kalemler.</summary>
public sealed record BeyannameDraftDto(
    string?   BeyannameNo,
    DateTime? TescilTarihi,
    string?   RejimKodu,
    string?   GumrukIdaresi,
    string?   Gonderici,
    string?   Alici,
    string?   Doviz,
    decimal?  FaturaTutari,
    decimal?  Kur,
    int?      BeyanKalemSayisi,
    string?   OnerilenKonum,       // beyanname no 'AN' içeriyorsa Antrepo
    IReadOnlyList<DraftItemDto>      Kalemler,
    IReadOnlyList<string>            BelirsizAlanlar,
    IReadOnlyList<DraftWarningDto>   Uyarilar,
    string?   HamJson);

/// <summary>
/// Analiz sonucu. Okuma başarısızsa (anahtar geçersiz, kota, okunamadı…) hata atılmaz:
/// <c>Basarili=false</c> ve <c>HataKodu</c> ile istemci elle girişe düşer.
/// </summary>
public sealed record AnalyzeResultDto(
    bool                 Basarili,
    string?              HataKodu,
    string?              HataMesaji,
    BeyannameDraftDto?   Taslak,
    int?                 MevcutBeyannameId);
