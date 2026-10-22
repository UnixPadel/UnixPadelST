using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;
using CrmModern.Infrastructure.Persistence;
using CrmModern.Infrastructure.Repositories;
using CrmModern.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CrmModern.Infrastructure.Extensions;

/// <summary>
/// Single public entry-point for the Infrastructure layer.
/// API's Program.cs calls services.AddInfrastructure(config) — nothing else
/// from this layer is visible to the API project.
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration          configuration,
        bool                    enableDetailedSql = false)
    {
        // ── Database (MySQL via Pomelo) ────────────────────────────────────────
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is missing. " +
                "Add it to appsettings.json or user-secrets.");

        services.AddDbContext<AppDbContext>(options =>
        {
            options.UseMySql(
                connectionString,
                ServerVersion.AutoDetect(connectionString),
                mySql => mySql
                    .EnableRetryOnFailure(
                        maxRetryCount         : 3,
                        maxRetryDelay         : TimeSpan.FromSeconds(5),
                        errorNumbersToAdd     : null)
                    .CommandTimeout(30));

            // Paket 1 — geliştirme ortamında EF Core üretilen SQL'i Console'a log'la
            // ki entity ↔ kolon hatalarını ("Unknown column ...") hızlı yakalayalım.
            // Production'da Program.cs `false` geçer, açılmaz.
            if (enableDetailedSql)
            {
                options.EnableSensitiveDataLogging();
                options.EnableDetailedErrors();
                options.LogTo(Console.WriteLine, Microsoft.Extensions.Logging.LogLevel.Information);
            }
        });

        // ── Unit of Work + Repositories (Scoped = one per HTTP request) ───────
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Faz 8.11 — Dashboard endpoint'leri için in-memory cache (60 sn TTL)
        services.AddMemoryCache();

        // ── Application Services ──────────────────────────────────────────────
        services.AddScoped<IAuthService,             AuthService>();
        services.AddScoped<IMusteriService,          MusteriService>();
        services.AddScoped<IOrderService,            OrderService>();
        services.AddScoped<IQualityControlService,   QualityControlService>();
        services.AddScoped<IFactoryService,          FactoryService>();
        services.AddScoped<ILogisticsService,        LogisticsService>();
        services.AddScoped<IAccountingService,       AccountingService>();
        services.AddScoped<IPurchaseService,         PurchaseService>();
        services.AddScoped<IProductCatalogService,   ProductCatalogService>();
        services.AddScoped<IUserService,             UserService>();
        services.AddScoped<ISearchService,           SearchService>();
        services.AddScoped<IReportingService,        ReportingService>();
        services.AddScoped<IAuditService,            AuditService>();
        services.AddScoped<IWorkflowService,         WorkflowService>();

        // Döviz kurları (TCMB) — typed HttpClient; sonuç IMemoryCache'te 1 saat tutulur.
        services.AddHttpClient<IExchangeRateService, ExchangeRateService>(c => c.Timeout = TimeSpan.FromSeconds(10));

        return services;
    }
}
