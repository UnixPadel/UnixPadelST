using System.Text;
using CrmModern.API.Middleware;
using CrmModern.Infrastructure.Extensions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Infrastructure (EF Core + Repos + Services) ───────────────────────────
// Paket 1: dev environment'ta detaylı SQL log + sensitive data logging açık.
builder.Services.AddInfrastructure(
    builder.Configuration,
    enableDetailedSql: builder.Environment.IsDevelopment());

// ── JWT Authentication ─────────────────────────────────────────────────────
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey   = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtSettings["Issuer"],
            ValidAudience            = jwtSettings["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(secretKey),
            ClockSkew                = TimeSpan.Zero   // no grace period on expiry
        };
    });

builder.Services.AddAuthorization();

// §24 — Admin tüm [Authorize] politikalarını (rol gereksinimleri dahil) karşılar.
// Rol claim'i enjekte etmeden (Fabrika rolü para gizlemesini tetiklerdi) merkezi
// olarak yetkilendirmeyi geçirir.
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler,
    CrmModern.API.Authorization.SuperAdminAuthorizationHandler>();

// ── Controllers ────────────────────────────────────────────────────────────
builder.Services.AddControllers();

// Faz 8.9 — ModelState invalid hata cevabını ApiResponse zarfına dönüştür.
// Field-bazlı hatalar Errors[] içinde "Field: Message" formatında listelenir.
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(kv => kv.Value?.Errors.Count > 0)
            .SelectMany(kv => kv.Value!.Errors.Select(e => $"{kv.Key}: {e.ErrorMessage}"))
            .ToArray();

        var body = CrmModern.Core.DTOs.Common.ApiResponse<object>
            .Fail("Doğrulama hatası.", errors);

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(body);
    };
});

// ── CORS ──────────────────────────────────────────────────────────────────
// İki istemci senaryosu:
//   1. Vite dev server (npm run dev) → http://localhost:5173
//   2. Electron paketlenmiş UnixPadelST.exe → file:// origin (Origin: "null")
// Electron file:// için SetIsOriginAllowed ile null/file origin'lere izin
// veriyoruz. JWT header'da gittiği için AllowCredentials gerekmiyor.
builder.Services.AddCors(options =>
    options.AddPolicy("UnixPadelClients", policy =>
        policy
            .SetIsOriginAllowed(origin =>
                string.IsNullOrEmpty(origin)               // file:// origin null gelir
                || origin.StartsWith("file://")
                || origin == "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()));

// ── Swagger (with JWT support) ─────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title   = "CrmModern API",
        Version = "v1",
        Description = "Unix Padel ST CRM — modernized backend"
    });

    // Allow Bearer token entry in Swagger UI
    var jwtScheme = new OpenApiSecurityScheme
    {
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        Description  = "Paste your JWT token here (without 'Bearer ' prefix)"
    };
    c.AddSecurityDefinition("Bearer", jwtScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── Build ──────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Faz 8 — Idempotent şema bakımı (bcrypt için Sifre kolonu varchar(255)) ─
using (var startupScope = app.Services.CreateScope())
{
    var logger = startupScope.ServiceProvider
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseSchemaMigrator");
    try
    {
        await CrmModern.Infrastructure.Persistence.DatabaseSchemaMigrator
            .ApplyAsync(app.Services, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Şema migrator hata aldı; uygulama yine de çalışmaya devam ediyor.");
    }
}

// ── Middleware pipeline (order matters) ───────────────────────────────────
app.UseMiddleware<ErrorHandlingMiddleware>();   // 1. catch all exceptions first

// Swagger her ortamda açık — iç ağda Electron istemciden gelen istekleri debug etmek için.
// İleride public domain + auth korumalı API olursa Production'da kapatılabilir.
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "CrmModern v1"));

if (!app.Environment.IsDevelopment())
{
    // Faz 8.12 — Production-only güvenlik header'ları
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseCors("UnixPadelClients");               // 2. CORS before auth
app.UseAuthentication();                       // 3. identify who the user is
app.UseAuthorization();                        // 4. check permissions
app.MapControllers();

app.Run();
