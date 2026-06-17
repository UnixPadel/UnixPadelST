using Microsoft.AspNetCore.Authorization;

namespace CrmModern.API.Authorization;

/// <summary>
/// §24 — Admin tüm `[Authorize]` politikalarını (rol gereksinimleri dahil)
/// karşılar. Bir gereksinim, herhangi bir handler onu Succeed ettiğinde sağlanır;
/// bu handler süper-admin için BEKLEYEN tüm gereksinimleri başarılı işaretler.
/// Rol CLAIM'i ENJEKTE ETMEZ (örn. 'Fabrika' rolü eklemek `IsInRole("Fabrika")`
/// üzerinden gelir/para gizlemesini tetiklerdi) — yalnız yetkilendirmeyi geçirir.
/// </summary>
public sealed class SuperAdminAuthorizationHandler : IAuthorizationHandler
{
    public Task HandleAsync(AuthorizationHandlerContext context)
    {
        if (context.User.IsSuperAdmin())
        {
            foreach (var requirement in context.PendingRequirements.ToList())
                context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}
