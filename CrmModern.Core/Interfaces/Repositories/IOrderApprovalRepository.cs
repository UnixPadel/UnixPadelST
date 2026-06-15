using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IOrderApprovalRepository : IBaseRepository<OrderApproval>
{
    Task<IReadOnlyList<OrderApproval>> GetBySiparisNoAsync(string siparisNo);

    /// <summary>
    /// Round-8 §11 — verilen siparişler için belirli bir onay türünün (ör.
    /// "MuhasebeOnaylandi") en güncel OnayTarih'ini toplu döner. Cari onay
    /// tarihini Fabrika listesine STarih'i bozmadan taşımak için kullanılır.
    /// </summary>
    Task<IReadOnlyDictionary<string, DateTime?>> GetApprovalDatesAsync(
        IReadOnlyCollection<string> siparisNolar, string onayDurumu);

    /// <summary>
    /// Paket 2 — DB'de `uk_siparis_kullanici(SiparisNo, KullaniciID)` unique
    /// constraint olduğu için INSERT ikinci kez aynı çift için patlıyordu.
    /// Var olan satırı UPDATE eder; yoksa INSERT atar. SaveChanges burada
    /// yapılmaz — çağıran servis kendi `SaveChangesAsync` ile commit eder.
    /// </summary>
    Task UpsertAsync(string siparisNo, int kullaniciID, string durum, string? aciklama);
}
