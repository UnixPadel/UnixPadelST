using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class OrderApprovalConfiguration : IEntityTypeConfiguration<OrderApproval>
{
    public void Configure(EntityTypeBuilder<OrderApproval> builder)
    {
        builder.ToTable("SiparisOnaylari");

        builder.HasKey(o => o.OnayID);
        builder.Property(o => o.OnayID).HasColumnName("OnayID").ValueGeneratedOnAdd();

        builder.Property(o => o.SiparisNo).HasColumnName("SiparisNo").IsRequired().HasMaxLength(50);
        builder.Property(o => o.KullaniciID).HasColumnName("KullaniciID").IsRequired();
        builder.Property(o => o.OnayDurumu).HasColumnName("OnayDurumu").IsRequired().HasMaxLength(20);
        builder.Property(o => o.Aciklama).HasColumnName("Aciklama").HasColumnType("text");
        builder.Property(o => o.OnayTarih).HasColumnName("OnayTarih");

        builder.HasIndex(o => o.SiparisNo);
    }
}
