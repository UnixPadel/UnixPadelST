using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class PurchaseAttachmentConfiguration : IEntityTypeConfiguration<PurchaseAttachment>
{
    public void Configure(EntityTypeBuilder<PurchaseAttachment> builder)
    {
        builder.ToTable("SatinAlmaTalepEk");

        builder.HasKey(e => e.EkID);
        builder.Property(e => e.EkID).HasColumnName("EkID").ValueGeneratedOnAdd();

        builder.Property(e => e.TalepID)              .HasColumnName("TalepID");
        builder.Property(e => e.Ad)                   .HasColumnName("Ad")   .HasMaxLength(255);
        builder.Property(e => e.Tip)                  .HasColumnName("Tip")  .HasMaxLength(150);
        builder.Property(e => e.Veri)                 .HasColumnName("Veri") .HasColumnType("longblob");
        builder.Property(e => e.Tarih)                .HasColumnName("Tarih");
        builder.Property(e => e.YukleyenKullaniciAdi) .HasColumnName("YukleyenKullaniciAdi").HasMaxLength(200);
    }
}
