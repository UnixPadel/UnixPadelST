using Microsoft.EntityFrameworkCore;
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
        cmd.CommandText = sql;
        return Convert.ToInt64(await cmd.ExecuteScalarAsync() ?? 0L);
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
