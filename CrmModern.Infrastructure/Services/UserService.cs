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
internal sealed class UserService(IUnitOfWork uow) : IUserService
{
    public async Task<IReadOnlyList<UserListDto>> GetAllAsync()
    {
        var users = await uow.Kullanicilar.GetAllAsync();
        return users
            .Select(ToDto)
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
        bool exists = await uow.Kullanicilar.KullaniciAdiExistsAsync(dto.KullaniciAdi);
        if (exists)
            throw new BusinessException($"Bu kullanıcı adı zaten kayıtlı: '{dto.KullaniciAdi}'.");

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

    public async Task DeleteAsync(int kullaniciId)
    {
        var entity = await uow.Kullanicilar.GetByIdAsync(kullaniciId)
            ?? throw new NotFoundException("Kullanici", kullaniciId);

        uow.Kullanicilar.Remove(entity);
        await uow.SaveChangesAsync();
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
        u.Email, u.Telefon, u.YetkiTuru, u.Durum);
}
