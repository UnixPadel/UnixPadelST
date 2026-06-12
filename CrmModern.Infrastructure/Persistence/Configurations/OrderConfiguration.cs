using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("SiparisAlTablo");

        builder.HasKey(o => o.SiparisAlID);
        builder.Property(o => o.SiparisAlID)
               .HasColumnName("SiparisAlID")
               .ValueGeneratedOnAdd();

        builder.Property(o => o.MusteriId).HasColumnName("MusteriId");

        builder.Property(o => o.SiparisNo)
               .HasColumnName("SiparisNo")
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(o => o.TeklifNo)
               .HasColumnName("TeklifNo")
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(o => o.MusteriAd)
               .HasColumnName("MusteriAd")
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(o => o.SiparisNotu)
               .HasColumnName("SiparisNotu")
               .HasMaxLength(4000);

        builder.Property(o => o.KullaniciID).HasColumnName("KullaniciID");

        // ── Seller snapshot (S-prefix) ────────────────────────────────────
        builder.Property(o => o.STelefon)    .HasColumnName("STelefon")    .HasMaxLength(100);
        builder.Property(o => o.SFax)        .HasColumnName("SFax")        .HasMaxLength(100);
        builder.Property(o => o.SWeb)        .HasColumnName("SWeb")        .HasMaxLength(200);
        builder.Property(o => o.SE_Mail)     .HasColumnName("SE_Mail")     .HasMaxLength(200);
        builder.Property(o => o.SVatNumarasi).HasColumnName("SVatNumarasi").HasMaxLength(100);
        builder.Property(o => o.SUlke)       .HasColumnName("SUlke")       .HasMaxLength(100);
        builder.Property(o => o.SAdres)      .HasColumnName("SAdres")      .HasMaxLength(500);

        // ── Assembly ──────────────────────────────────────────────────────
        builder.Property(o => o.Montaj)     .HasColumnName("Montaj")     .HasMaxLength(10);
        builder.Property(o => o.MontajFiyat).HasColumnName("MontajFiyat").HasColumnType("decimal(18,2)");
        builder.Property(o => o.MAdet)      .HasColumnName("MAdet");

        // ── Delivery ──────────────────────────────────────────────────────
        builder.Property(o => o.Teslimat)      .HasColumnName("Teslimat")      .HasMaxLength(10);
        builder.Property(o => o.TeslimatFiyat) .HasColumnName("TeslimatFiyat") .HasColumnType("decimal(18,2)");
        builder.Property(o => o.MTeslimat)     .HasColumnName("MTeslimat");
        // Column name contains Turkish ç — preserved exactly
        builder.Property(o => o.TeslimatÇeşiti).HasColumnName("TeslimatÇeşiti").HasMaxLength(200);

        // ── Deliver-to (T-prefix) ─────────────────────────────────────────
        builder.Property(o => o.TTeslimAlanAdi).HasColumnName("TTeslimAlanAdi").HasMaxLength(200);
        builder.Property(o => o.TIlgiliKisi)   .HasColumnName("TIlgiliKisi")   .HasMaxLength(200);
        builder.Property(o => o.TTelefon)      .HasColumnName("TTelefon")      .HasMaxLength(100);
        builder.Property(o => o.TAltTelefon)   .HasColumnName("TAltTelefon")   .HasMaxLength(100);
        builder.Property(o => o.TE_Mail)       .HasColumnName("TE_Mail")       .HasMaxLength(200);
        builder.Property(o => o.TVATNumarasi)  .HasColumnName("TVATNumarasi")  .HasMaxLength(100);
        builder.Property(o => o.TZipKod)       .HasColumnName("TZipKod")       .HasMaxLength(20);
        builder.Property(o => o.TUlke)         .HasColumnName("TUlke")         .HasMaxLength(100);
        builder.Property(o => o.TAdres)        .HasColumnName("TAdres")        .HasMaxLength(500);

        // ── Customer snapshot (M-prefix) ──────────────────────────────────
        builder.Property(o => o.MTelefon)    .HasColumnName("MTelefon")    .HasMaxLength(100);
        builder.Property(o => o.MMail)       .HasColumnName("MMail")       .HasMaxLength(200);
        builder.Property(o => o.MUlke)       .HasColumnName("MUlke")       .HasMaxLength(100);
        builder.Property(o => o.MVATNumarasi).HasColumnName("MVATNumarasi").HasMaxLength(100);
        builder.Property(o => o.MZipKod)     .HasColumnName("MZipKod")     .HasMaxLength(20);
        builder.Property(o => o.MAdres)      .HasColumnName("MAdres")      .HasMaxLength(500);

        // ── Payment ───────────────────────────────────────────────────────
        // Paket 1 — taze schema doğruladı: SiparisAlTablo.OdenenMiktar DB'de var
        // (decimal(10,2) default 0.00). AccountingService bu kolonu hem okuyor hem
        // güncelliyor; eski `Ignore` mapping bu yüzden Detay/Excel/Klonla/Onay
        // endpoint'lerinde tutarsızlığa yol açıyordu.
        builder.Property(o => o.OdenenMiktar).HasColumnName("OdenenMiktar")
               .HasColumnType("decimal(10,2)");
        builder.Property(o => o.OdemeDurum)  .HasColumnName("OdemeDurum")  .HasMaxLength(20);

        // ── Pricing ───────────────────────────────────────────────────────
        builder.Property(o => o.ParaTipi)       .HasColumnName("ParaTipi")      .HasMaxLength(20);
        builder.Property(o => o.Indirim)        .HasColumnName("Indirim")       .HasColumnType("decimal(18,2)");
        builder.Property(o => o.Kdv)            .HasColumnName("Kdv")           .HasColumnType("decimal(18,2)");
        // Column name contains Turkish ü — preserved exactly
        builder.Property(o => o.PesinYüzde)     .HasColumnName("PesinYüzde");
        builder.Property(o => o.ToplamFiyat)    .HasColumnName("ToplamFiyat")   .HasColumnType("decimal(18,2)");
        builder.Property(o => o.BrutToplamFiyat).HasColumnName("BrutToplamFiyat").HasColumnType("decimal(18,2)");

        // ── Status ────────────────────────────────────────────────────────
        builder.Property(o => o.SiparisMiTeklifMi).HasColumnName("SiparisMiTeklifMi").HasMaxLength(20);
        builder.Property(o => o.Kontrol)          .HasColumnName("Kontrol")          .HasMaxLength(20);
        builder.Property(o => o.Red)              .HasColumnName("Red")              .HasMaxLength(2000);
        // PROMPT-v6 §1.1 — Burcu lojistik onay gate'i (DatabaseSchemaMigrator adım 6).
        builder.Property(o => o.LojistikOnay)     .HasColumnName("LojistikOnay")     .HasMaxLength(16);

        // ── Metadata ──────────────────────────────────────────────────────
        builder.Property(o => o.Sirket)    .HasColumnName("Sirket")    .HasMaxLength(100);
        builder.Property(o => o.Tarih)     .HasColumnName("Tarih");
        builder.Property(o => o.Ek)        .HasColumnName("Ek")        .HasColumnType("mediumblob");
        builder.Property(o => o.MuhasebeEk).HasColumnName("MuhasebeEk").HasColumnType("mediumblob");
        builder.Property(o => o.STarih)    .HasColumnName("STarih")    .HasColumnType("datetime");
        builder.Property(o => o.KontrolNot).HasColumnName("KontrolNot").HasMaxLength(2000);
        builder.Property(o => o.FabrikaNot).HasColumnName("FabrikaNot").HasMaxLength(2000);
        builder.Property(o => o.LojistikNot).HasColumnName("LojistikNot").HasMaxLength(2000);

        // ── Index on SiparisNo (used for child-table lookups) ─────────────
        builder.HasIndex(o => o.SiparisNo).IsUnique();

        // Navigation properties to Items and Details are populated manually
        // in OrderRepository — no EF FK relationship configured here to avoid
        // schema assumptions about foreign key constraints in the live database.
        builder.Ignore(o => o.Items);
        builder.Ignore(o => o.Details);
        builder.Ignore(o => o.Kullanici);
    }
}
