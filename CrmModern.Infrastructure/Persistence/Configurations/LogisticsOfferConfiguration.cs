using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class LogisticsOfferConfiguration : IEntityTypeConfiguration<LogisticsOffer>
{
    public void Configure(EntityTypeBuilder<LogisticsOffer> builder)
    {
        builder.ToTable("LojistikTeklifTablo");

        builder.HasKey(o => o.TeklifID);
        builder.Property(o => o.TeklifID).HasColumnName("TeklifID").ValueGeneratedOnAdd();

        // Kolon adları/uzunlukları DatabaseSchemaMigrator'daki CREATE TABLE ile birebir.
        builder.Property(o => o.SiparisNo)      .HasColumnName("SiparisNo")      .HasMaxLength(50);
        builder.Property(o => o.KullaniciID)    .HasColumnName("KullaniciID");
        builder.Property(o => o.FirmaAdi)       .HasColumnName("FirmaAdi")       .HasMaxLength(255);
        builder.Property(o => o.LojistikCesit)  .HasColumnName("LojistikCesit")  .HasMaxLength(64);
        builder.Property(o => o.Fiyat)          .HasColumnName("Fiyat")          .HasColumnType("decimal(18,2)");
        builder.Property(o => o.Aciklama)       .HasColumnName("Aciklama")       .HasColumnType("text");
        builder.Property(o => o.Durum)          .HasColumnName("Durum")          .HasMaxLength(16);
        builder.Property(o => o.OlusturmaTarihi).HasColumnName("OlusturmaTarihi");
        builder.Property(o => o.OnayKullaniciID).HasColumnName("OnayKullaniciID");
        builder.Property(o => o.OnayTarihi)     .HasColumnName("OnayTarihi");
        builder.Property(o => o.RedNotu)        .HasColumnName("RedNotu")        .HasColumnType("text");
    }
}
