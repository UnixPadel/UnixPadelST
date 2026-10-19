using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CrmModern.Infrastructure.Persistence;

/// <summary>
/// Faz 8 — Idempotent şema bakım runner'ı.
///
/// WinForms `SatinAlmaMigrations.cs` ile aynı felsefe: yeni şema üretmiyor,
/// var olan kolonları (şart koşulup koşulmadığını INFORMATION_SCHEMA'dan
/// kontrol ederek) güvenli şekilde büyütüyor. EF Migrations DEVRE DIŞI —
/// production DB'de migrations history tablosu YOK.
///
/// Çalışmalar:
///   1. `KullaniciBilgileri.Sifre` varchar(25) → varchar(255)  (BCrypt hash için)
///
/// Her çalıştırma idempotenttir: kolon zaten 255 ise hiçbir şey yapmaz.
/// </summary>
public static class DatabaseSchemaMigrator
{
    public static async Task ApplyAsync(IServiceProvider services, ILogger? logger = null)
    {
        using var scope = services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var conn = ctx.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        // 1) Sifre kolonu büyüt
        await EnsureSifreColumnSizeAsync(ctx, logger);

        // 2) EklemeGecmisi: stok-only tablodan genel audit log'a evrilt
        await EnsureEklemeGecmisiAuditColumnsAsync(ctx, logger);

        // 3) TalepOnaylari (Faz 8.4): yoksa CREATE et — audit log
        await EnsureTalepOnaylariTableAsync(ctx, logger);

        // 3b) Round-9 §9: SatinAlmaTalepKalem — çok kalemli satın alma talebi.
        // Additive: parent SatinAlmaTalep değişmez, eski talepler kalemsiz çalışır.
        await EnsureSatinAlmaTalepKalemTableAsync(ctx, logger);

        // 3c) Round-11 §9: SatinAlmaTalep.ParaBirimi — belge düzeyinde para birimi.
        // Additive + nullable: eski talepler NULL (UI varsayılan/'—' gösterir).
        await EnsureColumnAsync(ctx, logger,
            table: "SatinAlmaTalep",
            column: "ParaBirimi",
            ddl: "ALTER TABLE SatinAlmaTalep ADD COLUMN ParaBirimi VARCHAR(8) NULL");

        // 4) PROMPT-v2 §7: MusteriBilgileri.CreatedByKullaniciID + tek seferlik backfill.
        await EnsureMusteriCreatedByColumnAsync(ctx, logger);

        // 5) PROMPT-v4 §5.5: SiparisAlTablo.KontrolNot — legacy Kontrol formu yazıyor,
        // canlı DB'de büyük ihtimalle var; yoksa eklenir (idempotent).
        await EnsureColumnAsync(ctx, logger,
            table: "SiparisAlTablo",
            column: "KontrolNot",
            ddl: "ALTER TABLE SiparisAlTablo ADD COLUMN KontrolNot TEXT NULL");

        // 6) PROMPT-v6 §1.1: SiparisAlTablo.LojistikOnay — Burcu lojistik onay gate'i.
        // NULL = eski kayıt (gate uygulanmaz) | 'Bekliyor' | 'Onay'.
        await EnsureLojistikOnayColumnAsync(ctx, logger);

        // 7) Round-8 §7: Kontrol onayından önce sipariş düzenleme/silme audit'i.
        // Tümü additive + NOT NULL DEFAULT 0 / NULL — mevcut satırlar default alır.
        await EnsureColumnAsync(ctx, logger,
            table: "SiparisAlTablo", column: "Silindi",
            ddl: "ALTER TABLE SiparisAlTablo ADD COLUMN Silindi TINYINT(1) NOT NULL DEFAULT 0");
        await EnsureColumnAsync(ctx, logger,
            table: "SiparisAlTablo", column: "Guncellendi",
            ddl: "ALTER TABLE SiparisAlTablo ADD COLUMN Guncellendi TINYINT(1) NOT NULL DEFAULT 0");
        await EnsureColumnAsync(ctx, logger,
            table: "SiparisAlTablo", column: "DegisiklikGerekce",
            ddl: "ALTER TABLE SiparisAlTablo ADD COLUMN DegisiklikGerekce TEXT NULL");
        await EnsureColumnAsync(ctx, logger,
            table: "SiparisAlTablo", column: "DegisiklikKullaniciID",
            ddl: "ALTER TABLE SiparisAlTablo ADD COLUMN DegisiklikKullaniciID INT NULL");
        await EnsureColumnAsync(ctx, logger,
            table: "SiparisAlTablo", column: "DegisiklikTarihi",
            ddl: "ALTER TABLE SiparisAlTablo ADD COLUMN DegisiklikTarihi DATETIME NULL");

        // 8) §16 — SiparisAlTablo.SiparisMiTeklifMi aşama kolonunu genişlet.
        await EnsureSiparisMiTeklifMiWidenedAsync(ctx, logger);

        // 9) Lojistik teklif akışı — LojistikTeklifTablo (yoksa CREATE).
        await EnsureLojistikTeklifTableAsync(ctx, logger);

        // 10) Satın alma ek dosyaları — SatinAlmaTalepEk (yoksa CREATE).
        await EnsureSatinAlmaTalepEkTableAsync(ctx, logger);

        // 11) Muhasebe ekstra maliyet kalemleri — SiparisEkMaliyet (yoksa CREATE).
        // Additive: sipariş çekirdek kalemleri (SiparisIslemTablo) değişmez.
        await EnsureSiparisEkMaliyetTableAsync(ctx, logger);

        // 12) §17 — SiparisOnaylari.OnayDurumu varchar(20) → varchar(40).
        await EnsureOnayDurumuWidenedAsync(ctx, logger);

        // 13a) BilesenBilgileri.Currency — bileşen fiyatının para birimi (Excel reçeteleri TL).
        // Legacy şemada var; yoksa eklenir. Sipariş ekranı fiyatı bu birimden siparişin
        // Para Tipi'ne TCMB kuruyla çevirir.
        await EnsureColumnAsync(ctx, logger,
            "BilesenBilgileri", "Currency",
            "ALTER TABLE BilesenBilgileri ADD COLUMN Currency ENUM('EUR','USD','TRY') NOT NULL DEFAULT 'TRY'");

        // 13) Excel reçeteleri — 4 kategori: Panoramic Padel Court, Full Panoramic Court,
        // Padbol, Standard Padel Court. Her birinin ÇELİK + CİVATA sayfaları BilesenBilgileri'ne
        // "Türkçe Ad / English Name" biçiminde işlenir; kategorinin KategoriBilesenleri reçetesi
        // YALNIZ bu kalemlerden oluşur (eski genel bileşenler reçeteden çıkar). Fiyatlar Excel'de
        // yazıldığı gibi, kategori başına ayrı (aynı adlı kalem farklı fiyatla ayrı satır).
        // Başka hiçbir kategoriye dokunulmaz.
        // Şema: Fiyat int → decimal(10,2), Birim ENUM +Paket/Rulo.
        await EnsurePanoramicBomSeedAsync(ctx, logger);
        await EnsureOtherExcelBomSeedsAsync(ctx, logger);
    }

