namespace CrmModern.Core.DTOs.Auth;

/// <summary>
/// Returned after successful login.
///
/// CanApprovePurchase  — PRESERVED: true ONLY for "elshan.rasulov" (original Form3 line 320).
///                       Not role-based — it is a per-username business rule.
///
/// CanViewPurchaseRequests — PRESERVED: true for Lojistik | Fabrika | Gozlemci (Form3 line 319).
/// </summary>
public sealed record LoginResponseDto(
    int    KullaniciID,
    string KullaniciAdi,
    string Ad,
    string Soyad,
    string YetkiTuru,
    bool   CanApprovePurchase,
    bool   CanViewPurchaseRequests,
    string Token
);
