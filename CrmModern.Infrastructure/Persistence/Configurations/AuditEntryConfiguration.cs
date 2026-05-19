using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class AuditEntryConfiguration : IEntityTypeConfiguration<AuditEntry>
{
    public void Configure(EntityTypeBuilder<AuditEntry> builder)
    {
        builder.ToTable("EklemeGecmisi");

        builder.HasKey(a => a.EklemeID);
        builder.Property(a => a.EklemeID).HasColumnName("EklemeID").ValueGeneratedOnAdd();

        builder.Property(a => a.KategoriID).HasColumnName("KategoriID");
        builder.Property(a => a.KullaniciID).HasColumnName("KullaniciID");
        builder.Property(a => a.Miktar).HasColumnName("Miktar");
        builder.Property(a => a.EklemeTarihi).HasColumnName("EklemeTarihi");
        builder.Property(a => a.Aciklama).HasColumnName("Aciklama").HasColumnType("text");

        // Faz 8 kolonları (idempotent migrator ekledi)
        builder.Property(a => a.Action).HasColumnName("Action").HasMaxLength(64);
        builder.Property(a => a.EntityType).HasColumnName("EntityType").HasMaxLength(64);
        builder.Property(a => a.EntityId).HasColumnName("EntityId").HasMaxLength(64);
        builder.Property(a => a.Details).HasColumnName("Details").HasColumnType("text");
    }
}
