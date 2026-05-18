using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class KullaniciConfiguration : IEntityTypeConfiguration<Kullanici>
{
    public void Configure(EntityTypeBuilder<Kullanici> builder)
    {
        builder.ToTable("KullaniciBilgileri");

        builder.HasKey(k => k.KullaniciID);

        builder.Property(k => k.KullaniciID)
               .HasColumnName("KullaniciID")
               .ValueGeneratedOnAdd();

        builder.Property(k => k.KullaniciAdi)
               .HasColumnName("KullaniciAdi")
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(k => k.Sifre)
               .HasColumnName("Sifre")
               .IsRequired()
               .HasMaxLength(255);

        builder.Property(k => k.Ad)
               .HasColumnName("Ad")
               .HasMaxLength(100);

        builder.Property(k => k.Soyad)
               .HasColumnName("Soyad")
               .HasMaxLength(100);

        builder.Property(k => k.Email)
               .HasColumnName("Email")
               .HasMaxLength(200);

        builder.Property(k => k.Telefon)
               .HasColumnName("Telefon")
               .HasMaxLength(50);

        builder.Property(k => k.YetkiTuru)
               .HasColumnName("YetkiTuru")
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(k => k.Durum)
               .HasColumnName("Durum")
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(k => k.OlusturmaTarihi)
               .HasColumnName("OlusturmaTarihi");

        builder.Property(k => k.SatinAlmaYetkisi)
               .HasColumnName("SatinAlmaYetkisi");
    }
}
