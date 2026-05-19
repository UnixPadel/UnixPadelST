using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class PurchaseApprovalConfiguration : IEntityTypeConfiguration<PurchaseApproval>
{
    public void Configure(EntityTypeBuilder<PurchaseApproval> builder)
    {
        builder.ToTable("TalepOnaylari");

        builder.HasKey(p => p.OnayID);
        builder.Property(p => p.OnayID).HasColumnName("OnayID").ValueGeneratedOnAdd();

        builder.Property(p => p.TalepID).HasColumnName("TalepID").IsRequired();
        builder.Property(p => p.Asama).HasColumnName("Asama").HasMaxLength(64).IsRequired();
        builder.Property(p => p.Durum).HasColumnName("Durum").HasMaxLength(64).IsRequired();
        builder.Property(p => p.KullaniciAdi).HasColumnName("KullaniciAdi").HasMaxLength(100).IsRequired();
        builder.Property(p => p.Tarih).HasColumnName("Tarih").IsRequired();

        // CREATE TABLE DDL'inde Not_ kullanıldı (NOT MySQL reserved)
        builder.Property(p => p.Not).HasColumnName("Not_").HasColumnType("text");
    }
}
