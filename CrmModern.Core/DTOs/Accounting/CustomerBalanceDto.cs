namespace CrmModern.Core.DTOs.Accounting;

public sealed record CurrencyBalanceLineDto(
    string  ParaTipi,
    decimal Toplam,    // tüm siparişlerin ToplamFiyat'ı
    decimal Odenen,    // tahsilat toplamı (MuhasebeIslemTablo)
    decimal Kalan);    // Toplam − Odenen

public sealed record CustomerBalanceDto(
    int      MusteriID,
    string   MusteriAd,
    IReadOnlyList<CurrencyBalanceLineDto> Lines);
