using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IOrderApprovalRepository : IBaseRepository<OrderApproval>
{
    Task<IReadOnlyList<OrderApproval>> GetBySiparisNoAsync(string siparisNo);

    /// <summary>
    /// Paket 2 — DB'de `uk_siparis_kullanici(SiparisNo, KullaniciID)` unique
    /// constraint olduğu için INSERT ikinci kez aynı çift için patlıyordu.
    /// Var olan satırı UPDATE eder; yoksa INSERT atar. SaveChanges burada
    /// yapılmaz — çağıran servis kendi `SaveChangesAsync` ile commit eder.
    /// </summary>
    Task UpsertAsync(string siparisNo, int kullaniciID, string durum, string? aciklama);
}
