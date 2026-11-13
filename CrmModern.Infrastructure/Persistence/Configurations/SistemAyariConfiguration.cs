using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class SistemAyariConfiguration : IEntityTypeConfiguration<SistemAyari>
{
    public void Configure(EntityTypeBuilder<SistemAyari> builder)
    {
        builder.ToTable("SistemAyarlari");

        builder.HasKey(s => s.Anahtar);
        builder.Property(s => s.Anahtar).HasColumnName("Anahtar").HasMaxLength(100);

        builder.Property(s => s.Deger)                 .HasColumnName("Deger")                 .HasColumnType("text");
        builder.Property(s => s.GuncelleyenKullaniciID).HasColumnName("GuncelleyenKullaniciID");
        builder.Property(s => s.GuncellemeZamani)      .HasColumnName("GuncellemeZamani");
    }
}
