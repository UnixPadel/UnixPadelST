using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;

namespace CrmModern.Infrastructure.Repositories;

/// <summary>
/// Single AppDbContext is shared across all repositories within one HTTP request.
/// Repositories are instantiated lazily on first access.
/// </summary>
internal sealed class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    // ── Auth / Customer ───────────────────────────────────────────────────
    private IKullaniciRepository?      _kullanicilar;
    private IMusteriRepository?        _musteriler;
    private IUlkeRepository?           _ulkeler;

    // ── Order / Quote ─────────────────────────────────────────────────────
    private IOrderRepository?           _orders;
    private IProductCategoryRepository? _productCategories;
    private IComponentRepository?       _components;
    private IAttributeRepository?       _attributes;
    private IDeliveryAddressRepository? _deliveryAddresses;

    // ── Logistics / Accounting / Purchase ────────────────────────────────
    private ILogisticsEntryRepository?  _logisticsEntries;
    private ILogisticsOfferRepository?  _logisticsOffers;
    private IAccountingRepository?      _accounting;
    private IPurchaseRepository?        _purchaseRequests;
    private IPurchaseAttachmentRepository? _purchaseAttachments;

    // ── Order lifecycle (Faz 3) ──────────────────────────────────────────
    private IOrderApprovalRepository?   _orderApprovals;
    private IOrderShipmentRepository?   _orderShipments;
    private ICompletedOrderRepository?  _completedOrders;
    private IStockRepository?           _stock;
    private IProductCostRepository?     _productCosts;

    // ── Faz 8 ────────────────────────────────────────────────────────────
    private IExcelTemplateRepository?    _excelTemplates;
    private IAuditRepository?            _audit;
    private IPurchaseApprovalRepository? _purchaseApprovals;

    public IKullaniciRepository Kullanicilar =>
        _kullanicilar ??= new KullaniciRepository(context);

    public IMusteriRepository Musteriler =>
        _musteriler ??= new MusteriRepository(context);

    public IUlkeRepository Ulkeler =>
        _ulkeler ??= new UlkeRepository(context);

    public IOrderRepository Orders =>
        _orders ??= new OrderRepository(context);

    public IProductCategoryRepository ProductCategories =>
        _productCategories ??= new ProductCategoryRepository(context);

    public IComponentRepository Components =>
        _components ??= new ComponentRepository(context);

    public IAttributeRepository Attributes =>
        _attributes ??= new AttributeRepository(context);

    public IDeliveryAddressRepository DeliveryAddresses =>
        _deliveryAddresses ??= new DeliveryAddressRepository(context);

    public ILogisticsEntryRepository LogisticsEntries =>
        _logisticsEntries ??= new LogisticsEntryRepository(context);

    public ILogisticsOfferRepository LogisticsOffers =>
        _logisticsOffers ??= new LogisticsOfferRepository(context);

    public IAccountingRepository Accounting =>
        _accounting ??= new AccountingRepository(context);

    public IPurchaseRepository PurchaseRequests =>
        _purchaseRequests ??= new PurchaseRepository(context);

    public IPurchaseAttachmentRepository PurchaseAttachments =>
        _purchaseAttachments ??= new PurchaseAttachmentRepository(context);

    public IOrderApprovalRepository OrderApprovals =>
        _orderApprovals ??= new OrderApprovalRepository(context);

    public IOrderShipmentRepository OrderShipments =>
        _orderShipments ??= new OrderShipmentRepository(context);

    public ICompletedOrderRepository CompletedOrders =>
        _completedOrders ??= new CompletedOrderRepository(context);

    public IStockRepository Stock =>
        _stock ??= new StockRepository(context);

    public IProductCostRepository ProductCosts =>
        _productCosts ??= new ProductCostRepository(context);

    public IExcelTemplateRepository ExcelTemplates =>
        _excelTemplates ??= new ExcelTemplateRepository(context);

    public IAuditRepository Audit =>
        _audit ??= new AuditRepository(context);

    public IPurchaseApprovalRepository PurchaseApprovals =>
        _purchaseApprovals ??= new PurchaseApprovalRepository(context);

    public async Task<int> SaveChangesAsync() => await context.SaveChangesAsync();

    public void Dispose() => context.Dispose();
}
