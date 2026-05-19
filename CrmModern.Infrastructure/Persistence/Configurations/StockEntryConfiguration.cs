using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class StockEntryConfiguration : IEntityTypeConfiguration<StockEntry>
{
    public void Configure(EntityTypeBuilder<StockEntry> builder)
    {
        builder.ToTable("StokTablo");

        builder.HasKey(s => s.ID);
        builder.Property(s => s.ID).HasColumnName("ID").ValueGeneratedOnAdd();
        builder.Property(s => s.Urun).HasColumnName("Urun").IsRequired().HasMaxLength(50);
        builder.Property(s => s.Adet).HasColumnName("Adet").IsRequired();
    }
}
