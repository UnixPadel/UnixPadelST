using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class CategoryComponentConfiguration : IEntityTypeConfiguration<CategoryComponent>
{
    public void Configure(EntityTypeBuilder<CategoryComponent> builder)
    {
        builder.ToTable("KategoriBilesenleri");

        // Composite PK — join table with Adet payload
        builder.HasKey(cc => new { cc.KategoriID, cc.BilesenID });

        builder.Property(cc => cc.KategoriID).HasColumnName("KategoriID");
        builder.Property(cc => cc.BilesenID) .HasColumnName("BilesenID");
        builder.Property(cc => cc.Adet)      .HasColumnName("Adet");

        // Relationships are owned by ProductCategoryConfiguration and ComponentConfiguration
    }
}
