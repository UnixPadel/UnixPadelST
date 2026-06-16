using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using EntityAttribute = CrmModern.Core.Entities.Attribute;

namespace CrmModern.Infrastructure.Persistence;

/// <summary>
/// INTERNAL — never reference this class outside CrmModern.Infrastructure.
/// All DB access goes through IUnitOfWork → IRepository interfaces.
///
/// Table names match the existing production MySQL database exactly.
/// No migrations that rename tables or columns are permitted.
/// </summary>
internal sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ── Auth / Customer ───────────────────────────────────────────────────
    public DbSet<Kullanici> KullaniciBilgileri  => Set<Kullanici>();
    public DbSet<Musteri>   MusteriBilgileri    => Set<Musteri>();
    public DbSet<Ulke>      UlkelerBilgileri    => Set<Ulke>();

    // ── Order / Quote ─────────────────────────────────────────────────────
    public DbSet<Order>           SiparisAlTablo      => Set<Order>();
    public DbSet<OrderItem>       SiparisIslemTablo   => Set<OrderItem>();
    public DbSet<OrderDetail>     DetayTablo          => Set<OrderDetail>();
    public DbSet<DeliveryAddress> TeslimatBilgisiTablo => Set<DeliveryAddress>();

    // ── Product catalog ───────────────────────────────────────────────────
    public DbSet<ProductCategory>   UrunKategorileri   => Set<ProductCategory>();
    public DbSet<Component>         BilesenBilgileri   => Set<Component>();
    public DbSet<CategoryComponent> KategoriBilesenleri => Set<CategoryComponent>();
    public DbSet<EntityAttribute>   OznitelikTablo     => Set<EntityAttribute>();

    // ── Logistics / Accounting / Purchase ────────────────────────────────
    public DbSet<LogisticsEntry>        LojistikTablo      => Set<LogisticsEntry>();
    public DbSet<AccountingTransaction> MuhasebeIslemTablo => Set<AccountingTransaction>();
    public DbSet<PurchaseRequest>       SatinAlmaTalep     => Set<PurchaseRequest>();
    public DbSet<PurchaseRequestLine>   SatinAlmaTalepKalem => Set<PurchaseRequestLine>();

    // ── Order lifecycle (Faz 3) ──────────────────────────────────────────
    public DbSet<OrderApproval>  SiparisOnaylari      => Set<OrderApproval>();
    public DbSet<OrderShipment>  SiparisTeslimatTablo => Set<OrderShipment>();
    public DbSet<CompletedOrder> TamamlandiTablo      => Set<CompletedOrder>();
    public DbSet<StockEntry>     StokTablo            => Set<StockEntry>();
    public DbSet<ProductCost>    UrunMaliyetTablo     => Set<ProductCost>();

    // ── Faz 8 (template + audit) ─────────────────────────────────────────
    public DbSet<ExcelTemplate>      ExcelIndir       => Set<ExcelTemplate>();
    public DbSet<AuditEntry>         EklemeGecmisi    => Set<AuditEntry>();
    public DbSet<PurchaseApproval>   TalepOnaylari    => Set<PurchaseApproval>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Loads all IEntityTypeConfiguration<T> classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
