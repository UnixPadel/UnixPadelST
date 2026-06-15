namespace CrmModern.Core.DTOs.User;

/// <summary>
/// Slim user record for dropdown / filter usage — no email, phone or status
/// (those are sensitive and only exposed via UserListDto, restricted to
/// Yonetici). YetkiTuru (role) is included so "Temsilci" filters can narrow
/// the list to sales reps (Round-8 §11/§13/§15).
///
/// Used by Fabrika filter "Temsilci" dropdown — any authenticated role
/// can request this list.
/// </summary>
public sealed record UserLookupDto(
    int    KullaniciID,
    string Ad,
    string Soyad,
    string YetkiTuru);
