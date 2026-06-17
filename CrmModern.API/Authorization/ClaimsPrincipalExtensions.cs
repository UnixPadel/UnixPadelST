using System.Security.Claims;

namespace CrmModern.API.Authorization;

/// <summary>
/// §24 — Süper-admin (Admin) yardımcıları. Admin kullanıcısı için login'de
/// `is_super_admin=true` claim'i basılır (AuthService). Hem merkezi authorization
/// handler (<see cref="SuperAdminAuthorizationHandler"/>) hem de controller'lardaki
/// imperatif kullanıcı-adı kapıları bu claim'i okur — böylece Admin tüm
/// rol/kullanıcı kontrollerinden muaf olur.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public const string SuperAdminClaim = "is_super_admin";

    public static bool IsSuperAdmin(this ClaimsPrincipal? user) =>
        user?.HasClaim(SuperAdminClaim, "true") ?? false;
}
