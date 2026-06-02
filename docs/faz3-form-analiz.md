# Faz 3 — Sipariş Yaşam Döngüsü Form Analizi

_Kaynaklar: `WindowsFormsApp1\{SiparisForm, Siparislerim, FormGetir, Fabrika}.cs`. Bu doküman Faz 3 portunun "doğruluk kaynağı"dır — kod buna referans verir._

---

## 1. SiparisForm.cs (7853 satır)

### 1.1 Üst Bilgi (Header)

**Kontroller → Kolonlar (`SiparisAlTablo`):**
- Müşteri: `comboBoxMusteriAd → MusteriAd`, `musteriTelefonTextBox → MTelefon`, `musteriMailTextBox → MMail`, `musteriUlkeTextBox → MUlke`, `musteriVATTextBox → MVATNumarasi`, `musteriZipKodTextBox → MZipKod`, `musteriAdresTextBox → MAdres`
- Satıcı (kullanıcı/temsilci snapshot'ı): `kullniciTel → STelefon`, `kullaniciFax → SFax`, `kullaniciWeb → SWeb`, `kullaniciEMail → SE_Mail`, `kullaniciVATNumarasi → SVatNumarasi`, `sUlkeTextBox → SUlke`, `kullaniciAdres → SAdres`
- Para tipi: `paraBirimiCombo → ParaTipi` ∈ {`Euro, Dolar, TL, Sterlin`}
- Şirket: `sirketComboBox → Sirket` (enum: `Unixpadel, ArsSport, AselCocuk`)
- Tarih: `Tarih = NOW()` (otomatik DB tarafında)
- Tür: `SiparisMiTeklifMi` enum — `Teklif | Siparis | Planlama | Uretim | Hazir | Lojistik | Tamamlandi | Iptal`
- Kontrol durumu: `Kontrol` ∈ {`Kontrol, Onay, Reddet`} default `Kontrol`

### 1.2 Kalemler (Items Tab) — BoM Açılımı + Fiyat Formülü

WinForms'ta **5 paralel set sekmesi** (Sipariş 1..5). Her sekmede bir kategori + adet + bileşen DataGrid'i.

**Reçeteden Aç davranışı:**
```pseudocode
ON anaUrunComboBox[i].SelectedIndexChanged:
  SELECT bb.BilesenID, bb.BilesenAdi, bb.Birim, kb.Adet
  FROM BilesenBilgileri bb
  LEFT JOIN KategoriBilesenleri kb
    ON kb.BilesenID = bb.BilesenID AND kb.KategoriID = @SelectedKategoriID
  WHERE kb.KategoriID = @SelectedKategoriID
  ORDER BY bb.BilesenAdi

  bilesenDataGridView[i].Rows.Clear()
  FOR EACH r IN result:
    bilesenDataGridView[i].Rows.Add(r.BilesenID, oznitelikComboBox, r.BilesenAdi, r.Birim, r.Adet, r.Fiyat, r.Adet*r.Fiyat)
```

**Fiyat Formülü (BIREBIR):**
```pseudocode
// Her sekme için ayrı setFiyat
FOR i = 1..5:
  setFiyat[i] = SUM(row.Adet * row.Fiyat) for row in bilesenDataGridView[i]
  tekFiyat[i] = setFiyat[i] / urunNumericUpDown[i].Value   // birim fiyat

// Brüt toplam (indirim/KDV öncesi)
brutToplam = (setFiyat[1] + ... + setFiyat[5]) + montajFiyat + teslimatFiyat

// Net toplam
toplam = brutToplam
       - (brutToplam * Indirim / 100)
       + (brutToplam * Kdv / 100)
```

**Persist:**
- `SiparisIslemTablo` (DELETE-then-INSERT pattern):
  ```sql
  DELETE FROM SiparisIslemTablo WHERE SiparisNo = @SiparisNo
  INSERT INTO SiparisIslemTablo (SiparisNo, TeklifNo, KategoriID, BilesenID, OznitelikAdi, Adet, Fiyat) VALUES ...
  ```
- Hem kategori-seviye satırı (BilesenID=NULL, KategoriID=set, Adet=set adedi) hem bileşen-seviye satırları (KategoriID=NULL, BilesenID=set, Adet/Fiyat) yazılır.

### 1.3 Teslimat Adresleri

**Form üzerinde 5 adres alanı (her sekme için 1).** Persist iki tabloya:
- `SiparisAlTablo` üzerine **birinci adresin** snapshot kolonları: `TTeslimAlanAdi, TIlgiliKisi, TTelefon, TAltTelefon, TE_Mail, TVATNumarasi, TZipKod, TUlke, TAdres` + montaj/teslimat fiyatları.
- `SiparisTeslimatTablo` (DETAY): kalan adresler için satır başına bir kayıt — **Faz 3'te buraya yazma yetkisi** entity'leşince açılır.
- Adres kişi tablosuna eklenirken (yeni kontak): `TeslimatBilgisiTablo` (adres defteri) — modern karşılığı zaten `DeliveryAddress` entity.

### 1.4 Ek Dosyalar (BLOB)

- `SiparisAlTablo.Ek` (`mediumblob`): kullanıcı tarafından yüklenen genel ek (PDF/JPG vb.).
- `SiparisAlTablo.MuhasebeEk` (`mediumblob`): muhasebe departmanının yüklediği dosya (genelde ZIP).
- WinForms okuma:
  ```csharp
  byte[] data = (byte[])reader["Ek"];
  File.WriteAllBytes(downloads + "ek_" + siparisNo + ".bin", data);
  ```
- Yazma:
  ```csharp
  byte[] data = File.ReadAllBytes(path);
  cmd.Parameters.AddWithValue("@Ek", data);
  ```
- **MIME bilgisi DB'de saklanmıyor** — modern API uzantıyı orijinal yüklenen dosyanın adından çıkarır ve `Content-Disposition` ile sağlar (varsayılan `.bin` fallback).

### 1.5 Onay Akışı

WinForms'ta üç giriş aksiyonu vardır:

1. **`siparisAlButon`** ("Sipariş Kaydı") → `SiparisMiTeklifMi='Siparis'`, `Kontrol='Kontrol'` (yeni kayıt onay bekliyor olarak başlar). Numara: `tempSiparisNumarasi` = `"S" + Ad[0:2] + Soyad[0:2] + YYMMDD + seq`.
2. **`teklifAlButonu`** ("Teklif Hazırla") → `SiparisMiTeklifMi='Teklif'`. Numara: `"T" + Ad[0:2] + Soyad[0:2] + YYMMDD + seq`.
3. **`revizeEtButton`** ("Revize Et") → SiparisNo'ya `-N` suffix'i ekleyerek yeni kayıt.

Konfirm/Red işlemi (KontrolForm.cs / KontrolRed.cs):
- `Kontrol = 'Onay'` veya `Kontrol = 'Reddet'`
- Reddedilirse `Red` kolonuna metin yazılır.

**SiparisOnaylari tablosu** (Faz 3 yeni entity):
- `OnayID, SiparisNo, KullaniciID, OnayDurumu (default 'Beklemede'), Aciklama, OnayTarih`
- Modern API her aşama değişikliğinde buraya 1 satır INSERT eder (audit log).

### 1.6 Kolon Sözlüğü (kritik alanlar)

| Kolon | Anlam | Değer Setleri |
|---|---|---|
| `SiparisMiTeklifMi` | Yaşam döngüsü aşaması | `Teklif/Siparis/Planlama/Uretim/Hazir/Lojistik/Tamamlandi/Iptal` |
| `Kontrol` | Onay durumu | `Kontrol/Onay/Reddet` (default `Kontrol`) |
| `STarih` | Üretime giriş tarihi (FabrikaYontim) | `date` |
| `FabrikaNot` | Fabrika notu | text |
| `LojistikNot` | Lojistik notu | text |
| `KontrolNot` | Kontrol notu | text |
| `ParaTipi` | Para birimi | `Euro/Dolar/TL/Sterlin` |
| `Sirket` | Firma | enum `Unixpadel/ArsSport/AselCocuk` |
| `OdemeDurum` | Muhasebe ödeme durumu | string default `Beklemede` |
| `Muhasebe/Fabrika/SatinAlma/Uretim/Lojistik` | Departman boolean bayrakları | tinyint(1) |

---

## 2. Siparislerim.cs

```sql
SELECT
  IFNULL(SiparisNo, TeklifNo) AS Numara,
  MusteriAd,
  CASE WHEN SiparisMiTeklifMi='Teklif' THEN 'Teklif' ELSE 'Sipariş' END AS Asama,
  Kontrol AS Durum,
  Tarih
FROM SiparisAlTablo
WHERE KullaniciID = @CurrentUserID
ORDER BY SiparisAlID DESC
```

**Satır aksiyonları (DataGridViewButtonColumn):**
- "Form Göster" → `SiparisForm` aç (edit moda)
- "Siparişe Çevir" → `UPDATE SET SiparisMiTeklifMi='Siparis' WHERE TeklifNo=@no` (sadece teklif satırlarında)
- "Red Notu" → `Red` kolonunu göster (reddedildiyse)

---

## 3. FormGetir.cs (Klonla)

**Açılış parametresi:** `SiparisNo` (T-prefix gelirse S-prefix'e çevrilir)

```csharp
SELECT * FROM SiparisAlTablo WHERE SiparisNo = @SiparisNo
// Tüm header alanları forma yüklenir
SELECT si.OznitelikAdi, bb.BilesenAdi, bb.Birim, si.Adet, si.Fiyat
FROM SiparisIslemTablo si LEFT JOIN BilesenBilgileri bb ON si.BilesenID = bb.BilesenID
WHERE si.SiparisNo = @SiparisNo
```

**Kopyalanan alanlar:** Tüm müşteri/satıcı/montaj/teslimat/fiyat alanları + items.
**Sıfırlanan alanlar:** `SiparisNo`, `TeklifNo`, `Kontrol='Kontrol'`, `Tarih=NOW()`, `STarih=NULL`, `Ek`, `MuhasebeEk`.
**Yeni numara:** Kullanıcı "Sipariş Al" butonuna basınca SiparisForm'daki `tempSiparisNumarasi` algoritmasıyla yeniden üretilir.

**MuhasebeEk indirme** (`button1_Click`): BLOB `Downloads\muhasebe_ek_{SiparisNo}.zip` olarak yazılır.

---

## 4. Fabrika.cs Devir Özellikleri (Faz 2'den Faz 3'e)

### 4.1 Çoklu Filtre WHERE Pattern

```sql
WHERE 1=1
  [AND SiparisNo LIKE @SiparisNo]
  [AND MusteriAd LIKE @MusteriAd]
  [AND KullaniciID = @KullaniciID]
  [AND MUlke = @MUlke]
  [AND OdemeDurum = @OdemeDurum]
  [AND SiparisMiTeklifMi = @Asama]
  [AND ParaTipi = @ParaTipi]
  [AND Tarih BETWEEN @BaslangicTarih AND @BitisTarih]
ORDER BY SiparisAlID DESC
LIMIT @PageSize OFFSET @Offset
```

### 4.2 ExcelIndir BLOB Template

`ExcelIndir` tablosu (snapshot.md'de var):
```
| Kolon | Tip |
|---|---|
| Excel | mediumblob |
```
**SQL:** `SELECT Excel FROM ExcelIndir LIMIT 1` (tek satır blob).

**Placeholder formatı:** WinForms'ta `#URUN`, `#MIKTAR`, `#BIRIM`, `#FIYAT`, `#SIPARISNO`, `#TARIH`, `#MUSTERI`, `#MUSTERIADRES`, `#MUSTERINUMBER`, `#BIRIMFIYAT`, `#MONTAJ`, `#MONTAJFIYAT`, `#TESLIMAT`, `#TESLIMATFIYAT` — string-replace.

**Karar (modern):** Eğer `ExcelIndir` tablosu DB'de boş ya da BLOB yok → **fallback: ClosedXML ile sade rapor xlsx üret** (header + items tablosu + toplam). Faz 3 raporunda "BLOB template bulunamadı, sade üretildi" notu.

### 4.3 Ek/MuhasebeEk İndirme

`SiparisAlTablo.Ek` ve `SiparisAlTablo.MuhasebeEk` BLOB'ları doğrudan REST üzerinden `application/octet-stream` ile indirilir (modern API).

### 4.4 Döviz Bazlı Toplam

```pseudocode
SELECT ParaTipi, SUM(ToplamFiyat) AS Toplam
FROM SiparisAlTablo
WHERE [filtre]
GROUP BY ParaTipi
```
Modern API endpoint: `GET /api/orders/totals?...filter` → 4 döviz kartı.

---

## 5. Yetki Notu (Form3 yetki matrisinden)

| Rol | Yeni Sipariş | Görüntüle (kendi) | Görüntüle (tüm) | Onay/Red | Excel | Ek dosya |
|---|---|---|---|---|---|---|
| Yonetici | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Temsilci | ✅ | ✅ (kendi) | ❌ | ❌ | ❌ | yükler |
| Muhasebe | ❌ | ❌ | ✅ (muhasebe) | ❌ | ✅ | yükler (`MuhasebeEk`) |
| Fabrika | ❌ | ❌ | ✅ (üretim) | ❌ | ✅ | indirir |
| Lojistik | ❌ | ❌ | ✅ (lojistik) | ❌ | ❌ | — |
| Gozlemci | ❌ | ✅ (read) | ✅ (read) | ❌ | ❌ | indirir |
