using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class PurchaseRequestLineConfiguration : IEntityTypeConfiguration<PurchaseRequestLine>
{
    public void Configure(EntityTypeBuilder<PurchaseRequestLine> builder)
    {
        builder.ToTable("SatinAlmaTalepKalem");

        builder.HasKey(p => p.KalemID);
        builder.Property(p => p.KalemID).HasColumnName("KalemID").ValueGeneratedOnAdd();

        builder.Property(p => p.TalepID)     .HasColumnName("TalepID")     .IsRequired();
        builder.Property(p => p.UrunAdi)     .HasColumnName("UrunAdi")     .IsRequired().HasMaxLength(255);
        builder.Property(p => p.Birim)       .HasColumnName("Birim")       .IsRequired().HasMaxLength(50);
        builder.Property(p => p.Miktar)      .HasColumnName("Miktar")      .HasColumnType("decimal(18,2)");
        builder.Property(p => p.BirimFiyat)  .HasColumnName("BirimFiyat")  .HasColumnType("decimal(18,2)");
        builder.Property(p => p.Toplam)      .HasColumnName("Toplam")      .HasColumnType("decimal(18,2)");
        builder.Property(p => p.Indirim)     .HasColumnName("Indirim")     .HasColumnType("decimal(18,2)");
        builder.Property(p => p.IndirimTipi) .HasColumnName("IndirimTipi") .HasMaxLength(8);
        builder.Property(p => p.FiyatModu)   .HasColumnName("FiyatModu")   .IsRequired().HasMaxLength(8);

        builder.HasIndex(p => p.TalepID).HasDatabaseName("IX_SatinAlmaTalepKalem_TalepID");
    }
}
