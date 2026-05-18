using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class DeliveryAddressConfiguration : IEntityTypeConfiguration<DeliveryAddress>
{
    public void Configure(EntityTypeBuilder<DeliveryAddress> builder)
    {
        builder.ToTable("TeslimatBilgisiTablo");

        builder.HasKey(a => a.TeslimatBilgiID);
        builder.Property(a => a.TeslimatBilgiID)
               .HasColumnName("TeslimatBilgiID")
               .ValueGeneratedOnAdd();

        builder.Property(a => a.TeslimAlanAdi).HasColumnName("TeslimAlanAdi").IsRequired().HasMaxLength(200);
        builder.Property(a => a.IlgiliKisi)   .HasColumnName("IlgiliKisi")   .HasMaxLength(200);
        builder.Property(a => a.UlkeID)       .HasColumnName("UlkeID");
        builder.Property(a => a.ZipKod)       .HasColumnName("ZipKod")       .HasMaxLength(20);
        builder.Property(a => a.Telefon)      .HasColumnName("Telefon")      .HasMaxLength(100);
        builder.Property(a => a.AltTelefon)   .HasColumnName("AltTelefon")   .HasMaxLength(100);
        builder.Property(a => a.TelUlkeKodu)  .HasColumnName("TelUlkeKodu")  .HasMaxLength(20);
        builder.Property(a => a.AltTelUlkeKodu).HasColumnName("AltTelUlkeKodu").HasMaxLength(20);
        // Column name is literally "E_Mail" — preserved exactly
        builder.Property(a => a.E_Mail)       .HasColumnName("E_Mail")       .HasMaxLength(200);
        builder.Property(a => a.VATNumarasi)  .HasColumnName("VATNumarasi")  .HasMaxLength(100);
        builder.Property(a => a.Adres)        .HasColumnName("Adres")        .HasMaxLength(500);

        builder.Ignore(a => a.Ulke);
    }
}