    /// <summary>
    /// §17 — `SiparisOnaylari.OnayDurumu` canlı DB'de varchar(20). Lojistik teklif
    /// akışının audit türleri bu sınırı aşıyor: 'LojistikTeklifOnaylandi' (23) ve
    /// 'LojistikTeklifReddedildi' (24). STRICT_TRANS_TABLES altında fazla uzun değer
    /// kırpılmaz, hard error verir ("Data too long for column 'OnayDurumu'") →
    /// `POST /api/logistics/offers/{id}/approve` ve `/reject` 500 dönüyordu.
    /// Kolonu VARCHAR(40) yapmak mevcut değerleri aynen korur (widening) ve
    /// gelecekteki audit türlerinde aynı tuzağı ortadan kaldırır.
    /// Idempotent: kolon zaten varchar(&gt;=40) ise dokunmaz.
    /// </summary>
    private static async Task EnsureOnayDurumuWidenedAsync(AppDbContext ctx, ILogger? logger)
    {
        var conn = ctx.Database.GetDbConnection();
        string? dataType;
        long maxLen;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText =
                @"SELECT DATA_TYPE, COALESCE(CHARACTER_MAXIMUM_LENGTH, 0)
                  FROM INFORMATION_SCHEMA.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME   = 'SiparisOnaylari'
                    AND COLUMN_NAME  = 'OnayDurumu'
                  LIMIT 1";
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();
            await using var r = await cmd.ExecuteReaderAsync();
            if (!await r.ReadAsync())
            {
                logger?.LogWarning("SiparisOnaylari.OnayDurumu kolonu bulunamadı — şema migrator atlandı.");
                return;
            }
            dataType = r.GetValue(0)?.ToString()?.ToLowerInvariant();
            maxLen   = Convert.ToInt64(r.GetValue(1));
        }

        if (dataType == "varchar" && maxLen >= 40)
        {
            logger?.LogInformation("SiparisOnaylari.OnayDurumu zaten varchar({Len}); ALTER atlandı.", maxLen);
            return;
        }

