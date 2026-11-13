using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class AntrepoStokCikisConfiguration : IEntityTypeConfiguration<AntrepoStokCikis>
{
    public void Configure(EntityTypeBuilder<AntrepoStokCikis> builder)
    {
        builder.ToTable("AntrepoStokCikis");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("Id").ValueGeneratedOnAdd();

        builder.Property(c => c.KalemId)           .HasColumnName("KalemId");
        builder.HasIndex(c => c.KalemId);

        builder.Property(c => c.Miktar)            .HasColumnName("Miktar")            .HasColumnType("decimal(18,3)");
        builder.Property(c => c.KapAdedi)          .HasColumnName("KapAdedi")          .HasColumnType("decimal(18,2)");
        builder.Property(c => c.Tarih)             .HasColumnName("Tarih");
        builder.Property(c => c.Aciklama)          .HasColumnName("Aciklama")          .HasMaxLength(500);
        builder.Property(c => c.GirenKullaniciID)  .HasColumnName("GirenKullaniciID");
        builder.Property(c => c.KayitZamani)       .HasColumnName("KayitZamani");
        builder.Property(c => c.GeriAlinmaZamani)  .HasColumnName("GeriAlinmaZamani");
        builder.Property(c => c.GeriAlanKullaniciID).HasColumnName("GeriAlanKullaniciID");
    }
}
