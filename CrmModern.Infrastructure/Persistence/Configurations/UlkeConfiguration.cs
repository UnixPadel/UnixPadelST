using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class UlkeConfiguration : IEntityTypeConfiguration<Ulke>
{
    public void Configure(EntityTypeBuilder<Ulke> builder)
    {
        builder.ToTable("UlkelerBilgileri");

        builder.HasKey(u => u.UlkelerID);

        builder.Property(u => u.UlkelerID)
               .HasColumnName("UlkelerID")
               .ValueGeneratedOnAdd();

        builder.Property(u => u.UlkeAdi)
               .HasColumnName("UlkeAdi")
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(u => u.NumaraBirimi)
               .HasColumnName("NumaraBirimi")
               .HasMaxLength(20);

        builder.Property(u => u.Bolge)
               .HasColumnName("Bolge")
               .HasMaxLength(100);
    }
}
