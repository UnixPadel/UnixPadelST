using System.Security.Claims;

namespace CrmModern.API.Authorization;

/// <summary>
/// Sipariş verisine erişimin ortak kuralları. Aynı siparişi okuyan controller'lar
/// (sipariş, fabrika, muhasebe, lojistik, raporlama) bu kuralları buradan alır.
/// </summary>
public static class OrderAccess
{
    // PROMPT-v4 §1: Kontrol ekranının yetkilisi; kullanıcı adı bazlıdır (rol değil).
    private const string ControlUser = "elshan.rasulov";

    // Round-11 §3 — ad bazlı parasal gizleme (bkz. web lib/visibility.ts).
    private static readonly string[] HideMoneyUsers = { "omur.caliskan" };

    /// <summary>elshan.rasulov veya süper-admin: tüm siparişleri görür.</summary>
    public static bool IsOrderControlUser(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Name) == ControlUser || user.IsSuperAdmin();

    /// <summary>PROMPT-v5 §2 + Round-11 §3: Fabrika ve ad bazlı gizlenen kullanıcılar tutar göremez.</summary>
    public static bool HidesOrderMoney(this ClaimsPrincipal user) =>
        user.IsInRole("Fabrika")
        || (user.FindFirstValue(ClaimTypes.Name) is { } name && HideMoneyUsers.Contains(name));

    /// <summary>PROMPT-v2 §6: Temsilci yalnız kendi siparişlerine erişir; dönen değer
    /// sahip olması gereken kullanıcıdır. null = sahiplik kısıtı yok.</summary>
    public static int? OwnOrdersOnlyId(this ClaimsPrincipal user) =>
        user.IsInRole("Temsilci") && !user.IsOrderControlUser()
            ? int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new InvalidOperationException("KullaniciID claim missing."))
            : null;
}
