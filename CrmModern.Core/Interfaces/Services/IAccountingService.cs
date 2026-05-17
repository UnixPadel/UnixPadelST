using CrmModern.Core.DTOs.Accounting;

namespace CrmModern.Core.Interfaces.Services;

/// <summary>
/// Business logic for the Muhasebe + MuhasebeGecmis WinForms screens.
/// </summary>
public interface IAccountingService
{
    Task<IReadOnlyList<AccountingOrderListDto>>  GetAccountingOrdersAsync();
    Task<AccountingOrderListDto>                 GetOrderAccountingDetailAsync(string siparisNo);
    Task<IReadOnlyList<AccountingTransactionDto>> GetTransactionsForOrderAsync(string siparisNo);

    /// <summary>
    /// Yeni tahsilat. MuhasebeIslemTablo INSERT + Order.OdenenMiktar = SUM + Order.OdemeDurum güncelle.
    /// WinForms birebir: OdemeDurum ∈ {'Beklemede', 'Ödendi'}.
    /// </summary>
    Task<AccountingTransactionDto> AddTransactionAsync(AddTransactionDto dto, int currentUserId);

    Task<IReadOnlyList<AccountingTransactionDto>> GetTransactionHistoryAsync();
    Task<TransactionPageDto>     GetTransactionHistoryPagedAsync(TransactionFilterDto filter);

    Task<CustomerBalanceDto>     GetCustomerBalanceAsync(int musteriId);

    /// <summary>ClosedXML fallback xlsx (ExcelIndir BLOB template Faz 8'e).</summary>
    Task<byte[]> GenerateAccountingExcelAsync(TransactionFilterDto filter);

    /// <summary>SiparisAlTablo.MuhasebeEk = byte[]. Faz 3'teki blok bu metodla kaldırıldı.</summary>
    Task UploadMuhasebeEkAsync(string siparisNo, byte[] data, int currentUserId);
}
