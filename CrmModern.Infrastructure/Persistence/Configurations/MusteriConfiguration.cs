using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class MusteriConfiguration : IEntityTypeConfiguration<Musteri>
{
    public void Configure(EntityTypeBuilder<Musteri> builder)
    {
        builder.ToTable("MusteriBilgileri");

        builder.HasKey(m => m.MusteriID);

        builder.Property(m => m.MusteriID)
               .HasColumnName("MusteriID")
               .ValueGeneratedOnAdd();

        builder.Property(m => m.MusteriAd)
               .HasColumnName("MusteriAd")
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(m => m.Telefon)
               .HasColumnName("Telefon")
               .HasMaxLength(50);

        builder.Property(m => m.ZipKod)
               .HasColumnName("ZipKod")
               .HasMaxLength(20);

        // Column name in DB is literally "E_Mail" — preserve exactly
        builder.Property(m => m.E_Mail)
               .HasColumnName("E_Mail")
               .HasMaxLength(200);

        builder.Property(m => m.Adres)
               .HasColumnName("Adres")
               .HasMaxLength(500);

        builder.Property(m => m.VATNumarasi)
               .HasColumnName("VATNumarasi")
               .HasMaxLength(50);

        builder.Property(m => m.UlkelerID)
               .HasColumnName("UlkelerID");

        builder.HasOne(m => m.Ulke)
               .WithMany(u => u.Musteriler)
               .HasForeignKey(m => m.UlkelerID)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
