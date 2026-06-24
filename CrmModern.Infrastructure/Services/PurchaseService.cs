using CrmModern.Core.DTOs.Purchase;
using CrmModern.Core.Entities;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Faz 6: SatinAlmaForm + SatinAlimOnIzlemeForm + SatinAlmaTakipForm +
/// SatinAlmaOnayForm + SatinAlmaTumTalepForm portu.
/// 3-aşamalı onay zinciri + dinamik ödeme paneli + Rule 4.
/// </summary>
internal sealed class PurchaseService(IUnitOfWork uow) : IPurchaseService
{
    // OdemeTuru ComboBox seçenekleri (hard-coded, WinForms birebir)
    private static readonly string[] ValidOdemeTuru =
    {
        "Peşin", "Vadeli", "Mal Mukabili", "Çek / Senet",
        "Havale / EFT", "Kredi Kartı / Banka Kartı"
    };

    // ── Liste & detay ────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PurchaseRequestListDto>> GetByDepartmanAsync(string departman, bool isGozlemci)
    {
        IReadOnlyList<PurchaseRequest> list = isGozlemci
            ? (await uow.PurchaseRequests.GetAllAsync()).ToList().AsReadOnly()
            : await uow.PurchaseRequests.GetByDepartmanAsync(departman);
        return list.Select(MapList).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<PurchaseRequestListDto>> GetMyRequestsAsync(string kullaniciAdi)
    {
        var list = await uow.PurchaseRequests.GetByTalepEdenAsync(kullaniciAdi);
        return list.Select(MapList).ToList().AsReadOnly();
    }

    public async Task<PurchaseRequestPageDto> GetAllAsync(PurchaseRequestFilterDto f)
    {
        var rows = await uow.PurchaseRequests.SearchAsync(
            f.TalepEden, f.Departman, f.Durum, f.TalepTipi, f.BaslangicTarih, f.BitisTarih);

        int total = rows.Count;
        int page  = Math.Max(1, f.Page);
        int size  = Math.Clamp(f.PageSize, 1, 200);

        var items = rows.Skip((page - 1) * size).Take(size)
            .Select(MapList).ToList().AsReadOnly();
        return new PurchaseRequestPageDto(items, total, page, size);
    }

    public async Task<PurchaseRequestDetailDto> GetByIdAsync(int talepId)
    {
        var p = await uow.PurchaseRequests.GetByIdAsync(talepId)
            ?? throw new NotFoundException("PurchaseRequest", talepId);
        var kalemler = await uow.PurchaseRequests.GetLinesByTalepIdAsync(talepId);
        return MapDetail(p, kalemler);
    }

    public async Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingAsync()
    {
        var list = await uow.PurchaseRequests.GetPendingAsync();
        return list.Select(MapList).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<PurchaseRequestListDto>> GetHistoryAsync(int page, int pageSize)
    {
        var list = await uow.PurchaseRequests.GetHistoryAsync(page, pageSize);
        return list.Select(MapList).ToList().AsReadOnly();
    }

    // ── Aşama bazlı listeler ─────────────────────────────────────────────────

    public async Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingPreApprovalAsync()
    {
        // SatinAlimOnIzlemeForm WHERE: Durum IN ('Bekliyor','Onay Bekliyor') AND SatinAlma tipi
        var list = await uow.PurchaseRequests
            .GetByStatusesAsync(new[] { "Bekliyor", "Onay Bekliyor" }, "SatinAlma");
        return list.Select(MapList).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingPaymentAsync()
    {
        // SatinAlmaTakipForm bekleyen: SatinAlma + Durum IN ('Ön Onaylandı','Onay Bekliyor') + OdemeTuru IS NULL
        var list = await uow.PurchaseRequests
            .GetByStatusesAsync(new[] { "Ön Onaylandı", "Onay Bekliyor" }, "SatinAlma");
        var filtered = list.Where(p => string.IsNullOrEmpty(p.OdemeTuru)).ToList();
        return filtered.Select(MapList).ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<PurchaseRequestListDto>> GetPendingFinalApprovalAsync()
    {
        // SatinAlmaOnayForm dual source:
        //   (SatinAlma + Muhasebe Tamamlandı) OR (Muhasebe + Onay Bekliyor)
        var sa  = await uow.PurchaseRequests.GetByStatusesAsync(new[] { "Muhasebe Tamamlandı" }, "SatinAlma");
        var mh  = await uow.PurchaseRequests.GetByStatusesAsync(new[] { "Onay Bekliyor" }, "Muhasebe");
        var all = sa.Concat(mh).OrderByDescending(p => p.TalepID).ToList();
        return all.Select(MapList).ToList().AsReadOnly();
    }

    // ── Create ───────────────────────────────────────────────────────────────

    public async Task<int> CreateAsync(CreatePurchaseRequestDto dto)
    {
        // Round-9 §9 — kalem varsa genel toplam kalemlerden türetilir
        // (parent.UrunMaliyeti otorite olarak kalemlerin Toplam toplamı olur).
        var kalemler = dto.Kalemler ?? Array.Empty<CreatePurchaseRequestLineDto>();
        decimal grandTotal = kalemler.Count > 0 ? kalemler.Sum(k => k.Toplam) : dto.UrunMaliyeti;

        var entity = new PurchaseRequest
        {
            UrunAdi               = dto.UrunAdi,
            // §27 — SatinAlmaTalep.UrunTuru kolonu varchar(500) NOT NULL (default yok).
            // Round-9 çok-kalemli yeni form ayrı "Ürün Türü" alanı göndermez → dto.UrunTuru
            // null gelir → EF INSERT NULL yazar → MySqlException 1048 "Column 'UrunTuru'
            // cannot be null" → POST /api/purchase 500. Non-null bir değere düş: istemci
            // tür verdiyse onu, vermediyse ürün özetini (UrunAdi) kullan (legacy semantiğe
            // en yakın, her zaman non-null).
            UrunTuru              = string.IsNullOrWhiteSpace(dto.UrunTuru) ? dto.UrunAdi : dto.UrunTuru,
            UrunMaliyeti          = grandTotal,
            ParaBirimi            = dto.ParaBirimi,
            // AlinanYer da NOT NULL — istemci doğrulaması boş bırakmaz ama DTO nullable;
            // aynı 1048 sınıfı hataya düşmemek için non-null garanti.
            AlinanYer             = dto.AlinanYer ?? string.Empty,
            TalepEdenKullaniciAdi = dto.TalepEdenKullaniciAdi,
            Departman             = dto.Departman,
            TalepTarihi           = DateTime.Now,
            Durum                 = "Bekliyor",        // WinForms SatinAlmaForm INSERT default
            TalepTipi             = dto.TalepTipi ?? "SatinAlma",
            Notlar                = dto.Notlar,
            MusteriAdi            = dto.MusteriAdi,
            ToplamSiparis         = dto.ToplamSiparis,
            KaporaBakiyesi        = dto.KaporaBakiyesi,
            KalanBakiyeTalep      = dto.KalanBakiyeTalep,
            PesinYuzde            = dto.PesinYuzde,
            Maliyet               = dto.Maliyet,
            MaliyetDetayi         = dto.MaliyetDetayi,
            Kar                   = dto.Kar,
            SiparisNo             = dto.SiparisNo
        };
        await uow.PurchaseRequests.AddAsync(entity);
        await uow.SaveChangesAsync();   // entity.TalepID üretildi

        if (kalemler.Count > 0)
        {
            var lines = kalemler.Select(k => new PurchaseRequestLine
            {
                TalepID     = entity.TalepID,
                UrunAdi     = k.UrunAdi,
                Birim       = k.Birim,
                Miktar      = k.Miktar,
                BirimFiyat  = k.BirimFiyat,
                Toplam      = k.Toplam,
                Indirim     = k.Indirim,
                IndirimTipi = k.IndirimTipi,
                FiyatModu   = string.IsNullOrWhiteSpace(k.FiyatModu) ? "miktar" : k.FiyatModu,
            });
            await uow.PurchaseRequests.AddLinesAsync(lines);
            await uow.SaveChangesAsync();
        }

        return entity.TalepID;
    }

    // ── Ek dosya (SatinAlmaTalepEk) ──────────────────────────────────────────

    public async Task UploadAttachmentAsync(int talepId, string ad, string tip, byte[] veri, string? yukleyen)
    {
        // Talep var mı? (yetkisiz/yanlış id'ye yazma engeli)
        _ = await uow.PurchaseRequests.GetByIdAsync(talepId)
            ?? throw new NotFoundException("PurchaseRequest", talepId);

        // Talep başına tek ek: öncekini sil, yenisini ekle.
        await uow.PurchaseAttachments.DeleteByTalepAsync(talepId);
        await uow.PurchaseAttachments.AddAsync(new PurchaseAttachment
        {
            TalepID              = talepId,
            Ad                   = ad,
            Tip                  = tip,
            Veri                 = veri,
            Tarih                = DateTime.Now,
            YukleyenKullaniciAdi = yukleyen,
        });
        await uow.SaveChangesAsync();
    }

    public Task<PurchaseAttachmentInfoDto?> GetAttachmentInfoAsync(int talepId) =>
        uow.PurchaseAttachments.GetInfoByTalepAsync(talepId);

    public async Task<PurchaseAttachmentDataDto?> GetAttachmentAsync(int talepId)
    {
        var e = await uow.PurchaseAttachments.GetByTalepAsync(talepId);
        return e is null ? null : new PurchaseAttachmentDataDto(e.Veri, e.Ad, e.Tip);
    }

    public async Task DeleteAttachmentAsync(int talepId)
    {
        await uow.PurchaseAttachments.DeleteByTalepAsync(talepId);
        await uow.SaveChangesAsync();
    }

    // ── Aşama 1: Ön Onay ─────────────────────────────────────────────────────

    public async Task PreApproveAsync(int talepId, string currentUserName, string? aciklama)
    {
        var entity = await GetForStage(talepId, new[] { "Bekliyor", "Onay Bekliyor" });

        entity.Durum            = "Ön Onaylandı";
        entity.OnIzlemeYapan    = currentUserName;
        entity.OnIzlemeTarihi   = DateTime.Now;
        uow.PurchaseRequests.Update(entity);
        await uow.SaveChangesAsync();
        await LogApprovalAsync(talepId, "OnOnay", "Onaylandı", currentUserName, aciklama);
    }

    public async Task PreRejectAsync(int talepId, string currentUserName, string redNotu)
    {
        if (string.IsNullOrWhiteSpace(redNotu))
            throw new BusinessException("Red gerekçesi zorunlu.");

        var entity = await GetForStage(talepId, new[] { "Bekliyor", "Onay Bekliyor" });

        entity.Durum               = "Reddedildi";
        entity.RedNotu             = redNotu;
        entity.OnIzlemeYapan       = currentUserName;
        entity.OnIzlemeTarihi      = DateTime.Now;
        entity.IslemYapanKullanici = currentUserName;
        entity.IslemTarihi         = DateTime.Now;
        uow.PurchaseRequests.Update(entity);
        await uow.SaveChangesAsync();
        await LogApprovalAsync(talepId, "OnOnay", "Reddedildi", currentUserName, redNotu);
    }

    // ── Aşama 2: Muhasebe ödeme detayı ───────────────────────────────────────

    public async Task SetPaymentDetailsAsync(int talepId, SetPaymentDetailsDto dto, string currentUserName)
    {
        var entity = await GetForStage(talepId, new[] { "Ön Onaylandı", "Onay Bekliyor" });

        if (!string.IsNullOrEmpty(entity.OdemeTuru))
            throw new BusinessException($"Talep #{talepId} için ödeme detayı zaten girilmiş.");

        if (!ValidOdemeTuru.Contains(dto.OdemeTuru))
            throw new BusinessException($"Geçersiz OdemeTuru: '{dto.OdemeTuru}'. Geçerli: {string.Join(", ", ValidOdemeTuru)}");

        // Negatif tutar yasak
        decimal[] tutarlar = { dto.OdenenTutar ?? 0, dto.OdemeTutari ?? 0, dto.OdemeVadeTutari ?? 0 };
        if (tutarlar.Any(t => t < 0))
            throw new BusinessException("Negatif tutar girilemez.");

        ValidateDynamicPaymentFields(dto);

        entity.OdemeTuru              = dto.OdemeTuru;
        entity.OdenenTutar            = dto.OdenenTutar;
        entity.OdemeTutari            = dto.OdemeTutari;
        entity.OdemeVadeSuresi        = dto.OdemeVadeSuresi;
        entity.OdemeVadeTutari        = dto.OdemeVadeTutari;
        entity.OdemeVadeTarihi        = dto.OdemeVadeTarihi;
        entity.OdemeBelgeNo           = dto.OdemeBelgeNo;
        entity.OdemeBankaAdi          = dto.OdemeBankaAdi;
        entity.OdemeIslemTarihi       = dto.OdemeIslemTarihi;
        entity.OdemeKartTipi          = dto.OdemeKartTipi;
        entity.OdemeTaksitSayisi      = dto.OdemeTaksitSayisi;
        entity.OdemeAciklama          = dto.OdemeAciklama;
        entity.MuhasebeYapanKullanici = currentUserName;
        entity.MuhasebeTarihi         = DateTime.Now;
        entity.Durum                  = "Muhasebe Tamamlandı";

        uow.PurchaseRequests.Update(entity);
        await uow.SaveChangesAsync();
        await LogApprovalAsync(talepId, "OdemeDetay", "MuhasebeTamamlandı", currentUserName,
            $"OdemeTuru: {dto.OdemeTuru}");
    }

    // ── Aşama 3: Nihai Onay — RULE 4 ────────────────────────────────────────

    public async Task FinalApproveAsync(int talepId, string currentUserName, string? aciklama)
    {
        var entity = await GetForStage(
            talepId,
            new[] { "Muhasebe Tamamlandı", "Ön Onaylandı", "Onay Bekliyor" });

        // RULE 4: SatinAlma tipinde OdemeTuru IS NULL → BLOK
        var tipi = string.IsNullOrEmpty(entity.TalepTipi) ? "SatinAlma" : entity.TalepTipi;
        if (tipi == "SatinAlma" && string.IsNullOrWhiteSpace(entity.OdemeTuru))
            throw new BusinessException(
                "Satın Alma tipi talepler için ödeme bilgisi zorunludur. " +
                "Lütfen önce Muhasebe bölümü ödeme detayını girsin.");

        entity.Durum               = "Onaylandı";
        entity.IslemYapanKullanici = currentUserName;
        entity.IslemTarihi         = DateTime.Now;
        uow.PurchaseRequests.Update(entity);
        await uow.SaveChangesAsync();
        await LogApprovalAsync(talepId, "NihaiOnay", "Onaylandı", currentUserName, aciklama);
    }

    public async Task FinalRejectAsync(int talepId, string currentUserName, string redNotu)
    {
        if (string.IsNullOrWhiteSpace(redNotu))
            throw new BusinessException("Red gerekçesi zorunlu.");

        var entity = await GetForStage(
            talepId,
            new[] { "Muhasebe Tamamlandı", "Ön Onaylandı", "Onay Bekliyor" });

        entity.Durum               = "Reddedildi";
        entity.RedNotu             = redNotu;
        entity.IslemYapanKullanici = currentUserName;
        entity.IslemTarihi         = DateTime.Now;
        uow.PurchaseRequests.Update(entity);
        await uow.SaveChangesAsync();
        await LogApprovalAsync(talepId, "NihaiOnay", "Reddedildi", currentUserName, redNotu);
    }

    // ── PROMPT-v7 §2: Override onayı (elshan tek-tık) ────────────────────────

    public async Task OverrideApproveAsync(int talepId, string currentUserName, string? aciklama)
    {
        var entity = await uow.PurchaseRequests.GetByIdAsync(talepId)
            ?? throw new NotFoundException("PurchaseRequest", talepId);

        // Zaten onaylı → idempotent no-op (audit yazmadan çık).
        if (entity.Durum == "Onaylandı")
            return;

        // Reddedilmiş talep override edilemez — talep sahibi yeniden göndermeli.
        if (entity.Durum == "Reddedildi")
            throw new BusinessException(
                "Reddedilmiş talep override edilemez — talep sahibi yeniden göndermeli.");

        // Ara aşamaların hepsinden (Bekliyor/Onay Bekliyor/Ön Onaylandı/Muhasebe Tamamlandı)
        // doğrudan nihai onaya kısa devre. Ara alanlar (OdemeTuru vb.) NULL kalabilir.
        entity.Durum               = "Onaylandı";
        entity.IslemYapanKullanici = currentUserName;
        entity.IslemTarihi         = DateTime.Now;
        uow.PurchaseRequests.Update(entity);
        await uow.SaveChangesAsync();
        await LogApprovalAsync(talepId, "Override", "Onaylandı", currentUserName,
            aciklama ?? "Tüm aşamalar atlanarak onaylandı (override).");
    }

    // ── Faz 8.4 — TalepOnaylari log + history ────────────────────────────────

    public async Task<IReadOnlyList<PurchaseApprovalDto>> GetApprovalHistoryAsync(int talepId)
    {
        var rows = await uow.PurchaseApprovals.GetHistoryAsync(talepId);
        return rows.Select(r => new PurchaseApprovalDto(
            r.OnayID, r.TalepID, r.Asama, r.Durum, r.KullaniciAdi, r.Tarih, r.Not)).ToList();
    }

    private async Task LogApprovalAsync(int talepId, string asama, string durum,
                                        string kullanici, string? not)
    {
        try
        {
            await uow.PurchaseApprovals.AddLogAsync(new Core.Entities.PurchaseApproval
            {
                TalepID      = talepId,
                Asama        = asama,
                Durum        = durum,
                KullaniciAdi = kullanici,
                Tarih        = DateTime.Now,
                Not          = not
            });
        }
        catch
        {
            // Log persistence işin önünde durmasın; tabloda race condition vs olabilir.
        }
    }

    // ── Geriye uyum ──────────────────────────────────────────────────────────

    public async Task ApproveAsync(int talepId, string islemYapanKullanici)
    {
        int rows = await uow.PurchaseRequests.ApproveAsync(talepId, islemYapanKullanici, DateTime.Now);
        if (rows == 0)
        {
            var exists = await uow.PurchaseRequests.GetByIdAsync(talepId);
            if (exists is null) throw new NotFoundException("PurchaseRequest", talepId);
            throw new BusinessException($"Request {talepId} is not pending and cannot be approved.");
        }
    }

    public async Task RejectAsync(int talepId, string redNotu, string islemYapanKullanici)
    {
        if (string.IsNullOrWhiteSpace(redNotu)) throw new BusinessException("RedNotu cannot be empty.");
        int rows = await uow.PurchaseRequests.RejectAsync(talepId, redNotu, islemYapanKullanici, DateTime.Now);
        if (rows == 0)
        {
            var exists = await uow.PurchaseRequests.GetByIdAsync(talepId);
            if (exists is null) throw new NotFoundException("PurchaseRequest", talepId);
            throw new BusinessException($"Request {talepId} is not pending and cannot be rejected.");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<PurchaseRequest> GetForStage(int talepId, string[] allowedStatuses)
    {
        var entity = await uow.PurchaseRequests.GetByIdAsync(talepId)
            ?? throw new NotFoundException("PurchaseRequest", talepId);

        if (!allowedStatuses.Contains(entity.Durum))
            throw new BusinessException(
                $"Talep #{talepId} bu aşamada işlenemez (mevcut durum: '{entity.Durum}', " +
                $"beklenen: {string.Join('/', allowedStatuses)}).");

        return entity;
    }

    private static void ValidateDynamicPaymentFields(SetPaymentDetailsDto dto)
    {
        switch (dto.OdemeTuru)
        {
            case "Peşin":
                if (dto.OdenenTutar      is null) throw new BusinessException("Peşin: OdenenTutar zorunlu.");
                if (dto.OdemeIslemTarihi is null) throw new BusinessException("Peşin: OdemeIslemTarihi zorunlu.");
                break;
            case "Vadeli":
                if (dto.OdenenTutar       is null) throw new BusinessException("Vadeli: OdenenTutar zorunlu.");
                if (string.IsNullOrWhiteSpace(dto.OdemeVadeSuresi)) throw new BusinessException("Vadeli: OdemeVadeSuresi zorunlu.");
                if (dto.OdemeVadeTutari   is null) throw new BusinessException("Vadeli: OdemeVadeTutari zorunlu.");
                break;
            case "Mal Mukabili":
                if (dto.OdenenTutar is null) throw new BusinessException("Mal Mukabili: OdenenTutar zorunlu.");
                if (string.IsNullOrWhiteSpace(dto.OdemeAciklama)) throw new BusinessException("Mal Mukabili: OdemeAciklama zorunlu.");
                break;
            case "Çek / Senet":
                if (dto.OdemeTutari is null) throw new BusinessException("Çek/Senet: OdemeTutari zorunlu.");
                if (string.IsNullOrWhiteSpace(dto.OdemeBelgeNo)) throw new BusinessException("Çek/Senet: OdemeBelgeNo zorunlu.");
                if (dto.OdemeVadeTarihi is null) throw new BusinessException("Çek/Senet: OdemeVadeTarihi zorunlu.");
                break;
            case "Havale / EFT":
                if (dto.OdemeTutari is null) throw new BusinessException("Havale/EFT: OdemeTutari zorunlu.");
                if (string.IsNullOrWhiteSpace(dto.OdemeBankaAdi)) throw new BusinessException("Havale/EFT: OdemeBankaAdi zorunlu.");
                if (dto.OdemeIslemTarihi is null) throw new BusinessException("Havale/EFT: OdemeIslemTarihi zorunlu.");
                break;
            case "Kredi Kartı / Banka Kartı":
                if (dto.OdemeTutari is null) throw new BusinessException("Kart: OdemeTutari zorunlu.");
                if (string.IsNullOrWhiteSpace(dto.OdemeKartTipi)) throw new BusinessException("Kart: OdemeKartTipi zorunlu.");
                break;
        }
    }

    private static PurchaseRequestListDto MapList(PurchaseRequest p) =>
        new(p.TalepID, p.UrunAdi, p.UrunTuru, p.UrunMaliyeti, p.AlinanYer,
            p.TalepEdenKullaniciAdi, p.Departman, p.TalepTarihi, p.Durum,
            p.RedNotu, p.IslemYapanKullanici, p.IslemTarihi, p.TalepTipi,
            p.MusteriAdi, p.ToplamSiparis, p.KaporaBakiyesi, p.KalanBakiyeTalep,
            p.PesinYuzde, p.Maliyet, p.MaliyetDetayi, p.Kar, p.SiparisNo, p.ParaBirimi);

    private static PurchaseRequestDetailDto MapDetail(
        PurchaseRequest p, IReadOnlyList<PurchaseRequestLine>? kalemler = null) =>
        new(p.TalepID, p.UrunAdi, p.UrunTuru, p.UrunMaliyeti, p.AlinanYer, p.Notlar,
            p.TalepEdenKullaniciAdi, p.Departman, p.TalepTarihi, p.Durum, p.RedNotu, p.TalepTipi,
            p.OnIzlemeYapan, p.OnIzlemeTarihi,
            p.OdemeTuru, p.OdenenTutar, p.OdemeTutari, p.OdemeVadeSuresi, p.OdemeVadeTutari,
            p.OdemeVadeTarihi, p.OdemeBelgeNo, p.OdemeBankaAdi, p.OdemeIslemTarihi,
            p.OdemeKartTipi, p.OdemeTaksitSayisi, p.OdemeAciklama,
            p.MuhasebeYapanKullanici, p.MuhasebeTarihi,
            p.MusteriAdi, p.ToplamSiparis, p.KaporaBakiyesi, p.KalanBakiyeTalep,
            p.PesinYuzde, p.Maliyet, p.MaliyetDetayi, p.Kar, p.SiparisNo,
            p.IslemYapanKullanici, p.IslemTarihi,
            (kalemler ?? Array.Empty<PurchaseRequestLine>())
                .Select(k => new PurchaseRequestLineDto(
                    k.KalemID, k.UrunAdi, k.Birim, k.Miktar, k.BirimFiyat,
                    k.Toplam, k.Indirim, k.IndirimTipi, k.FiyatModu))
                .ToList(),
            p.ParaBirimi);
}
