namespace CrmModern.Core.DTOs.User;

/// <summary>
/// Slim user record for dropdown / filter usage — no email, phone, role
/// or status (those are sensitive and only exposed via UserListDto, which
/// is restricted to Yonetici).
///
/// Used by Fabrika filter "Temsilci" dropdown — any authenticated role
/// can request this list.
/// </summary>
public sealed record UserLookupDto(
    int    KullaniciID,
    string Ad,
    string Soyad);
