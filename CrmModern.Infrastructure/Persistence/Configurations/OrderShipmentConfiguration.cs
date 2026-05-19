using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class OrderShipmentConfiguration : IEntityTypeConfiguration<OrderShipment>
{
    public void Configure(EntityTypeBuilder<OrderShipment> builder)
    {
        builder.ToTable("SiparisTeslimatTablo");

        builder.HasKey(s => s.SiparisID);
        builder.Property(s => s.SiparisID).HasColumnName("SiparisID").ValueGeneratedOnAdd();

        builder.Property(s => s.SiparisNo).HasColumnName("SiparisNo").HasMaxLength(50);
        builder.Property(s => s.TeklifNo).HasColumnName("TeklifNo").HasMaxLength(50);
        builder.Property(s => s.Montaj).HasColumnName("Montaj").HasMaxLength(10);
        builder.Property(s => s.Teslimat).HasColumnName("Teslimat").HasMaxLength(10);
        builder.Property(s => s.MontajFiyat).HasColumnName("MontajFiyat").HasColumnType("decimal(10,2)");
        builder.Property(s => s.TeslimatFiyat).HasColumnName("TeslimatFiyat").HasColumnType("decimal(10,2)");
        // Türkçe karakterli kolon adı korunur
        builder.Property(s => s.TeslimatCesiti).HasColumnName("TeslimatÇeşiti").HasMaxLength(10);
        builder.Property(s => s.TTeslimAlanAdi).HasColumnName("TTeslimAlanAdi").HasMaxLength(255);
        builder.Property(s => s.TIlgiliKisi).HasColumnName("TIlgiliKisi").HasMaxLength(255);
        builder.Property(s => s.TTelefon).HasColumnName("TTelefon").HasMaxLength(20);
        builder.Property(s => s.TAltTelefon).HasColumnName("TAltTelefon").HasMaxLength(20);
        builder.Property(s => s.TE_Mail).HasColumnName("TE_Mail").HasMaxLength(255);
        builder.Property(s => s.TVATNumarasi).HasColumnName("TVATNumarasi").HasMaxLength(50);
        builder.Property(s => s.TZipKod).HasColumnName("TZipKod").HasMaxLength(30);
        builder.Property(s => s.TUlke).HasColumnName("TUlke").HasMaxLength(40);
        builder.Property(s => s.TAdres).HasColumnName("TAdres").HasColumnType("text");

        builder.HasIndex(s => s.SiparisNo);
    }
}
