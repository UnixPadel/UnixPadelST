using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class ProductCategoryConfiguration : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> builder)
    {
        builder.ToTable("UrunKategorileri");

        builder.HasKey(c => c.KategoriID);
        builder.Property(c => c.KategoriID)
               .HasColumnName("KategoriID")
               .ValueGeneratedOnAdd();

        builder.Property(c => c.KategoriAdi).HasColumnName("KategoriAdi").IsRequired().HasMaxLength(200);
        builder.Property(c => c.Fiyat)      .HasColumnName("Fiyat").HasColumnType("int");

        builder.HasMany(c => c.CategoryComponents)
               .WithOne(cc => cc.Category)
               .HasForeignKey(cc => cc.KategoriID)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
