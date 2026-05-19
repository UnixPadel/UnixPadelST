using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class AccountingTransactionConfiguration : IEntityTypeConfiguration<AccountingTransaction>
{
    public void Configure(EntityTypeBuilder<AccountingTransaction> builder)
    {
        builder.ToTable("MuhasebeIslemTablo");

        builder.HasKey(a => a.ID);
        builder.Property(a => a.ID).HasColumnName("ID").ValueGeneratedOnAdd();

        builder.Property(a => a.SiparisNo)    .HasColumnName("SiparisNo")    .IsRequired().HasMaxLength(100);
        builder.Property(a => a.MusteriID)    .HasColumnName("MusteriID");
        builder.Property(a => a.KullaniciID)  .HasColumnName("KullaniciID");
        builder.Property(a => a.OdenenMiktar) .HasColumnName("OdenenMiktar") .HasColumnType("decimal(18,2)");
        builder.Property(a => a.Tarih)        .HasColumnName("Tarih");
    }
}
