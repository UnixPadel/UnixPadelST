using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class CompletedOrderConfiguration : IEntityTypeConfiguration<CompletedOrder>
{
    public void Configure(EntityTypeBuilder<CompletedOrder> builder)
    {
        builder.ToTable("TamamlandiTablo");

        builder.HasKey(c => c.ID);
        builder.Property(c => c.ID).HasColumnName("ID").ValueGeneratedOnAdd();
        builder.Property(c => c.SiparisNo).HasColumnName("SiparisNo").HasMaxLength(50);
        // DB kolonu "KullaniciAdi" ama tipi int — int FK olarak property'ye bind ediyoruz
        builder.Property(c => c.KullaniciID).HasColumnName("KullaniciAdi");
        builder.Property(c => c.Tarih).HasColumnName("Tarih");
        builder.Property(c => c.OncekiAsama).HasColumnName("OncekiAsama").HasMaxLength(30);
        builder.Property(c => c.Aciklama).HasColumnName("Aciklama").HasMaxLength(500);
    }
}
