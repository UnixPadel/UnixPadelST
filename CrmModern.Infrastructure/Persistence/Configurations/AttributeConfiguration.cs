// "Attribute" conflicts with System.Attribute — use alias throughout this file
using EntityAttribute = CrmModern.Core.Entities.Attribute;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class AttributeConfiguration : IEntityTypeConfiguration<EntityAttribute>
{
    public void Configure(EntityTypeBuilder<EntityAttribute> builder)
    {
        builder.ToTable("OznitelikTablo");

        builder.HasKey(a => a.OznitelikID);
        builder.Property(a => a.OznitelikID)
               .HasColumnName("OznitelikID")
               .ValueGeneratedOnAdd();

        builder.Property(a => a.BilesenID).HasColumnName("BilesenID");
        // Column name contains Turkish ı — preserved exactly
        builder.Property(a => a.OznitelikAdı).HasColumnName("OznitelikAdı").IsRequired().HasMaxLength(300);

        // Relationship owned by ComponentConfiguration
    }
}
