using CrmModern.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CrmModern.Infrastructure.Persistence.Configurations;

internal sealed class PurchaseRequestConfiguration : IEntityTypeConfiguration<PurchaseRequest>
{
    public void Configure(EntityTypeBuilder<PurchaseRequest> builder)
    {
        builder.ToTable("SatinAlmaTalep");

        builder.HasKey(p => p.TalepID);
        builder.Property(p => p.TalepID).HasColumnName("TalepID").ValueGeneratedOnAdd();

        builder.Property(p => p.UrunAdi)               .HasColumnName("UrunAdi")               .IsRequired().HasMaxLength(500);
        builder.Property(p => p.UrunTuru)               .HasColumnName("UrunTuru")               .HasMaxLength(500);
        builder.Property(p => p.UrunMaliyeti)           .HasColumnName("UrunMaliyeti")           .HasColumnType("decimal(18,2)");
        builder.Property(p => p.ParaBirimi)             .HasColumnName("ParaBirimi")             .HasMaxLength(8);
        builder.Property(p => p.AlinanYer)              .HasColumnName("AlinanYer")              .HasMaxLength(500);
        builder.Property(p => p.TalepEdenKullaniciAdi)  .HasColumnName("TalepEdenKullaniciAdi")  .HasMaxLength(200);
        builder.Property(p => p.Departman)              .HasColumnName("Departman")              .HasMaxLength(100);
        builder.Property(p => p.TalepTarihi)            .HasColumnName("TalepTarihi");
        builder.Property(p => p.Durum)                  .HasColumnName("Durum")                  .HasMaxLength(50);
        builder.Property(p => p.RedNotu)                .HasColumnName("RedNotu")                .HasMaxLength(2000);
        builder.Property(p => p.IslemYapanKullanici)    .HasColumnName("IslemYapanKullanici")    .HasMaxLength(200);
        builder.Property(p => p.IslemTarihi)            .HasColumnName("IslemTarihi");
        builder.Property(p => p.TalepTipi)              .HasColumnName("TalepTipi")              .HasMaxLength(50);
        builder.Property(p => p.MusteriAdi)             .HasColumnName("MusteriAdi")             .HasMaxLength(300);
        builder.Property(p => p.ToplamSiparis)          .HasColumnName("ToplamSiparis")          .HasColumnType("decimal(18,2)");
        builder.Property(p => p.KaporaBakiyesi)         .HasColumnName("KaporaBakiyesi")         .HasColumnType("decimal(18,2)");
        builder.Property(p => p.KalanBakiyeTalep)       .HasColumnName("KalanBakiyeTalep")       .HasColumnType("decimal(18,2)");
        builder.Property(p => p.PesinYuzde)             .HasColumnName("PesinYuzde")             .HasColumnType("decimal(18,4)");
        builder.Property(p => p.Maliyet)                .HasColumnName("Maliyet")                .HasColumnType("decimal(18,2)");
        builder.Property(p => p.MaliyetDetayi)          .HasColumnName("MaliyetDetayi")          .HasMaxLength(2000);
        builder.Property(p => p.Kar)                    .HasColumnName("Kar")                    .HasColumnType("decimal(18,2)");
        builder.Property(p => p.SiparisNo)              .HasColumnName("SiparisNo")              .HasMaxLength(100);

        // ── Faz 6: 17 ödeme / ön-izleme kolonu ────────────────────────────────
        builder.Property(p => p.Notlar)                 .HasColumnName("Notlar")                 .HasColumnType("text");
        builder.Property(p => p.OnIzlemeYapan)          .HasColumnName("OnIzlemeYapan")          .HasMaxLength(100);
        builder.Property(p => p.OnIzlemeTarihi)         .HasColumnName("OnIzlemeTarihi");
        builder.Property(p => p.OdemeTuru)              .HasColumnName("OdemeTuru")              .HasMaxLength(50);
        builder.Property(p => p.OdenenTutar)            .HasColumnName("OdenenTutar")            .HasColumnType("decimal(18,2)");
        builder.Property(p => p.OdemeTutari)            .HasColumnName("OdemeTutari")            .HasColumnType("decimal(18,2)");
        builder.Property(p => p.OdemeVadeSuresi)        .HasColumnName("OdemeVadeSuresi")        .HasMaxLength(50);
        builder.Property(p => p.OdemeVadeTutari)        .HasColumnName("OdemeVadeTutari")        .HasColumnType("decimal(18,2)");
        builder.Property(p => p.OdemeVadeTarihi)        .HasColumnName("OdemeVadeTarihi")        .HasColumnType("date");
        builder.Property(p => p.OdemeBelgeNo)           .HasColumnName("OdemeBelgeNo")           .HasMaxLength(100);
        builder.Property(p => p.OdemeBankaAdi)          .HasColumnName("OdemeBankaAdi")          .HasMaxLength(100);
        builder.Property(p => p.OdemeIslemTarihi)       .HasColumnName("OdemeIslemTarihi");
        builder.Property(p => p.OdemeKartTipi)          .HasColumnName("OdemeKartTipi")          .HasMaxLength(100);
        builder.Property(p => p.OdemeTaksitSayisi)      .HasColumnName("OdemeTaksitSayisi");
        builder.Property(p => p.OdemeAciklama)          .HasColumnName("OdemeAciklama")          .HasColumnType("text");
        builder.Property(p => p.MuhasebeYapanKullanici) .HasColumnName("MuhasebeYapanKullanici") .HasMaxLength(100);
        builder.Property(p => p.MuhasebeTarihi)         .HasColumnName("MuhasebeTarihi");
    }
}
