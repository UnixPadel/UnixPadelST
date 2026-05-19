using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class ProductCostConfiguration : IEntityTypeConfiguration<ProductCost>
{
    public void Configure(EntityTypeBuilder<ProductCost> builder)
    {
        builder.ToTable("UrunMaliyetTablo");

        builder.HasKey(p => p.MaliyetID);
        builder.Property(p => p.MaliyetID).HasColumnName("MaliyetID").ValueGeneratedOnAdd();
        builder.Property(p => p.SiparisNo).HasColumnName("SiparisNo").IsRequired().HasMaxLength(50);
        builder.Property(p => p.KategoriID).HasColumnName("KategoriID").IsRequired();
        builder.Property(p => p.Malzeme).HasColumnName("Malzeme").HasColumnType("decimal(18,2)");
        builder.Property(p => p.Iscilik).HasColumnName("Iscilik").HasColumnType("decimal(18,2)");
        builder.Property(p => p.Nakliye).HasColumnName("Nakliye").HasColumnType("decimal(18,2)");
        builder.Property(p => p.Diger).HasColumnName("Diger").HasColumnType("decimal(18,2)");
        builder.Property(p => p.GirenKullanici).HasColumnName("GirenKullanici").IsRequired();
        builder.Property(p => p.GirisTarih).HasColumnName("GirisTarih");

        builder.HasIndex(p => p.SiparisNo);
    }
}
