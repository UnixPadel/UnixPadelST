using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CrmModern.Core.DTOs.Auth;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CrmModern.Infrastructure.Services;

internal sealed class AuthService(IUnitOfWork unitOfWork, IConfiguration configuration) : IAuthService
{
    // ── Business rules preserved exactly from the original WinForms code ──────

    /// <summary>
    /// PRESERVED FROM Form3.cs line 320:
    ///   satinAlmaOnaylariButton.Visible = (KullaniciAdi == "elshan.rasulov");
    /// This is a username-based rule, NOT a role-based rule.
    /// Do NOT change this to a role check.
    /// </summary>
    private const string PurchaseApproverUsername = "elshan.rasulov";

    /// <summary>
    /// PRESERVED FROM Form3.cs line 319:
    ///   satinAlmaButton.Visible = (Yetki == "Lojistik" || Yetki == "Fabrika" || Yetki == "Gozlemci" || Yetki == "Temsilci");
    /// </summary>
    private static readonly HashSet<string> PurchaseRequestRoles =
        new(StringComparer.OrdinalIgnoreCase) { "Lojistik", "Fabrika", "Gozlemci", "Temsilci" };

    // ─────────────────────────────────────────────────────────────────────────

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        // Parola kontrolü (read-only):
        //   1) Kullanıcıyı yalnız username ile çek.
        //   2) Sifre `$2`/`$2a`/`$2b`/`$2y` ile başlıyorsa bcrypt verify.
        //   3) Aksi halde düz metin eşitlik (legacy WinForms hesaplar).
        // Login HİÇBİR DURUMDA Sifre kolonunu yazmaz — eski plain-text hesapların
        // bcrypt'e taşınması yalnız bilinçli "şifre değiştir" aksiyonunda
        // (UserService.ChangePasswordAsync) veya admin/script üzerinden yapılır.
        var kullanici = await unitOfWork.Kullanicilar.GetByKullaniciAdiAsync(request.KullaniciAdi)
            ?? throw new UnauthorizedException("Kullanıcı adı veya şifre hatalı.");

        bool isBcrypt = !string.IsNullOrEmpty(kullanici.Sifre) && kullanici.Sifre.StartsWith("$2");
        bool ok;
        if (isBcrypt)
        {
            try   { ok = BCrypt.Net.BCrypt.Verify(request.Sifre, kullanici.Sifre); }
            catch { ok = false; }
        }
        else
        {
            ok = string.Equals(kullanici.Sifre, request.Sifre, StringComparison.Ordinal);
        }

        if (!ok)
            throw new UnauthorizedException("Kullanıcı adı veya şifre hatalı.");

        // Replicates original: if (durum == "Aktif") { ... } else { MessageBox.Show("Hesabınız pasif durumda.") }
        if (!kullanici.Durum.Equals("Aktif", StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedException("Hesabınız pasif durumda.");

        var token = GenerateJwtToken(kullanici);

        return new LoginResponseDto(
            KullaniciID            : kullanici.KullaniciID,
            KullaniciAdi           : kullanici.KullaniciAdi,
            Ad                     : kullanici.Ad,
            Soyad                  : kullanici.Soyad,
            YetkiTuru              : kullanici.YetkiTuru,
            CanApprovePurchase     : kullanici.KullaniciAdi == PurchaseApproverUsername,
            CanViewPurchaseRequests: PurchaseRequestRoles.Contains(kullanici.YetkiTuru),
            Token                  : token
        );
    }

    public async Task<LoginResponseDto> GetMeAsync(int kullaniciId)
    {
        var kullanici = await unitOfWork.Kullanicilar.GetByIdAsync(kullaniciId)
            ?? throw new UnauthorizedException("Kullanıcı bulunamadı.");

        return new LoginResponseDto(
            KullaniciID            : kullanici.KullaniciID,
            KullaniciAdi           : kullanici.KullaniciAdi,
            Ad                     : kullanici.Ad,
            Soyad                  : kullanici.Soyad,
            YetkiTuru              : kullanici.YetkiTuru,
            CanApprovePurchase     : kullanici.KullaniciAdi == PurchaseApproverUsername,
            CanViewPurchaseRequests: PurchaseRequestRoles.Contains(kullanici.YetkiTuru),
            Token                  : string.Empty   // me endpoint'i token üretmez
        );
    }

    private string GenerateJwtToken(Core.Entities.Kullanici kullanici)
    {
        var jwtSettings = configuration.GetSection("JwtSettings");
        var key         = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, kullanici.KullaniciID.ToString()),
            new(ClaimTypes.Name,           kullanici.KullaniciAdi),
            new(ClaimTypes.GivenName,      kullanici.Ad),
            new(ClaimTypes.Surname,        kullanici.Soyad),
            new(ClaimTypes.Role,           kullanici.YetkiTuru),

            // Custom claims that mirror the WinForms button-visibility rules
            new("can_approve_purchase",
                (kullanici.KullaniciAdi == PurchaseApproverUsername).ToString().ToLower()),

            new("can_view_purchase_requests",
                PurchaseRequestRoles.Contains(kullanici.YetkiTuru).ToString().ToLower()),
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject            = new ClaimsIdentity(claims),
            Expires            = DateTime.UtcNow.AddHours(int.Parse(jwtSettings["ExpiryHours"] ?? "8")),
            Issuer             = jwtSettings["Issuer"],
            Audience           = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(handler.CreateToken(tokenDescriptor));
    }
}
