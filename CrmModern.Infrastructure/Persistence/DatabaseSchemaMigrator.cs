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

        // 4) PROMPT-v2 §7: MusteriBilgileri.CreatedByKullaniciID + tek seferlik backfill.
        await EnsureMusteriCreatedByColumnAsync(ctx, logger);
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
        // Tablo Faz 0 snapshot listesinde geçiyor, ancak yapısı bilinmiyor;
        // bu DDL idempotent: CREATE TABLE IF NOT EXISTS → varsa dokunmaz.
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
        logger?.LogInformation("TalepOnaylari tablosu hazırlandı (CREATE IF NOT EXISTS).");
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
