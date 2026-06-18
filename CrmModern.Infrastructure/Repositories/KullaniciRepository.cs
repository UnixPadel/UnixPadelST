using CrmModern.Core.Entities;
using CrmModern.Core.Interfaces.Repositories;
using CrmModern.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CrmModern.Infrastructure.Repositories;

internal sealed class KullaniciRepository(AppDbContext context)
    : BaseRepository<Kullanici>(context), IKullaniciRepository
{
    public async Task<Kullanici?> GetByKullaniciAdiAsync(string kullaniciAdi) =>
        await _dbSet.FirstOrDefaultAsync(k => k.KullaniciAdi == kullaniciAdi);

    /// <summary>
    /// Replicates original Form1 login query:
    /// SELECT * FROM KullaniciBilgileri WHERE KullaniciAdi = @k AND Sifre = @s
    /// </summary>
    public async Task<Kullanici?> GetByKullaniciAdiAndSifreAsync(string kullaniciAdi, string sifre) =>
        await _dbSet.FirstOrDefaultAsync(k => k.KullaniciAdi == kullaniciAdi && k.Sifre == sifre);

    public async Task<bool> KullaniciAdiExistsAsync(string kullaniciAdi) =>
        await _dbSet.AnyAsync(k => k.KullaniciAdi == kullaniciAdi);

    // §26 — Aktif kullanıcılar (Durum != 'Pasif'). Seçim/lookup/roster/arama
    // bağlamlarının merkezî kaynağı; pasif kullanıcılar hiçbir seçilebilir
    // listede görünmez. Tarihsel kayıtlar GetAllAsync ile çözülmeye devam eder.
    public async Task<IReadOnlyList<Kullanici>> GetActiveAsync() =>
        await _dbSet
            .AsNoTracking()
            .Where(k => k.Durum != "Pasif")
            .ToListAsync();

    public async Task<int> UpdateSifreAsync(int kullaniciID, string newSifre) =>
        await _context.KullaniciBilgileri
            .Where(k => k.KullaniciID == kullaniciID)
            .ExecuteUpdateAsync(s => s.SetProperty(k => k.Sifre, newSifre));

    public async Task<IReadOnlyList<Kullanici>> QuickFindAsync(string query, int limit)
    {
        var q = $"%{query}%";
        return await _context.KullaniciBilgileri
            .AsNoTracking()
            // §26 — pasif kullanıcılar global aramada da görünmez.
            .Where(k => k.Durum != "Pasif"
                     && (EF.Functions.Like(k.KullaniciAdi, q)
                     || EF.Functions.Like(k.Ad, q)
                     || EF.Functions.Like(k.Soyad, q)
                     || EF.Functions.Like(k.Email, q)))
            .OrderBy(k => k.KullaniciAdi)
            .Take(limit)
            .ToListAsync();
    }
}
