using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("SiparisIslemTablo");

        // Paket 1 — DB'deki gerçek PK kolonu `SiparisID`; eski snapshot yanlış
        // `SiparisIslemID` diyordu. C# property adı korunuyor, sadece kolon eşlemesi
        // değişiyor (Pomelo "Unknown column 's.SiparisIslemID'" hatasının kaynağı).
        builder.HasKey(i => i.SiparisIslemID);
        builder.Property(i => i.SiparisIslemID)
               .HasColumnName("SiparisID")
               .ValueGeneratedOnAdd();

        // SiparisNo DB'de NULL'a izinli varchar(50) — IsRequired kaldırıldı
        builder.Property(i => i.SiparisNo)  .HasColumnName("SiparisNo")  .HasMaxLength(50);
        builder.Property(i => i.TeklifNo)   .HasColumnName("TeklifNo")   .HasMaxLength(50);
        builder.Property(i => i.KategoriID) .HasColumnName("KategoriID");
        builder.Property(i => i.BilesenID)  .HasColumnName("BilesenID");
        builder.Property(i => i.OznitelikAdi).HasColumnName("OznitelikAdi").HasMaxLength(40);
        builder.Property(i => i.Adet)       .HasColumnName("Adet");
        builder.Property(i => i.Fiyat)      .HasColumnName("Fiyat").HasColumnType("decimal(10,2)");
        builder.Property(i => i.SBilesenAdi).HasColumnName("SBilesenAdi").HasMaxLength(200);
        builder.Property(i => i.SBirim)     .HasColumnName("SBirim")     .HasMaxLength(50);

        // Navigation properties populated manually in repository
        builder.Ignore(i => i.Order);
        builder.Ignore(i => i.Category);
        builder.Ignore(i => i.Component);

        builder.HasIndex(i => i.SiparisNo);
    }
}
