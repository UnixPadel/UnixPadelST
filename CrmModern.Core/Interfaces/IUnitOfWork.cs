using CrmModern.Core.Interfaces.Repositories;

namespace CrmModern.Core.Interfaces;

/// <summary>
/// Wraps all repositories and a single SaveChanges call.
/// One instance per HTTP request (Scoped lifetime).
/// </summary>
public interface IUnitOfWork : IDisposable
{
    // ── Auth / Customer ───────────────────────────────────────────────────
    IKullaniciRepository      Kullanicilar      { get; }
    IMusteriRepository        Musteriler        { get; }
    IUlkeRepository           Ulkeler           { get; }

    // ── Order / Quote ─────────────────────────────────────────────────────
    IOrderRepository          Orders            { get; }
    IProductCategoryRepository ProductCategories { get; }
    IComponentRepository      Components        { get; }
    IAttributeRepository      Attributes        { get; }
    IDeliveryAddressRepository DeliveryAddresses { get; }

    // ── Logistics / Accounting / Purchase ────────────────────────────────
    ILogisticsEntryRepository  LogisticsEntries  { get; }
    IAccountingRepository      Accounting        { get; }
    IPurchaseRepository        PurchaseRequests  { get; }

    // ── Order lifecycle (Faz 3) ──────────────────────────────────────────
    IOrderApprovalRepository   OrderApprovals    { get; }
    IOrderShipmentRepository   OrderShipments    { get; }
    ICompletedOrderRepository  CompletedOrders   { get; }
    IStockRepository           Stock             { get; }
    IProductCostRepository     ProductCosts      { get; }

    // ── Faz 8 ────────────────────────────────────────────────────────────
    IExcelTemplateRepository   ExcelTemplates    { get; }
    IAuditRepository           Audit             { get; }
    IPurchaseApprovalRepository PurchaseApprovals { get; }

    Task<int> SaveChangesAsync();
}
