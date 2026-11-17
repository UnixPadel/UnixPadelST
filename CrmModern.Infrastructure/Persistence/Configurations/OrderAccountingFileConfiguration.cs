using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class OrderAccountingFileConfiguration : IEntityTypeConfiguration<OrderAccountingFile>
{
    public void Configure(EntityTypeBuilder<OrderAccountingFile> builder)
    {
        builder.ToTable("SiparisMuhasebeEk");

        builder.HasKey(e => e.EkID);
        builder.Property(e => e.EkID).HasColumnName("EkID").ValueGeneratedOnAdd();

        builder.Property(e => e.SiparisAlID)         .HasColumnName("SiparisAlID");
        builder.Property(e => e.Ad)                  .HasColumnName("Ad").HasMaxLength(255);
        builder.Property(e => e.Tip)                 .HasColumnName("Tip").HasMaxLength(150);
        builder.Property(e => e.Boyut)               .HasColumnName("Boyut");
        builder.Property(e => e.Veri)                .HasColumnName("Veri").HasColumnType("longblob");
        builder.Property(e => e.Tarih)               .HasColumnName("Tarih");
        builder.Property(e => e.YukleyenKullaniciID) .HasColumnName("YukleyenKullaniciID");
        builder.Property(e => e.YukleyenAdSoyad)     .HasColumnName("YukleyenAdSoyad").HasMaxLength(200);

        // 40+ ergonomi K5 — yumuşak silme
        builder.Property(e => e.Silindi)             .HasColumnName("Silindi");
        builder.Property(e => e.SilinmeTarihi)       .HasColumnName("SilinmeTarihi");
        builder.Property(e => e.SilenKullaniciID)    .HasColumnName("SilenKullaniciID");
    }
}
