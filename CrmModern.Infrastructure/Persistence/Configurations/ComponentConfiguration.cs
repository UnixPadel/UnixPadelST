using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class ComponentConfiguration : IEntityTypeConfiguration<Component>
{
    public void Configure(EntityTypeBuilder<Component> builder)
    {
        builder.ToTable("BilesenBilgileri");

        builder.HasKey(c => c.BilesenID);
        builder.Property(c => c.BilesenID)
               .HasColumnName("BilesenID")
               .ValueGeneratedOnAdd();

        builder.Property(c => c.BilesenAdi).HasColumnName("BilesenAdi").IsRequired().HasMaxLength(300);
        builder.Property(c => c.Birim)     .HasColumnName("Birim")     .HasMaxLength(50);
        builder.Property(c => c.Fiyat)     .HasColumnName("Fiyat")     .HasColumnType("decimal(10,2)");

        builder.HasMany(c => c.Attributes)
               .WithOne(a => a.Component)
               .HasForeignKey(a => a.BilesenID)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.CategoryComponents)
               .WithOne(cc => cc.Component)
               .HasForeignKey(cc => cc.BilesenID)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
