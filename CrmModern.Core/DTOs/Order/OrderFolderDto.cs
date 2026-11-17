namespace CrmModern.Core.DTOs.Order;

/// <summary>Muhasebe Klasörü'nün işaret ettiği sipariş (blob yok).</summary>
public sealed record OrderFolderRef(int SiparisAlID, string SiparisNo, string? TeklifNo, int KullaniciID);

/// <summary>Klasördeki yüklenmiş dosyanın meta verisi (blob yok).
/// Silindi/SilinmeTarihi yalnız ?includeDeleted=true ile gelen silinmiş dosyalarda dolu.</summary>
public sealed record OrderFolderFileDto(
    int       EkID,
    string    Ad,
    string    Tip,
    long      Boyut,
    DateTime  Tarih,
    string?   YukleyenAdSoyad,
    bool      Silindi       = false,
    DateTime? SilinmeTarihi = null);

/// <summary>Siparişin eski tek-blob ekleri (SiparisAlTablo.Ek / MuhasebeEk).</summary>
public sealed record OrderFolderLegacyFileDto(string Ad, string Tip, long Boyut);

/// <summary>Muhasebe Klasörü içeriği + bu kullanıcının yetkileri.</summary>
public sealed record OrderFolderDto(
    string SiparisNo,
    bool   CanManage,
    bool   CanSeeProforma,
    IReadOnlyList<OrderFolderFileDto> Dosyalar,
    OrderFolderLegacyFileDto? OncekiMuhasebeEk,
    OrderFolderLegacyFileDto? SaticiEk);

/// <summary>İndirme için dosya içeriği.</summary>
public sealed record OrderFolderFileDataDto(byte[] Veri, string Ad, string Tip);