        logger?.LogInformation(
            "SiparisOnaylari.OnayDurumu ({Type}/{Len}) → VARCHAR(40) yapılıyor (§17 — lojistik teklif audit türleri için).",
            dataType, maxLen);
        await ctx.Database.ExecuteSqlRawAsync(
            "ALTER TABLE SiparisOnaylari MODIFY COLUMN OnayDurumu VARCHAR(40) NOT NULL");
        logger?.LogInformation("SiparisOnaylari.OnayDurumu VARCHAR(40) yapıldı (§17 fix).");
    }

    /// <summary>
    /// Muhasebe tarafından sipariş/teklife eklenen ekstra maliyet kalemleri
    /// (açıklama + tutar). Her kalem proformada ayrı satır olur ve tutarı sipariş
    /// toplamına eklenir. CREATE IF NOT EXISTS → idempotent.
    /// </summary>
    private static async Task EnsureSiparisEkMaliyetTableAsync(AppDbContext ctx, ILogger? logger)
    {
        await ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS SiparisEkMaliyet (
                EkMaliyetID   INT           NOT NULL AUTO_INCREMENT,
                SiparisAlID   INT           NOT NULL,
                Aciklama      VARCHAR(500)  NOT NULL,
                Tutar         DECIMAL(10,2) NOT NULL,
                EklenmeTarihi DATETIME      NOT NULL,
                KullaniciID   INT           NULL,
                PRIMARY KEY (EkMaliyetID),
                INDEX IX_SiparisEkMaliyet_SiparisAlID (SiparisAlID)
            )");
        logger?.LogInformation("SiparisEkMaliyet tablosu hazırlandı (CREATE IF NOT EXISTS).");
    }

    /// <summary>
    /// Satın alma talebine eklenen dosyalar. Blob ayrı tabloda; ana SatinAlmaTalep
    /// sorguları (liste/aşama) blob yüklemez. CREATE IF NOT EXISTS → idempotent.
    /// </summary>
    private static async Task EnsureSatinAlmaTalepEkTableAsync(AppDbContext ctx, ILogger? logger)
    {
        await ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS SatinAlmaTalepEk (
                EkID                 INT            NOT NULL AUTO_INCREMENT,
                TalepID              INT            NOT NULL,
                Ad                   VARCHAR(255)   NOT NULL,
                Tip                  VARCHAR(150)   NOT NULL,
                Veri                 LONGBLOB       NOT NULL,
                Tarih                DATETIME       NOT NULL,
                YukleyenKullaniciAdi VARCHAR(200)   NULL,
                PRIMARY KEY (EkID),
                INDEX IX_SatinAlmaTalepEk_TalepID (TalepID)
            )");
        logger?.LogInformation("SatinAlmaTalepEk tablosu hazırlandı (CREATE IF NOT EXISTS).");
    }

    /// <summary>
    /// Lojistik teklif akışı — sipariş üretimdeyken lojistik firmalardan teklif
    /// toplanır, Yönetici birini onaylar. Mevcut LojistikTablo (sevk) ile karışmaz.
    /// CREATE IF NOT EXISTS → idempotent; tablo varsa dokunmaz.
    /// </summary>
    private static async Task EnsureLojistikTeklifTableAsync(AppDbContext ctx, ILogger? logger)
    {
        await ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS LojistikTeklifTablo (
                TeklifID        INT            NOT NULL AUTO_INCREMENT,
                SiparisNo       VARCHAR(50)    NOT NULL,
                KullaniciID     INT            NOT NULL,
                FirmaAdi        VARCHAR(255)   NOT NULL,
                LojistikCesit   VARCHAR(64)    NOT NULL,
                Fiyat           DECIMAL(18,2)  NOT NULL,
                ParaBirimi      VARCHAR(16)    NULL,
                Aciklama        TEXT           NULL,
                Durum           VARCHAR(16)    NOT NULL DEFAULT 'Beklemede',
                OlusturmaTarihi DATETIME       NOT NULL,
                OnayKullaniciID INT            NULL,
                OnayTarihi      DATETIME       NULL,
                RedNotu         TEXT           NULL,
                PRIMARY KEY (TeklifID),
                INDEX IX_LojistikTeklif_SiparisNo (SiparisNo)
            )");
        logger?.LogInformation("LojistikTeklifTablo tablosu hazırlandı (CREATE IF NOT EXISTS).");

        // RedNotu kolonu — bu kolondan önce oluşturulmuş tablolar için additive ALTER
        // (CREATE IF NOT EXISTS mevcut tabloya kolon eklemez). Yönetici red açıklaması.
        await EnsureColumnAsync(ctx, logger,
            table: "LojistikTeklifTablo", column: "RedNotu",
            ddl: "ALTER TABLE LojistikTeklifTablo ADD COLUMN RedNotu TEXT NULL");

        await EnsureColumnAsync(ctx, logger,
            table: "LojistikTeklifTablo", column: "ParaBirimi",
            ddl: "ALTER TABLE LojistikTeklifTablo ADD COLUMN ParaBirimi VARCHAR(16) NULL");
    }

    /// <summary>
    /// §16 — Lojistik "Sevki Tamamla" 500 hatasının kök nedeni: SiparisMiTeklifMi
    /// kolonu canlı DB'de ENUM('Teklif','Siparis','Planlama','Uretim','Hazir',
    /// 'Lojistik','Tamamlandi','Iptal') olarak tanımlı; Round-9 §19'da eklenen
    /// 'TamamlanmaBekliyor' (18 karakter) bu enum listesinde YOK. STRICT_TRANS_TABLES
    /// altında geçersiz enum değeri yazmak hard error verir
    /// ("Data truncated for column 'SiparisMiTeklifMi'") → CompleteShipment 500.
    /// EF modeli kolonu zaten HasMaxLength(20) (varchar) sayıyor; kolonu VARCHAR(20)'ye
    /// çevirerek (a) 500'ü gideriyoruz, (b) EF modeliyle DB'yi hizalıyoruz,
    /// (c) gelecekteki aşama eklemelerinde aynı enum tuzağını ortadan kaldırıyoruz.
    /// Idempotent: kolon zaten varchar(&gt;=20) ise dokunmaz. ENUM→VARCHAR dönüşümü
    /// mevcut satır değerlerini etiketleriyle birebir korur (veri kaybı yok).
    /// </summary>
    private static async Task EnsureSiparisMiTeklifMiWidenedAsync(AppDbContext ctx, ILogger? logger)
    {
        var conn = ctx.Database.GetDbConnection();
        string? dataType;
        long maxLen;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText =
                @"SELECT DATA_TYPE, COALESCE(CHARACTER_MAXIMUM_LENGTH, 0)
                  FROM INFORMATION_SCHEMA.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME   = 'SiparisAlTablo'
                    AND COLUMN_NAME  = 'SiparisMiTeklifMi'
                  LIMIT 1";
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();
            await using var r = await cmd.ExecuteReaderAsync();
            if (!await r.ReadAsync())
            {
                logger?.LogWarning("SiparisAlTablo.SiparisMiTeklifMi kolonu bulunamadı — şema migrator atlandı.");
                return;
            }
            dataType = r.GetValue(0)?.ToString()?.ToLowerInvariant();
            maxLen   = Convert.ToInt64(r.GetValue(1));
        }

        if (dataType == "varchar" && maxLen >= 20)
        {
            logger?.LogInformation("SiparisAlTablo.SiparisMiTeklifMi zaten varchar({Len}); ALTER atlandı.", maxLen);
            return;
        }

        logger?.LogInformation(
            "SiparisAlTablo.SiparisMiTeklifMi ({Type}) → VARCHAR(20) yapılıyor (§16 — 'TamamlanmaBekliyor' aşaması için).",
            dataType);
        await ctx.Database.ExecuteSqlRawAsync(
            "ALTER TABLE SiparisAlTablo MODIFY COLUMN SiparisMiTeklifMi VARCHAR(20) NULL");
        logger?.LogInformation("SiparisAlTablo.SiparisMiTeklifMi VARCHAR(20) yapıldı (§16 fix).");
    }

    /// <summary>
    /// PROMPT-v6 §1.1 — LojistikOnay kolonu + geriye uyum backfill'i: kolon İLK
    /// eklendiğinde, o anda zaten Hazir + Kontrol='Onay' bekleyen kayıtlara
    /// 'Onay' yazılır ki lojistik kuyruğundan kaybolmasınlar. Sonraki
    /// çalıştırmalarda (kolon zaten varsa) hiçbir şey yapılmaz — MarkReady
    /// yeni Hazir kayıtlarını 'Bekliyor' ile işaretler.
    /// </summary>
    private static async Task EnsureLojistikOnayColumnAsync(AppDbContext ctx, ILogger? logger)
    {
        if (await ColumnExistsAsync(ctx, "SiparisAlTablo", "LojistikOnay"))
        {
            logger?.LogInformation("SiparisAlTablo.LojistikOnay kolonu zaten var; atlandı.");
            return;
        }

        await ctx.Database.ExecuteSqlRawAsync(
            "ALTER TABLE SiparisAlTablo ADD COLUMN LojistikOnay VARCHAR(16) NULL");
        logger?.LogInformation("SiparisAlTablo.LojistikOnay kolonu eklendi.");

        int affected = await ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE SiparisAlTablo
            SET LojistikOnay = 'Onay'
            WHERE SiparisMiTeklifMi = 'Hazir' AND Kontrol = 'Onay'");
        if (affected > 0)
            logger?.LogInformation(
                "LojistikOnay backfill: migration anında Hazir bekleyen {N} kayıt 'Onay' yapıldı.", affected);
    }

    private static async Task EnsureSifreColumnSizeAsync(AppDbContext ctx, ILogger? logger)
    {
        const string check =
            @"SELECT CHARACTER_MAXIMUM_LENGTH
              FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME   = 'KullaniciBilgileri'
                AND COLUMN_NAME  = 'Sifre'
              LIMIT 1";

        var conn = ctx.Database.GetDbConnection();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = check;
            var result = await cmd.ExecuteScalarAsync();
            if (result is null || result is DBNull)
            {
                logger?.LogWarning("KullaniciBilgileri.Sifre kolonu bulunamadı — şema migrator atlandı.");
                return;
            }

            long current = Convert.ToInt64(result);
            if (current >= 255)
            {
                logger?.LogInformation("KullaniciBilgileri.Sifre kolonu zaten varchar({Size}); ALTER atlandı.", current);
                return;
            }

            logger?.LogInformation("KullaniciBilgileri.Sifre varchar({Size}) → varchar(255) yapılıyor (bcrypt hash için).", current);
        }

        await ctx.Database.ExecuteSqlRawAsync(
            "ALTER TABLE KullaniciBilgileri MODIFY COLUMN Sifre VARCHAR(255) NOT NULL");
        logger?.LogInformation("KullaniciBilgileri.Sifre kolonu varchar(255)'e büyütüldü.");
    }

    private static async Task EnsureEklemeGecmisiAuditColumnsAsync(AppDbContext ctx, ILogger? logger)
    {
        // Faz 8.3 — Audit log için 4 kolon: Action, EntityType, EntityId, Details(uzun).
        // EklemeGecmisi WinForms'ta yalnız stok ekleme için kullanıldı; modern API'de
        // genel audit log'a evrilteceğiz. KategoriID + Miktar nullable kalmalı.
        await EnsureColumnAsync(ctx, logger,
            table: "EklemeGecmisi",
            column: "Action",
            ddl: "ALTER TABLE EklemeGecmisi ADD COLUMN Action VARCHAR(64) NULL");

        await EnsureColumnAsync(ctx, logger,
            table: "EklemeGecmisi",
            column: "EntityType",
            ddl: "ALTER TABLE EklemeGecmisi ADD COLUMN EntityType VARCHAR(64) NULL");

        await EnsureColumnAsync(ctx, logger,
            table: "EklemeGecmisi",
            column: "EntityId",
            ddl: "ALTER TABLE EklemeGecmisi ADD COLUMN EntityId VARCHAR(64) NULL");

        await EnsureColumnAsync(ctx, logger,
            table: "EklemeGecmisi",
            column: "Details",
            ddl: "ALTER TABLE EklemeGecmisi ADD COLUMN Details TEXT NULL");

        // KategoriID NOT NULL ise → NULL'a düşür (audit kayıtlarında stok olmayabilir)
        await EnsureNullableAsync(ctx, logger, "EklemeGecmisi", "KategoriID", "INT NULL");
        await EnsureNullableAsync(ctx, logger, "EklemeGecmisi", "Miktar",     "INT NULL");
    }

    private static async Task EnsureTalepOnaylariTableAsync(AppDbContext ctx, ILogger? logger)
    {
        // Faz 8.4 — Satın Alma talep aşama log'u.
        //
        // §20 KÖK NEDEN: Canlı DB'de TalepOnaylari LEGACY şemayla mevcuttu
        // (OnayID, TalepID, OnaylayanID, OnayTarihi, Durum ENUM('Beklemede',
        // 'Onaylandi','Reddedildi'), OnayMuhasebe, OnayAdmin). EF entity'sinin
        // beklediği Asama/KullaniciAdi/Tarih/Not_ kolonları YOK ve Durum ENUM idi.
        // Sonuç: (a) her audit INSERT'i "Unknown column 'Asama'" + ENUM truncation
        // ile patlıyordu (PurchaseService.LogApprovalAsync try/catch ile yutuyordu →
        // tablo 0 satır), (b) GET /api/purchase/{id}/history "Unknown column 'Asama'"
        // → 500. Eski `CREATE TABLE IF NOT EXISTS` legacy tabloyu görünce no-op
        // yaptığı için kolonlar hiç eklenmedi.
        //
        // Düzeltme: tablo legacy ise (Asama kolonu yoksa) DROP + doğru şemayla
        // yeniden oluştur. Idempotent: Asama varsa hiçbir şey yapılmaz. Güvenlik:
        // yalnız 0 satırlıysa DROP edilir (canlıda 0 satır — veri kaybı YOK).
        bool tableExists = await TableExistsAsync(ctx, "TalepOnaylari");
        if (tableExists && !await ColumnExistsAsync(ctx, "TalepOnaylari", "Asama"))
        {
            long rows = await ScalarLongAsync(ctx, "SELECT COUNT(*) FROM TalepOnaylari");
            if (rows == 0)
            {
                await ctx.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS TalepOnaylari");
                logger?.LogWarning("§20 — TalepOnaylari legacy şema (Asama yok, 0 satır) DROP edildi.");
            }
            else
            {
                logger?.LogError(
                    "§20 — TalepOnaylari legacy şema ama {Rows} satır içeriyor; otomatik DROP atlandı (elle migrasyon gerekli).",
                    rows);
                return;
            }
        }

        // Idempotent: CREATE TABLE IF NOT EXISTS → tablo (drop edildiyse veya hiç
        // yoksa) doğru şemayla oluşur; doğru şemayla zaten varsa dokunmaz.
        await ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS TalepOnaylari (
                OnayID         INT NOT NULL AUTO_INCREMENT,
                TalepID        INT NOT NULL,
                Asama          VARCHAR(64)  NOT NULL,
                Durum          VARCHAR(64)  NOT NULL,
                KullaniciAdi   VARCHAR(100) NOT NULL,
                Tarih          DATETIME     NOT NULL,
                Not_           TEXT         NULL,
                PRIMARY KEY (OnayID),
                INDEX IX_TalepOnaylari_TalepID (TalepID)
            )");
        logger?.LogInformation("TalepOnaylari tablosu hazırlandı (doğru şema — §20).");
    }

    private static async Task EnsureSatinAlmaTalepKalemTableAsync(AppDbContext ctx, ILogger? logger)
    {
        // Round-9 §9 — çok satırlı satın alma talebi kalemleri.
        // CREATE IF NOT EXISTS → idempotent; tablo varsa dokunmaz.
        await ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS SatinAlmaTalepKalem (
                KalemID     INT            NOT NULL AUTO_INCREMENT,
                TalepID     INT            NOT NULL,
                UrunAdi     VARCHAR(255)   NOT NULL,
                Birim       VARCHAR(50)    NOT NULL,
                Miktar      DECIMAL(18,2)  NOT NULL,
                BirimFiyat  DECIMAL(18,2)  NULL,
                Toplam      DECIMAL(18,2)  NOT NULL,
                Indirim     DECIMAL(18,2)  NULL,
                IndirimTipi VARCHAR(8)     NULL,
                FiyatModu   VARCHAR(8)     NOT NULL,
                PRIMARY KEY (KalemID),
                INDEX IX_SatinAlmaTalepKalem_TalepID (TalepID)
            )");
        logger?.LogInformation("SatinAlmaTalepKalem tablosu hazırlandı (CREATE IF NOT EXISTS).");
    }

    /// <summary>
    /// PROMPT-v2 §7 — Temsilci sahiplenmesi için MusteriBilgileri'ne
    /// CreatedByKullaniciID INT NULL ekler. Kolon yoksa eklenir ve hemen
    /// SiparisAlTablo'daki en eski sipariş kaydının KullaniciID'sinden
    /// backfill çalıştırılır. Hiç siparişi olmayan müşterilerde NULL kalır
    /// (yalnız Yonetici/Muhasebe/Gozlemci görür).
    /// </summary>
    private static async Task EnsureMusteriCreatedByColumnAsync(AppDbContext ctx, ILogger? logger)
    {
        bool columnExisted = await ColumnExistsAsync(ctx, "MusteriBilgileri", "CreatedByKullaniciID");

        if (!columnExisted)
        {
            await ctx.Database.ExecuteSqlRawAsync(
                "ALTER TABLE MusteriBilgileri ADD COLUMN CreatedByKullaniciID INT NULL");
            logger?.LogInformation("MusteriBilgileri.CreatedByKullaniciID kolonu eklendi.");
        }

        // Backfill: yalnız NULL kayıtları doldur. Kolon ilk kez eklendiğinde
        // tüm geçmiş kayıtlar bu adımda doldurulur; sonraki çalıştırmalar
        // (yeni NULL kayıt yoksa) etkisizdir.
        const string backfill = @"
            UPDATE MusteriBilgileri m
            INNER JOIN (
                SELECT s1.MusteriAd, s1.KullaniciID
                FROM SiparisAlTablo s1
                INNER JOIN (
                    SELECT MusteriAd, MIN(Tarih) AS MinTarih
                    FROM SiparisAlTablo
                    GROUP BY MusteriAd
                ) s2 ON s1.MusteriAd = s2.MusteriAd AND s1.Tarih = s2.MinTarih
            ) earliest ON earliest.MusteriAd = m.MusteriAd
            SET m.CreatedByKullaniciID = earliest.KullaniciID
            WHERE m.CreatedByKullaniciID IS NULL";

        int affected = await ctx.Database.ExecuteSqlRawAsync(backfill);
        if (affected > 0)
            logger?.LogInformation(
                "MusteriBilgileri.CreatedByKullaniciID backfill: {N} kayıt dolduruldu.", affected);
    }

    // ── 13) Panoramic Padel Court — Excel reçete seed'i ─────────────────────

    /// <summary>
    /// Excel "PANORAMİK-ÇELİK-CIVATA-FİYATLI_LİSTESİ": ÇELİK SINIFI sayfası (6 m boy
    /// profil adetleri, "Number to order" toplamları) + CİVATA sayfası (birim, adet,
    /// birim fiyat TL). Her kalem BilesenBilgileri'ne "Türkçe Ad / English Name"
    /// biçiminde yazılır; Panoramic Padel Court reçetesi (KategoriBilesenleri) eski
    /// genel bileşenler yerine YALNIZ bu kalemlerden oluşur.
    ///
    /// Şema ön koşulları (idempotent, genişletme):
    ///   • BilesenBilgileri.Fiyat int → DECIMAL(10,2): 14,85 / 1,27 gibi kuruşlu
    ///     fiyatlar int kolonda yuvarlanırdı (STRICT modda hata değil, sessiz kayıp).
    ///   • BilesenBilgileri.Birim ENUM('Set','M','M2','Kg','Pcs','gr') → +'Paket','Rulo'
    ///     (STRICT_TRANS_TABLES: enum dışı değer INSERT'te hard error verir —
    ///     bkz. SiparisMiTeklifMi tuzağı).
    ///
    /// Reçete her açılışta Excel listesiyle karşılaştırılır; birebir aynıysa dokunulmaz,
    /// değilse listeyle değiştirilir (SeedCategoryBomAsync). Fiyat kategori başına ayrı.
    /// Eski Panoramic siparişleri etkilenmez: SiparisIslemTablo BilesenID + SBilesenAdi
    /// snapshot taşır, eski bileşen satırları silinmez (sadece reçete bağı kalkar).
    /// </summary>
    private static async Task EnsurePanoramicBomSeedAsync(AppDbContext ctx, ILogger? logger)
    {
        const string KategoriAdi = "Panoramic Padel Court";

        // (BilesenAdi "TR / EN", Birim, Adet, Fiyat TL) — Excel sırası: çelik, sonra cıvata/sarf.
        // Fiyatlar Excel R02 (çelik profiller dahil) — sipariş
        // ekranında satır bazında düzeltilebilir.
        (string Ad, string Birim, int Adet, decimal Fiyat)[] kalemler =
        [
            // ÇELİK SINIFI — "Number to order" sütun toplamları (6 m standart boy); fiyatlar R02 "Birim Fiyat (TL/BOY)"
            ("RHS 100x50x3 Kutu Profil 6 m / RHS 100x50x3 Box Profile 6 m", "Pcs",  38, 1245.50m),
            ("RHS 30x30x2 Kutu Profil 6 m / RHS 30x30x2 Box Profile 6 m",   "Pcs",  15,  333.00m),
            ("LAS 30x30x3 Köşebent 6 m / LAS 30x30x3 Angle Bar 6 m",        "Pcs",  23,   34.50m),
            // CİVATA PAKET LİSTESİ
            ("M14x200 Klipsli Dübel / M14x200 Clip-In Anchor",                               "Pcs",   54,   25.00m),
            ("M12x100 Gömlekli Dübel / M12x100 Sleeve Anchor",                               "Pcs",   88,   14.85m),
            ("M12x100 Altıköşe Başlı Tam Paso Cıvata / M12x100 Hex Head Full Thread Bolt",  "Pcs",   58,   15.76m),
            ("M12x80 Altıköşe Başlı Tam Paso Cıvata / M12x80 Hex Head Full Thread Bolt",    "Pcs",   80,   13.12m),
            ("M10x35 Havşa Başlı İmbus Cıvata / M10x35 Countersunk Allen Bolt",             "Pcs",  144,    4.11m),
            ("M10 Flanşlı Somun / M10 Flange Nut",                                           "Pcs",  144,    2.30m),
            ("M12 Flanşlı Somun / M12 Flange Nut",                                           "Pcs",  138,    3.70m),
            ("Matkap Uçlu Çatı Vidası 2,5 cm / Self-Drilling Roofing Screw 2.5 cm",         "Pcs",  300,    1.50m),
            ("Spanzet Orta Boy / Ratchet Strap Medium",                                      "Pcs",    1,  760.00m),
            ("Conta Kesikli / Slotted Gasket",                                               "Pcs",   36,    1.27m),
            ("Conta Düz / Flat Gasket",                                                      "Pcs",   48,    1.25m), // Excel 1,245 → DECIMAL(10,2) yuvarlama
            ("Tutkal / Adhesive",                                                            "Set",    1, 4275.00m),
            ("Helmetin Bezi / Helmetin Cloth",                                               "Set",    1,    0m),    // Excel fiyat boş
            ("File / Net",                                                                   "Set",    1, 9000.00m),
            ("Cam Bandı / Glass Tape",                                                       "M",    100,    0m),    // Excel fiyat boş
            ("Cam Havşa Contası Büyük / Glass Countersunk Gasket Large",                     "Paket", 110,    6.00m),
            ("Cam Braketi Yan / Glass Bracket Side",                                         "Pcs",   48,    2.50m),
            ("Cam Braketi Alt / Glass Bracket Bottom",                                       "Pcs",   36,    2.80m),
            ("Çelik Halat 8 m / Steel Wire Rope 8 m",                                        "M",     20,   40.00m),
            ("Çelik Halat Gergisi / Wire Rope Tensioner",                                    "Pcs",    8,   58.59m),
            ("Çelik Halat Klemensi / Wire Rope Clamp",                                       "Pcs",    8,   17.67m),
            ("Projektör / Floodlight",                                                       "Pcs",    8,  950.00m),
            ("Pleksi Levha / Plexiglass Sheet",                                              "Set",   12,  220.00m),
            ("Halı ve Küçük Çizgi / Turf & Line Marking",                                   "Rulo",   5,  627.00m),
            ("12 mm Temperli Cam / 12 mm Tempered Glass",                                    "Pcs",   18, 2052.00m),
        ];

        // a) Fiyat kolonu kuruş taşısın: int → DECIMAL(10,2) (genişletme, veri kaybı yok).
        var fiyatType = (await ScalarStringAsync(ctx,
            @"SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BilesenBilgileri' AND COLUMN_NAME = 'Fiyat'"))
            ?.ToLowerInvariant();
        if (fiyatType is null)
        {
            logger?.LogWarning("BilesenBilgileri.Fiyat kolonu bulunamadı — Panoramic reçete seed'i atlandı.");
            return;
        }
        if (fiyatType != "decimal")
        {
            await ctx.Database.ExecuteSqlRawAsync(
                "ALTER TABLE BilesenBilgileri MODIFY COLUMN Fiyat DECIMAL(10,2) NULL");
            logger?.LogInformation("BilesenBilgileri.Fiyat ({Type}) → DECIMAL(10,2) yapıldı.", fiyatType);
        }

        // b) Birim ENUM'una eksik etiketleri ekle (mevcut etiketler aynen korunur).
        var birimType = await ScalarStringAsync(ctx,
            @"SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BilesenBilgileri' AND COLUMN_NAME = 'Birim'");
        if (birimType is not null && birimType.StartsWith("enum(", StringComparison.OrdinalIgnoreCase))
        {
            var mevcut = birimType[5..^1]
                .Split(',')
                .Select(v => v.Trim().Trim('\''))
                .ToList();
            var eksik = new[] { "Paket", "Rulo" }.Where(v => !mevcut.Contains(v)).ToList();
            if (eksik.Count > 0)
            {
                var tumu = string.Join(",", mevcut.Concat(eksik).Select(v => $"'{v}'"));
                // Etiketler INFORMATION_SCHEMA'dan + sabit listeden geliyor; kullanıcı girdisi yok.
#pragma warning disable EF1002
                await ctx.Database.ExecuteSqlRawAsync(
                    $"ALTER TABLE BilesenBilgileri MODIFY COLUMN Birim ENUM({tumu}) NULL");
#pragma warning restore EF1002
                logger?.LogInformation("BilesenBilgileri.Birim ENUM genişletildi: +{Eksik}.", string.Join(",", eksik));
            }
        }

        await SeedCategoryBomAsync(ctx, logger, KategoriAdi, kalemler);
    }

    /// <summary>
    /// Diğer üç Excel: "FULL PANORAMİC MALİYET ANALİZİ" (ÇELİK SINIFI + CİVATA),
    /// "PADBOOL-BİRİM MALİYET ANALİZİ" (ÇELİK + CİVATA), "STANDART-COURT FİYAT LİSTESİ"
    /// (ÇELİK + CİVATA). Çelik: profil başına "Number to order" toplamı (6 m boy), Unit
    /// Price TL/BOY; cıvata: ÜRÜN ADI / BİRİM / ADET / BİRİM FİYAT aynen. Sayfaların alt
    /// kısmındaki maliyet analizi satırları (kum, boya, genel gider, nakliye…) bileşen
    /// değildir. Excel'de fiyatı boş kalemler 0 TL.
    /// </summary>
    private static async Task EnsureOtherExcelBomSeedsAsync(AppDbContext ctx, ILogger? logger)
    {
        (string Ad, string Birim, int Adet, decimal Fiyat)[] fullPanoramic =
        [
            // ÇELİK SINIFI
            ("RHS 100x50x3 Kutu Profil 6 m / RHS 100x50x3 Box Profile 6 m", "Pcs", 21, 1245.50m), // Total RHS 50x100x3
            ("RHS 80x40x2 Kutu Profil 6 m / RHS 80x40x2 Box Profile 6 m",   "Pcs",  1,  810.00m), // Inner profile
            ("RHS 80x40x3 Kutu Profil 6 m / RHS 80x40x3 Box Profile 6 m",   "Pcs", 17,  810.00m), // Columns + Beams
            ("RHS 60x40x3 Kutu Profil 6 m / RHS 60x40x3 Box Profile 6 m",   "Pcs",  5,  534.00m), // Light post 2+1+1+1
            ("RHS 30x30x3 Kutu Profil 6 m / RHS 30x30x3 Box Profile 6 m",   "Pcs", 19,  333.00m), // Mesh panels
            ("LAS 30x30x3 Köşebent 6 m / LAS 30x30x3 Angle Bar 6 m",        "Pcs", 25,   34.50m), // Total L30x30x3
            // CİVATA PAKET LİSTESİ
            ("M12x150 Klipsli Dübel / M12x150 Clip-In Anchor",                               "Pcs",   80,   17.28m), // Excel "M120 X 150"
            ("M10x100 Gömlekli Dübel / M10x100 Sleeve Anchor",                               "Pcs",  100,    8.61m),
            ("M12x70 Cıvata / M12x70 Bolt",                                                  "Pcs",  100,   11.73m),
            ("M12 Somun / M12 Nut",                                                          "Pcs",  100,    2.75m),
            ("Matkap Uçlu Çatı Vidası 2,5 cm / Self-Drilling Roofing Screw 2.5 cm",         "Pcs",  600,    1.50m),
            ("M10x35 Havşa Başlı İmbus Cıvata / M10x35 Countersunk Allen Bolt",             "Pcs",  110,    4.11m), // Excel "10*35"
            ("M10 Somun / M10 Nut",                                                          "Pcs",  110,    1.65m),
            ("Spanzet Orta Boy / Ratchet Strap Medium",                                      "Pcs",    1,  920.00m),
            ("Tutkal / Adhesive",                                                            "Set",    1, 4275.00m),
            ("Helmetin Bezi / Helmetin Cloth",                                               "Set",    1,    0m),
            ("File / Net",                                                                   "Set",    1, 9000.00m),
            ("Cam Bandı / Glass Tape",                                                       "M",    100,    0m),
            ("Cam Havşa Contası Büyük / Glass Countersunk Gasket Large",                     "Paket", 110,    6.00m),
            ("Cam Braketi Yan / Glass Bracket Side",                                         "Pcs",   54,    2.50m),
            ("Projektör / Floodlight",                                                       "Pcs",    8,  950.00m),
            ("Pleksi Levha / Plexiglass Sheet",                                              "Set",   12,  220.00m),
            ("Halı ve Küçük Çizgi / Turf & Line Marking",                                   "Rulo",   5,  627.00m),
            ("12 mm Temperli Cam / 12 mm Tempered Glass",                                    "Pcs",   18, 2052.00m),
        ];

        (string Ad, string Birim, int Adet, decimal Fiyat)[] padbol =
        [
            // ÇELİK
            ("RHS 80x40x3 Kutu Profil 6 m / RHS 80x40x3 Box Profile 6 m",   "Pcs",  7,  810.00m), // 4+1+2
            ("RHS 80x80x3 Kutu Profil 6 m / RHS 80x80x3 Box Profile 6 m",   "Pcs",  6, 1342.00m), // 4+2
            ("RHS 100x50x3 Kutu Profil 6 m / RHS 100x50x3 Box Profile 6 m", "Pcs", 10, 1245.50m), // 2+8
            ("RHS 30x30x2 Kutu Profil 6 m / RHS 30x30x2 Box Profile 6 m",   "Pcs", 18,  333.00m), // 2+6+6+4
            // CİVATA PAKET LİSTESİ
            ("M12x200 Klipsli Dübel / M12x200 Clip-In Anchor",                               "Pcs",   70,   29.00m), // Excel "M120 X 200"
            ("M12x100 Altıköşe Başlı Tam Paso Cıvata / M12x100 Hex Head Full Thread Bolt",  "Pcs",   50,   15.76m), // Excel "m12*100"
            ("M12 Somun / M12 Nut",                                                          "Pcs",   50,    2.75m),
            ("Matkap Uçlu Çatı Vidası 7,5 cm / Self-Drilling Roofing Screw 7.5 cm",         "Pcs",   30,    3.21m),
            ("M10 Flanşlı Somun / M10 Flange Nut",                                           "Pcs",  150,    1.65m),
            ("M10x35 Havşa Başlı İmbus Cıvata / M10x35 Countersunk Allen Bolt",             "Pcs",  150,    4.11m),
            ("Matkap Uçlu Çatı Vidası 2,5 cm / Self-Drilling Roofing Screw 2.5 cm",         "Pcs",   60,    1.50m),
            ("Projektör / Floodlight",                                                       "Pcs",    4,  950.00m),
            ("Çelik Halat Gergisi / Wire Rope Tensioner",                                    "Pcs",    8,   58.59m),
            ("Çelik Halat Klemensi / Wire Rope Clamp",                                       "Pcs",    8,   17.67m),
            ("Çelik Halat 8 mm / Steel Wire Rope 8 mm",                                      "M",     20,   40.00m),
            ("Pleksi Levha / Plexiglass Sheet",                                              "Pcs",    8,  220.00m),
            ("Spanzet Orta Boy / Ratchet Strap Medium",                                      "Pcs",    1,  920.00m),
            ("Conta Düz / Flat Gasket",                                                      "Pcs",  100, 1245.00m), // Excel aynen 1.245,00
            ("Tutkal / Adhesive",                                                            "Set",    1, 4275.00m),
            ("Helmetin Bezi / Helmetin Cloth",                                               "Set",    1,    0m),
            ("File / Net",                                                                   "Pcs",    1, 9000.00m),
            ("Cam Bandı / Glass Tape",                                                       "M",    100,    0m),
            ("Cam Havşa Contası Beyaz / Glass Countersunk Gasket White",                     "Pcs",  150,    6.00m),
            ("Cam Bağlantı Braketi Yan / Glass Connection Bracket Side",                     "Pcs",   72,    3.00m),
            ("Halı ve Küçük Çizgi / Turf & Line Marking",                                   "Rulo",   5,  627.00m),
            ("10 mm Temperli Cam / 10 mm Tempered Glass",                                    "Pcs",   18, 1512.00m),
        ];

        (string Ad, string Birim, int Adet, decimal Fiyat)[] standart =
        [
            // ÇELİK
            ("RHS 100x50x3 Kutu Profil 6 m / RHS 100x50x3 Box Profile 6 m", "Pcs", 22, 1245.50m), // 12+4+6
            ("RHS 80x40x3 Kutu Profil 6 m / RHS 80x40x3 Box Profile 6 m",   "Pcs", 17,  810.00m), // 12+3+1+1
            ("LAS 30x30x3 Köşebent 6 m / LAS 30x30x3 Angle Bar 6 m",        "Pcs", 46,   34.50m), // 2+1+2+6+12+13+10
            // CİVATA PAKET LİSTESİ
            ("M12x200 Klipsli Dübel / M12x200 Clip-In Anchor",                               "Pcs",  160,   29.00m), // Excel "M120 X 200"
            ("M10x110 Gömlekli Dübel / M10x110 Sleeve Anchor",                               "Pcs",   60,    8.61m),
            ("M12x80 Altıköşe Başlı Tam Paso Cıvata / M12x80 Hex Head Full Thread Bolt",    "Pcs",   60,   13.12m), // Excel "M12*80"
            ("M12x70 Cıvata / M12x70 Bolt",                                                  "Pcs",   30,   11.73m),
            ("M8x90 Cıvata / M8x90 Bolt",                                                    "Pcs",   20,    6.32m),
            ("M12 Somun / M12 Nut",                                                          "Pcs",   90,    2.75m),
            ("M8 Somun / M8 Nut",                                                            "Pcs",   20,    0.88m),
            ("M10 Flanşlı Somun / M10 Flange Nut",                                           "Pcs",  150,    2.30m),
            ("M10x35 Havşa Başlı İmbus Cıvata / M10x35 Countersunk Allen Bolt",             "Pcs",  150,    4.11m),
            ("Matkap Uçlu Çatı Vidası 2,5 cm / Self-Drilling Roofing Screw 2.5 cm",         "Pcs",  400,    1.50m),
            ("Projektör / Floodlight",                                                       "Pcs",    8,  950.00m),
            ("Spanzet Orta Boy / Ratchet Strap Medium",                                      "Pcs",    1,  920.00m),
            ("Conta Kesikli / Slotted Gasket",                                               "Pcs",   36,    1.27m),
            ("Conta Düz / Flat Gasket",                                                      "Pcs",   72,    1.25m), // Excel 1,245 → DECIMAL(10,2)
            ("Tutkal / Adhesive",                                                            "Set",    1, 4275.00m),
            ("Helmetin Bezi / Helmetin Cloth",                                               "Set",    1,    0m),
            ("File / Net",                                                                   "Pcs",    1,  900.00m),
            ("Cam Bandı / Glass Tape",                                                       "M",    100,    0m),
            ("Cam Havşa Contası Beyaz / Glass Countersunk Gasket White",                     "Pcs",  150,    6.00m),
            ("Cam Bağlantı Braketi Alt / Glass Connection Bracket Bottom",                   "Pcs",   54,    2.50m),
            ("Cam Bağlantı Braketi Yan / Glass Connection Bracket Side",                     "Pcs",   90,    2.80m),
            ("Halı ve Küçük Çizgi / Turf & Line Marking",                                   "Rulo",   5,  627.00m),
            ("10 mm Temperli Cam / 10 mm Tempered Glass",                                    "Pcs",   18, 1512.00m),
        ];

        await SeedCategoryBomAsync(ctx, logger, "Full Panoramic Court",  fullPanoramic);
        await SeedCategoryBomAsync(ctx, logger, "Padbol",                padbol);
        await SeedCategoryBomAsync(ctx, logger, "Standard Padel Court",  standart);
    }

    /// <summary>
    /// Reçete yazıcı: kategoriyi TAM adıyla bulur (yoksa hiçbir şey yapmaz). Her kalem
    /// (ad + fiyat) çiftiyle çözülür — aynı ad başka fiyatla kayıtlıysa paylaşılmaz,
    /// bu fiyatla yeni bileşen satırı açılır; böylece her kategori Excel'indeki fiyatı
    /// ayrı taşır. Kategorinin mevcut reçetesi hedef listeyle (BilesenID, Adet) birebir
    /// aynıysa dokunmaz; değilse tek transaction'da reçeteyi bu listeyle değiştirir.
    /// Eski bileşen satırları silinmez (yalnız reçete bağı kalkar); eski siparişler
    /// SiparisIslemTablo'daki kendi snapshot'ını taşıdığı için etkilenmez.
    /// </summary>
    private static async Task SeedCategoryBomAsync(AppDbContext ctx, ILogger? logger,
        string kategoriAdi, (string Ad, string Birim, int Adet, decimal Fiyat)[] kalemler)
    {
        var kategoriId = await ScalarLongAsync(ctx,
            $"SELECT COALESCE(MIN(KategoriID), 0) FROM UrunKategorileri WHERE KategoriAdi = '{kategoriAdi.Replace("'", "''")}'");
        if (kategoriId == 0)
        {
            logger?.LogWarning("UrunKategorileri'nde '{Ad}' yok — reçete seed'i atlandı.", kategoriAdi);
            return;
        }

        await using var tx = await ctx.Database.BeginTransactionAsync();

        var hedef = new List<(int BilesenID, int Adet)>(kalemler.Length);
        int yeni = 0;
        foreach (var k in kalemler)
        {
            var id = await ScalarLongAsync(ctx,
                $@"SELECT COALESCE(MIN(BilesenID), 0) FROM BilesenBilgileri
                   WHERE BilesenAdi = '{k.Ad.Replace("'", "''")}'
                     AND COALESCE(Fiyat, 0) = {k.Fiyat.ToString(System.Globalization.CultureInfo.InvariantCulture)}");
            if (id == 0)
            {
                await ctx.Database.ExecuteSqlInterpolatedAsync(
                    $"INSERT INTO BilesenBilgileri (BilesenAdi, Birim, Fiyat, Currency) VALUES ({k.Ad}, {k.Birim}, {k.Fiyat}, 'TRY')");
                id = await ScalarLongAsync(ctx, "SELECT LAST_INSERT_ID()");
                yeni++;
            }
            hedef.Add(((int)id, k.Adet));
        }

        var mevcut = await RecipeRowsAsync(ctx, kategoriId);
        if (mevcut.Count == hedef.Count && !mevcut.Except(hedef).Any() && !hedef.Except(mevcut).Any())
        {
            await tx.CommitAsync();
            logger?.LogInformation("{Ad} (KategoriID {Kat}) reçetesi Excel listesiyle zaten birebir; dokunulmadı.", kategoriAdi, kategoriId);
            return;
        }

        int silinen = await ctx.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM KategoriBilesenleri WHERE KategoriID = {kategoriId}");
        foreach (var (bilesenId, adet) in hedef)
            await ctx.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO KategoriBilesenleri (KategoriID, BilesenID, Adet) VALUES ({kategoriId}, {bilesenId}, {adet})");
        await tx.CommitAsync();

        logger?.LogInformation(
            "{Ad} (KategoriID {Kat}) reçetesi Excel listesiyle kuruldu: {Yeni} yeni bileşen, {Silinen} eski reçete satırı kaldırıldı, {Toplam} reçete satırı yazıldı.",
            kategoriAdi, kategoriId, yeni, silinen, hedef.Count);
    }

    private static async Task<List<(int BilesenID, int Adet)>> RecipeRowsAsync(AppDbContext ctx, long kategoriId)
    {
        var rows = new List<(int, int)>();
        var conn = ctx.Database.GetDbConnection();
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = ctx.Database.CurrentTransaction?.GetDbTransaction();
        cmd.CommandText = $"SELECT BilesenID, Adet FROM KategoriBilesenleri WHERE KategoriID = {kategoriId}";
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
            rows.Add((Convert.ToInt32(r[0]), Convert.ToInt32(r[1])));
        return rows;
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private static async Task<bool> ColumnExistsAsync(AppDbContext ctx, string table, string column)
    {
        var conn = ctx.Database.GetDbConnection();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND TABLE_NAME   = @t
                              AND COLUMN_NAME  = @c";
        var pT = cmd.CreateParameter(); pT.ParameterName = "@t"; pT.Value = table;  cmd.Parameters.Add(pT);
        var pC = cmd.CreateParameter(); pC.ParameterName = "@c"; pC.Value = column; cmd.Parameters.Add(pC);
        var n = Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0);
        return n > 0;
    }

    private static async Task<bool> TableExistsAsync(AppDbContext ctx, string table)
    {
        var conn = ctx.Database.GetDbConnection();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
                            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @t";
        var pT = cmd.CreateParameter(); pT.ParameterName = "@t"; pT.Value = table; cmd.Parameters.Add(pT);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0) > 0;
    }

    private static async Task<long> ScalarLongAsync(AppDbContext ctx, string sql)
    {
        var conn = ctx.Database.GetDbConnection();
        await using var cmd = conn.CreateCommand();
        // Açık bir EF transaction varsa (seed adımları) ham komut da ona katılsın —
        // MySqlConnector aksi halde "command is not in the same transaction" fırlatır.
        cmd.Transaction = ctx.Database.CurrentTransaction?.GetDbTransaction();
        cmd.CommandText = sql;
        return Convert.ToInt64(await cmd.ExecuteScalarAsync() ?? 0L);
    }

    private static async Task<string?> ScalarStringAsync(AppDbContext ctx, string sql)
    {
        var conn = ctx.Database.GetDbConnection();
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = ctx.Database.CurrentTransaction?.GetDbTransaction();
        cmd.CommandText = sql;
        var v = await cmd.ExecuteScalarAsync();
        return v is null || v is DBNull ? null : v.ToString();
    }

    private static async Task EnsureColumnAsync(AppDbContext ctx, ILogger? logger,
        string table, string column, string ddl)
    {
        if (await ColumnExistsAsync(ctx, table, column))
        {
            logger?.LogInformation("{Table}.{Column} kolonu zaten var; atlandı.", table, column);
            return;
        }
        await ctx.Database.ExecuteSqlRawAsync(ddl);
        logger?.LogInformation("{Table}.{Column} kolonu eklendi.", table, column);
    }

    // table/column geliyor — bu metot sadece bu dosya içinden, sabit string'lerle çağrılıyor;
    // SQL injection riski yok. Identifier'larda backtick whitelisting yapsak da sabit
    // değerlerle çağrıldığı için warning'i suppress ediyoruz.
#pragma warning disable EF1002
    private static async Task EnsureNullableAsync(AppDbContext ctx, ILogger? logger,
        string table, string column, string newDef)
    {
        var conn = ctx.Database.GetDbConnection();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND TABLE_NAME   = @t
                              AND COLUMN_NAME  = @c";
        var pT = cmd.CreateParameter(); pT.ParameterName = "@t"; pT.Value = table;  cmd.Parameters.Add(pT);
        var pC = cmd.CreateParameter(); pC.ParameterName = "@c"; pC.Value = column; cmd.Parameters.Add(pC);
        var v = await cmd.ExecuteScalarAsync() as string;
        if (v?.Equals("YES", StringComparison.OrdinalIgnoreCase) == true)
            return;
        await ctx.Database.ExecuteSqlRawAsync($"ALTER TABLE {table} MODIFY COLUMN {column} {newDef}");
        logger?.LogInformation("{Table}.{Column} kolonu nullable yapıldı.", table, column);
    }
#pragma warning restore EF1002
}
