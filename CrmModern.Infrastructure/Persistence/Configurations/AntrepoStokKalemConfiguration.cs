using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class AntrepoStokKalemConfiguration : IEntityTypeConfiguration<AntrepoStokKalem>
{
    public void Configure(EntityTypeBuilder<AntrepoStokKalem> builder)
    {
        builder.ToTable("AntrepoStokKalem");

        builder.HasKey(k => k.Id);
        builder.Property(k => k.Id).HasColumnName("Id").ValueGeneratedOnAdd();

        builder.Property(k => k.BeyannameId)         .HasColumnName("BeyannameId");
        builder.HasIndex(k => k.BeyannameId);

        builder.Property(k => k.Konum)               .HasColumnName("Konum")               .HasMaxLength(20).IsRequired();
        builder.HasIndex(k => k.Konum);

        builder.Property(k => k.MalAdi)              .HasColumnName("MalAdi")              .HasMaxLength(255).IsRequired();
        builder.Property(k => k.TicariTanim)         .HasColumnName("TicariTanim")         .HasColumnType("text");
        builder.Property(k => k.Miktar)              .HasColumnName("Miktar")              .HasColumnType("decimal(18,3)");
        builder.Property(k => k.Birim)               .HasColumnName("Birim")               .HasMaxLength(30).IsRequired();
        builder.Property(k => k.KapAdedi)            .HasColumnName("KapAdedi")            .HasColumnType("decimal(18,2)");
        builder.Property(k => k.KapCinsi)            .HasColumnName("KapCinsi")            .HasMaxLength(50);
        builder.Property(k => k.Gtip)                .HasColumnName("Gtip")                .HasMaxLength(30);
        builder.Property(k => k.MenseUlke)           .HasColumnName("MenseUlke")           .HasMaxLength(50);
        builder.Property(k => k.BrutKg)              .HasColumnName("BrutKg")              .HasColumnType("decimal(18,2)");
        builder.Property(k => k.NetKg)               .HasColumnName("NetKg")               .HasColumnType("decimal(18,2)");
        builder.Property(k => k.KalemNo)             .HasColumnName("KalemNo");
        builder.Property(k => k.KalemFiyati)         .HasColumnName("KalemFiyati")         .HasColumnType("decimal(18,2)");
        builder.Property(k => k.OlusturanKullaniciID).HasColumnName("OlusturanKullaniciID");
        builder.Property(k => k.OlusturmaTarihi)     .HasColumnName("OlusturmaTarihi");
    }
}
