using CrmModern.Core.DTOs.User;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Business logic for the KullaniciYonet WinForms screen.
/// Create performs duplicate-username check (mirrors the WinForms check before INSERT).
///
/// PASSWORD STORAGE (Faz 8):
///   - Yeni hesaplar BCrypt hash ile yazılır.
///   - Eski plain-text satırlar AuthService.LoginAsync ilk login'de hash'lenir
///     (lazy migration). Sifre kolonu Faz 8'de varchar(255) yapıldı
///     (DatabaseSchemaMigrator).
/// </summary>
internal sealed class UserService(IUnitOfWork uow, IAuditService audit) : IUserService
{
    private const string AuditEntity = "Kullanici";

    public async Task<IReadOnlyList<UserListDto>> GetAllAsync(bool includeDeleted = false)
    {
        var users = await uow.Kullanicilar.GetAllAsync();
        return users
            // 40+ ergonomi K5 — silinen kullanıcılar yalnız "Silinenleri göster" ile.
            .Where(u => includeDeleted || !u.Silindi)
            .Select(ToDto)
            .ToList()
            .AsReadOnly();
    }

    // Slim lookup — Fabrika filter "Temsilci" dropdown'u için.
    // Tüm authenticated kullanıcılara açık (no role restriction in controller).
    // §26 — yalnız AKTİF kullanıcılar döner: pasif (ayrılan) personel hiçbir
    // dropdown/filtre/autocomplete'te görünmez. Tarihsel ad gösterimi ayrı
    // çözümleme map'leriyle (GetAllAsync) korunur.
    public async Task<IReadOnlyList<UserLookupDto>> GetLookupAsync()
    {
        var users = await uow.Kullanicilar.GetActiveAsync();
        return users
            .OrderBy(u => u.Ad).ThenBy(u => u.Soyad)
            .Select(u => new UserLookupDto(u.KullaniciID, u.Ad, u.Soyad, u.YetkiTuru))
            .ToList()
            .AsReadOnly();
    }

    public async Task<UserListDto> GetByIdAsync(int kullaniciId)
    {
        var entity = await uow.Kullanicilar.GetByIdAsync(kullaniciId)
            ?? throw new NotFoundException("Kullanici", kullaniciId);
        return ToDto(entity);
    }

    public async Task CreateAsync(CreateUserDto dto)
    {
        var existing = await uow.Kullanicilar.GetByKullaniciAdiAsync(dto.KullaniciAdi);
        // 40+ ergonomi K5 — ad silinmiş bir kullanıcıya aitse yenisi açılmaz; geri yüklenmeli.
        if (existing is { Silindi: true })
            throw new BusinessException(
                $"Bu kullanıcı adı silinmiş bir kullanıcıya ait: {dto.KullaniciAdi}. Silinenlerden geri yükle.",
                "userDeletedExists", new { username = dto.KullaniciAdi });
        if (existing is not null)
            throw new BusinessException($"Bu kullanıcı adı zaten var: {dto.KullaniciAdi}.", "usernameExists", new { username = dto.KullaniciAdi });

        var entity = new Kullanici
        {
            KullaniciAdi = dto.KullaniciAdi,
            Sifre        = BCrypt.Net.BCrypt.HashPassword(dto.Sifre),  // Faz 8 — yeni hesaplar her zaman hash
            Ad           = dto.Ad,
            Soyad        = dto.Soyad,
            Email        = dto.Email,
            Telefon      = dto.Telefon,
            YetkiTuru    = dto.YetkiTuru,
            Durum        = dto.Durum
        };

        await uow.Kullanicilar.AddAsync(entity);
        await uow.SaveChangesAsync();
    }

    public async Task UpdateAsync(int kullaniciId, UpdateUserDto dto)
    {
        var entity = await uow.Kullanicilar.GetByIdAsync(kullaniciId)
            ?? throw new NotFoundException("Kullanici", kullaniciId);

        entity.Ad        = dto.Ad;
        entity.Soyad     = dto.Soyad;
        entity.Email     = dto.Email;
        entity.Telefon   = dto.Telefon;
        entity.YetkiTuru = dto.YetkiTuru;
        entity.Durum     = dto.Durum;

        uow.Kullanicilar.Update(entity);
        await uow.SaveChangesAsync();
    }

    public async Task DeleteAsync(int kullaniciId, int silenKullaniciId)
    {
        var entity = await uow.Kullanicilar.GetByIdAsync(kullaniciId)
            ?? throw new NotFoundException("Kullanici", kullaniciId);
        if (entity.Silindi)
            throw new NotFoundException("Kullanici", kullaniciId);

        // 40+ ergonomi K5 — yumuşak silme: satır kalır (tarihsel ad çözümlemesi),
        // giriş ve seçim listeleri silinen kullanıcıyı dışlar.
        entity.Silindi          = true;
        entity.SilinmeTarihi    = DateTime.Now;
        entity.SilenKullaniciID = silenKullaniciId;
        uow.Kullanicilar.Update(entity);
        await uow.SaveChangesAsync();

        await audit.LogAsync("Delete", AuditEntity, kullaniciId.ToString(), silenKullaniciId, entity.KullaniciAdi);
    }

    public async Task RestoreAsync(int kullaniciId, int geriYukleyenKullaniciId)
    {
        var entity = await uow.Kullanicilar.GetByIdAsync(kullaniciId)
            ?? throw new NotFoundException("Kullanici", kullaniciId);
        if (!entity.Silindi)
            throw new BusinessException("Bu kullanıcı silinmemiş.", "userNotDeleted", new { username = entity.KullaniciAdi });

        entity.Silindi          = false;
        entity.SilinmeTarihi    = null;
        entity.SilenKullaniciID = null;
        uow.Kullanicilar.Update(entity);
        await uow.SaveChangesAsync();

        await audit.LogAsync("Restore", AuditEntity, kullaniciId.ToString(), geriYukleyenKullaniciId, entity.KullaniciAdi);
    }

    public async Task ChangePasswordAsync(int kullaniciId, string newPassword)
    {
        var entity = await uow.Kullanicilar.GetByIdAsync(kullaniciId)
            ?? throw new NotFoundException("Kullanici", kullaniciId);

        entity.Sifre = BCrypt.Net.BCrypt.HashPassword(newPassword);  // Faz 8 — her zaman bcrypt
        uow.Kullanicilar.Update(entity);
        await uow.SaveChangesAsync();
    }

    private static UserListDto ToDto(Kullanici u) => new(
        u.KullaniciID, u.KullaniciAdi, u.Ad, u.Soyad,
        u.Email, u.Telefon, u.YetkiTuru, u.Durum,
        u.Silindi, u.SilinmeTarihi);
}
