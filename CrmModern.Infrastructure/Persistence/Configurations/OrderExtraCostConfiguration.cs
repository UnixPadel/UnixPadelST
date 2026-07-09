using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class OrderExtraCostConfiguration : IEntityTypeConfiguration<OrderExtraCost>
{
    public void Configure(EntityTypeBuilder<OrderExtraCost> builder)
    {
        builder.ToTable("SiparisEkMaliyet");

        builder.HasKey(e => e.EkMaliyetID);
        builder.Property(e => e.EkMaliyetID).HasColumnName("EkMaliyetID").ValueGeneratedOnAdd();

        builder.Property(e => e.SiparisAlID)   .HasColumnName("SiparisAlID");
        builder.Property(e => e.Aciklama)      .HasColumnName("Aciklama").HasMaxLength(500);
        builder.Property(e => e.Tutar)         .HasColumnName("Tutar").HasColumnType("decimal(10,2)");
        builder.Property(e => e.EklenmeTarihi) .HasColumnName("EklenmeTarihi");
        builder.Property(e => e.KullaniciID)   .HasColumnName("KullaniciID");
    }
}
