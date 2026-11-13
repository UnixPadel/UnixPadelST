using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class AntrepoBeyannameConfiguration : IEntityTypeConfiguration<AntrepoBeyanname>
{
    public void Configure(EntityTypeBuilder<AntrepoBeyanname> builder)
    {
        builder.ToTable("AntrepoBeyanname");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("Id").ValueGeneratedOnAdd();

        builder.Property(b => b.BeyannameNo)        .HasColumnName("BeyannameNo")        .HasMaxLength(50);
        builder.HasIndex(b => b.BeyannameNo).IsUnique();

        builder.Property(b => b.TescilTarihi)       .HasColumnName("TescilTarihi");
        builder.Property(b => b.RejimKodu)          .HasColumnName("RejimKodu")          .HasMaxLength(20);
        builder.Property(b => b.GumrukIdaresi)      .HasColumnName("GumrukIdaresi")      .HasMaxLength(150);
        builder.Property(b => b.Gonderici)          .HasColumnName("Gonderici")          .HasMaxLength(255);
        builder.Property(b => b.Alici)              .HasColumnName("Alici")              .HasMaxLength(255);
        builder.Property(b => b.Doviz)              .HasColumnName("Doviz")              .HasMaxLength(10);
        builder.Property(b => b.FaturaTutari)       .HasColumnName("FaturaTutari")       .HasColumnType("decimal(18,2)");
        builder.Property(b => b.Kur)                .HasColumnName("Kur")                .HasColumnType("decimal(18,4)");
        builder.Property(b => b.Kaynak)             .HasColumnName("Kaynak")             .HasMaxLength(20).IsRequired();
        builder.Property(b => b.BelgeAdi)           .HasColumnName("BelgeAdi")           .HasMaxLength(255);
        builder.Property(b => b.BelgeTip)           .HasColumnName("BelgeTip")           .HasMaxLength(100);
        builder.Property(b => b.Belge)              .HasColumnName("Belge")              .HasColumnType("longblob");
        builder.Property(b => b.HamJson)            .HasColumnName("HamJson")            .HasColumnType("longtext");
        builder.Property(b => b.YukleyenKullaniciID).HasColumnName("YukleyenKullaniciID");
        builder.Property(b => b.YuklemeTarihi)      .HasColumnName("YuklemeTarihi");
    }
}
