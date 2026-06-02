# Faz 6 — Kanonik Tablo + Şema Kararları

_Tarih: 2026-05-06_

## 1. Kanonik Tablo (6.1.a)

**Karar: `SatinAlmaTalep` (tekil) kanoniktir.**

### Kanıt

| Form | Hangi tabloyu kullanıyor |
|---|---|
| `SatinAlmaForm.cs` INSERT | `SatinAlmaTalep` |
| `SatinAlimOnIzlemeForm.cs` SELECT/UPDATE | `SatinAlmaTalep` |
| `SatinAlmaTakipForm.cs` SELECT/UPDATE | `SatinAlmaTalep` |
| `SatinAlmaOnayForm.cs` SELECT/UPDATE | `SatinAlmaTalep` |
| `SatinAlmaTumTalepForm.cs` SELECT | `SatinAlmaTalep` |
| `SatinAlmaMigrations.cs` ALTER TABLE | `SatinAlmaTalep` |
| `Muhasebe.cs::odmeButton` (Faz 5'te tespit) | `SatinAlmaTalep` |

WinForms tarafının tamamı `SatinAlmaTalep` (tekil) tablosuna yazıp okuyor. **`SatinAlmaTalepleri` (çoğul)** ise:
- 4 kolon: `TalepID, KullaniciID, OlusturmaTarihi, Durum (enum: 'Beklemede','MuhasebeOnay','YoneticiOnay','Tamamlandi','Reddedildi'), Aciklama`
- 0 üretim satırı
- `TalepOnaylari.TalepID`'ye FK — alternatif/erken bir tasarım denemesi izlenimi veriyor
- **WinForms tarafı bu tabloya YAZMIYOR**

### Karar
- Modern API yalnız `SatinAlmaTalep` ile çalışacak. `PurchaseRequest.ToTable("SatinAlmaTalep")` Faz 0'da zaten doğru ayarlanmıştı — değişiklik yok.
- `SatinAlmaTalepleri` ve `TalepOnaylari` tabloları **silinmedi** (kullanıcı kuralı), `db-schema-snapshot.md`'de görünüyor ama modern API tarafından dokunulmuyor (ileride istenirse temizlik Faz 8 cila işi).

---

## 2. Şema Migration Kararı (6.1.b)

**Karar: Seçenek (i) — entity-only.** DB'de tüm 17 ödeme/ön-izleme kolonu **ZATEN MEVCUT**.

### Kanıt
`docs/db-schema-snapshot.md`'deki `### \`SatinAlmaTalep\`` bölümünde 45 kolon var. Aşağıdaki 17 kolon tamamı mevcut:

| # | Kolon | Tip | Null |
|---|---|---|---|
| 1 | `Notlar` | `text` | YES |
| 2 | `OnIzlemeYapan` | `varchar(100)` | YES |
| 3 | `OnIzlemeTarihi` | `datetime` | YES |
| 4 | `OdemeTuru` | `varchar(50)` | YES |
| 5 | `OdenenTutar` | `decimal(18,2)` | YES |
| 6 | `OdemeTutari` | `decimal(18,2)` | YES |
| 7 | `OdemeVadeSuresi` | **`varchar(50)`** ⚠ | YES |
| 8 | `OdemeVadeTutari` | `decimal(18,2)` | YES |
| 9 | `OdemeVadeTarihi` | **`date`** (datetime değil) | YES |
| 10 | `OdemeBelgeNo` | `varchar(100)` | YES |
| 11 | `OdemeBankaAdi` | `varchar(100)` | YES |
| 12 | `OdemeIslemTarihi` | `datetime` | YES |
| 13 | `OdemeKartTipi` | `varchar(100)` | YES |
| 14 | `OdemeTaksitSayisi` | `int` | YES |
| 15 | `OdemeAciklama` | `text` | YES |
| 16 | `MuhasebeYapanKullanici` | `varchar(100)` | YES |
| 17 | `MuhasebeTarihi` | `datetime` | YES |

> ⚠ **Memory düzeltmesi:** `OdemeVadeSuresi` `INT` değil **`varchar(50)`** (vade süresini "30 gün" gibi metin olarak tutuyor). `OdemeVadeTarihi` `DATETIME` değil **`date`**. Property tipleri bu DB tiplerine göre yazıldı.

### Sonuç
- Runtime idempotent ALTER TABLE runner **gereksiz** — `SatinAlmaMigrations.cs` WinForms tarafında daha önce çalışmış ve kolonları eklemiş.
- Modern API sadece entity property + Configuration map ekleyecek. Schema dokunulmuyor.
- Eğer ileride başka bir prod DB'de bu kolonlar yoksa, manuel `SatinAlmaTalep_MuhasebeMigration.sql` çalıştırılır — operasyon notu rapora eklenir.
