using CrmModern.Core.Entities;

namespace CrmModern.Core.Interfaces.Repositories;

public interface IKullaniciRepository : IBaseRepository<Kullanici>
{
    Task<Kullanici?> GetByKullaniciAdiAsync(string kullaniciAdi);

    /// <summary>
    /// Used by login: matches both username AND password in one query
    /// (preserves original Form1 logic — single SELECT with both params).
    /// </summary>
    Task<Kullanici?> GetByKullaniciAdiAndSifreAsync(string kullaniciAdi, string sifre);

    Task<bool> KullaniciAdiExistsAsync(string kullaniciAdi);

    /// <summary>
    /// §26 — Yalnız AKTİF kullanıcılar (Durum != 'Pasif'). Seçim bağlamlarının
    /// (dropdown/lookup/temsilci roster/arama) merkezî kaynağı. Pasif kullanıcılar
    /// (ayrılan personel) uygulamada hiçbir seçilebilir listede görünmez. NULL/boş/
    /// bilinmeyen durum 'aktif' sayılır (yalnız açıkça 'Pasif' gizlenir).
    /// Tarihsel ad çözümlemesi (sipariş sahibi vb.) GetAllAsync ile yapılır — onlar
    /// pasif kullanıcıyı KORUR ki eski kayıtlar adı göstermeye devam etsin.
    /// </summary>
    Task<IReadOnlyList<Kullanici>> GetActiveAsync();

    /// <summary>Faz 7 — Topbar global arama. KullaniciAdi/Ad/Soyad/Email üzerinde LIKE (yalnız Yonetici çağırır).</summary>
    Task<IReadOnlyList<Kullanici>> QuickFindAsync(string query, int limit);

    /// <summary>Faz 8 — Şifre kolonunu tek shot UPDATE eder; bcrypt lazy migration için.</summary>
    Task<int> UpdateSifreAsync(int kullaniciID, string newSifre);
}
