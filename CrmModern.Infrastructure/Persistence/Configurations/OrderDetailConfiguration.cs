using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class OrderDetailConfiguration : IEntityTypeConfiguration<OrderDetail>
{
    public void Configure(EntityTypeBuilder<OrderDetail> builder)
    {
        builder.ToTable("DetayTablo");

        builder.HasKey(d => d.DetayID);
        builder.Property(d => d.DetayID)
               .HasColumnName("DetayID")
               .ValueGeneratedOnAdd();

        builder.Property(d => d.SiparisNo).HasColumnName("SiparisNo").IsRequired().HasMaxLength(100);
        // C# property "Text" maps to column "Detay"
        builder.Property(d => d.Text).HasColumnName("Detay").HasMaxLength(4000);

        builder.Ignore(d => d.Order);

        builder.HasIndex(d => d.SiparisNo);
    }
}
