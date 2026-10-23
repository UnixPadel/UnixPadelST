using CrmModern.Core.DTOs.Musteri;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

internal sealed class MusteriService(IUnitOfWork unitOfWork) : IMusteriService
{
    public async Task<IEnumerable<MusteriDto>> GetAllAsync(int currentUserId, string role)
    {
        var list = await unitOfWork.Musteriler.GetAllWithUlkeAsync();

        // PROMPT-v2 §7: Temsilci yalnız kendi yarattığı müşterileri görür.
        // Diğer roller (Yonetici, Muhasebe, Gozlemci, Fabrika, Lojistik) tüm
        // listeyi görür. NULL CreatedByKullaniciID olan geçmiş kayıtlar
        // Temsilci'ye gizlenir (sahiplik belirlenemeyen kayıtlar).
        if (role == "Temsilci")
            list = list.Where(m => m.CreatedByKullaniciID == currentUserId);

        return list.Select(ToDto);
    }

    public async Task<MusteriDto> GetByIdAsync(int id)
    {
        var musteri = await unitOfWork.Musteriler.GetByIdAsync(id)
            ?? throw new NotFoundException(nameof(Musteri), id);
        return ToDto(musteri);
    }

    public async Task<MusteriDto> CreateAsync(CreateMusteriDto dto, int currentUserId)
    {
        // Replicates: SELECT COUNT(*) FROM MusteriBilgileri WHERE MusteriAd = @MusteriAd
        if (await unitOfWork.Musteriler.MusteriAdExistsAsync(dto.MusteriAd))
            throw new BusinessException("Bu müşteri adı zaten var.", "customerExists");

        var ulke = await unitOfWork.Ulkeler.GetByIdAsync(dto.UlkelerID)
            ?? throw new NotFoundException(nameof(Ulke), dto.UlkelerID);

        var musteri = new Musteri
        {
            MusteriAd            = dto.MusteriAd,
            Telefon              = dto.Telefon,
            ZipKod               = dto.ZipKod,
            E_Mail               = dto.E_Mail,
            Adres                = dto.Adres,
            VATNumarasi          = dto.VATNumarasi,
            UlkelerID            = dto.UlkelerID,
            // PROMPT-v2 §7: Sahiplik damgası — Temsilci listesini bu kolon belirler.
            CreatedByKullaniciID = currentUserId
        };

        await unitOfWork.Musteriler.AddAsync(musteri);
        await unitOfWork.SaveChangesAsync();

        musteri.Ulke = ulke;
        return ToDto(musteri);
    }

    public async Task<MusteriDto> UpdateAsync(int id, UpdateMusteriDto dto)
    {
        var musteri = await unitOfWork.Musteriler.GetByIdAsync(id)
            ?? throw new NotFoundException(nameof(Musteri), id);

        // İsim değiştiyse uniqueness kontrolü (WinForms davranışıyla aynı çatı altında)
        if (!string.Equals(musteri.MusteriAd, dto.MusteriAd, StringComparison.Ordinal)
            && await unitOfWork.Musteriler.MusteriAdExistsAsync(dto.MusteriAd))
            throw new BusinessException("Bu müşteri adı zaten var.", "customerExists");

        var ulke = await unitOfWork.Ulkeler.GetByIdAsync(dto.UlkelerID)
            ?? throw new NotFoundException(nameof(Ulke), dto.UlkelerID);

        musteri.MusteriAd   = dto.MusteriAd;
        musteri.Telefon     = dto.Telefon;
        musteri.ZipKod      = dto.ZipKod;
        musteri.E_Mail      = dto.E_Mail;
        musteri.Adres       = dto.Adres;
        musteri.VATNumarasi = dto.VATNumarasi;
        musteri.UlkelerID   = dto.UlkelerID;
        musteri.Ulke        = ulke;

        unitOfWork.Musteriler.Update(musteri);
        await unitOfWork.SaveChangesAsync();
        return ToDto(musteri);
    }

    public async Task DeleteAsync(int id)
    {
        var musteri = await unitOfWork.Musteriler.GetByIdAsync(id)
            ?? throw new NotFoundException(nameof(Musteri), id);

        // Round-8 §10 — siparişi olan müşteri silinemez (yetim sipariş riski).
        bool hasOrders = await unitOfWork.Orders.AnyByCustomerAsync(musteri.MusteriID, musteri.MusteriAd);
        if (hasOrders)
            throw new BusinessException("Bu müşterinin sipariş ya da teklifleri var, silinemez.", "customerHasOrders");

        unitOfWork.Musteriler.Remove(musteri);
        await unitOfWork.SaveChangesAsync();
    }

    public async Task<IEnumerable<UlkeDto>> GetUlkelerAsync()
    {
        var ulkeler = await unitOfWork.Ulkeler.GetAllAsync();
        return ulkeler
            .OrderBy(u => u.UlkeAdi)
            .Select(u => new UlkeDto(u.UlkelerID, u.UlkeAdi, u.NumaraBirimi, u.Bolge));
    }

    public async Task<UlkeDto> CreateUlkeAsync(CreateUlkeDto dto)
    {
        // Replicates: INSERT ... WHERE NOT EXISTS (SELECT 1 ... WHERE UlkeAdi = @UlkeAdi)
        if (await unitOfWork.Ulkeler.UlkeAdExistsAsync(dto.UlkeAdi))
            throw new BusinessException("Bu ülke zaten var.", "countryExists");

        var ulke = new Ulke
        {
            UlkeAdi      = dto.UlkeAdi,
            NumaraBirimi = dto.NumaraBirimi
        };

        await unitOfWork.Ulkeler.AddAsync(ulke);
        await unitOfWork.SaveChangesAsync();

        return new UlkeDto(ulke.UlkelerID, ulke.UlkeAdi, ulke.NumaraBirimi, ulke.Bolge);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static MusteriDto ToDto(Musteri m) => new(
        MusteriID   : m.MusteriID,
        MusteriAd   : m.MusteriAd,
        Telefon     : m.Telefon,
        ZipKod      : m.ZipKod,
        E_Mail      : m.E_Mail,
        Adres       : m.Adres,
        VATNumarasi : m.VATNumarasi,
        UlkelerID   : m.UlkelerID,
        UlkeAdi     : m.Ulke?.UlkeAdi     ?? string.Empty,
        Bolge       : m.Ulke?.Bolge
    );
}
