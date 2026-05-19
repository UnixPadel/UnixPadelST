using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class ExcelTemplateConfiguration : IEntityTypeConfiguration<ExcelTemplate>
{
    public void Configure(EntityTypeBuilder<ExcelTemplate> builder)
    {
        builder.ToTable("ExcelIndir");

        builder.HasKey(t => t.ID);
        builder.Property(t => t.ID)
               .HasColumnName("ID")
               .ValueGeneratedOnAdd();

        builder.Property(t => t.Excel)
               .HasColumnName("Excel")
               .HasColumnType("mediumblob")
               .IsRequired();
    }
}
