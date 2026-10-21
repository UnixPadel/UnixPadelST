using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

/// <summary>
/// Repository contract for MuhasebeIslemTablo (accounting payment transactions).
/// </summary>
public interface IAccountingRepository : IBaseRepository<AccountingTransaction>
{
    Task<IReadOnlyList<AccountingTransaction>> GetAllOrderedAsync();

    Task<IReadOnlyList<AccountingTransaction>> SearchAsync(
        string?   siparisNo,
        int?      kullaniciID,
        DateTime? baslangic,
        DateTime? bitis);

    /// <summary>Bir sipariş için SUM(OdenenMiktar). Tahsilat sonrası Order.OdenenMiktar güncellemesi için.</summary>
    Task<decimal> GetSumBySiparisNoAsync(string siparisNo);

    /// <summary>Bir müşterinin tüm tahsilatlarını sipariş döviz tipiyle birlikte (Order JOIN) döner.</summary>
    Task<IReadOnlyList<AccountingTransaction>> GetByCustomerAsync(int musteriId);

    /// <summary>
    /// Bir sipariş için tüm tahsilatlar (sayfa içi panel için). includeCancelled=true
    /// iptal edilmiş satırları da (geçmişte üstü çizili gösterim için) döner.
    /// </summary>
    Task<IReadOnlyList<AccountingTransaction>> GetBySiparisNoAsync(string siparisNo, bool includeCancelled = false);

    /// <summary>İptal akışı için izlenen (tracked) satır; iptal filtresi uygulanmaz.</summary>
    Task<AccountingTransaction?> GetForUpdateAsync(int id);
}
