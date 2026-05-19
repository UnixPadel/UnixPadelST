using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class LogisticsEntryConfiguration : IEntityTypeConfiguration<LogisticsEntry>
{
    public void Configure(EntityTypeBuilder<LogisticsEntry> builder)
    {
        builder.ToTable("LojistikTablo");

        builder.HasKey(l => l.ID);
        builder.Property(l => l.ID).HasColumnName("ID").ValueGeneratedOnAdd();

        // KullaniciAdi column actually stores KullaniciID — name preserved from legacy schema
        // Paket 1 — uzunluk/precision DB ile aynı: SiparisNo varchar(50), FirmaAdi varchar(30),
        // LojistikCesit varchar(10), Fiyat decimal(10,2), LNot text.
        builder.Property(l => l.KullaniciAdi)  .HasColumnName("KullaniciAdi");
        builder.Property(l => l.SiparisNo)     .HasColumnName("SiparisNo")     .HasMaxLength(50);
        builder.Property(l => l.FirmaAdi)      .HasColumnName("FirmaAdi")      .HasMaxLength(30);
        builder.Property(l => l.LojistikCesit) .HasColumnName("LojistikCesit") .HasMaxLength(10);
        builder.Property(l => l.Fiyat)         .HasColumnName("Fiyat")         .HasColumnType("decimal(10,2)");
        builder.Property(l => l.LNot)          .HasColumnName("LNot")          .HasColumnType("text");
    }
}
