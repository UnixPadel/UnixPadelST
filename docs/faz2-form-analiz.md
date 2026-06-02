# Faz 2 — WinForms Form Davranış Analizi

_Kaynak: `WindowsFormsApp1\{MusteriEkle, AnaUrun, Bilesen, Recete, Fabrika, FabrikaYontim}.cs`. Bu dokuman hangi davranışın modern tarafa neye port edileceğini sabitler. WinForms'ta ne yapılıyorsa modern API/UI da aynısını yapar — refactor yok._

---

## 1. MusteriEkle.cs

**Tablolar**
- SELECT: `UlkelerBilgileri`, `MusteriBilgileri`
- INSERT: `MusteriBilgileri (MusteriAd, Telefon, ZipKod, E_Mail, Adres, VATNumarasi, UlkelerID)`
- INSERT (Tab2): `UlkelerBilgileri (UlkeAdi, NumaraBirimi)`

**Aksiyonlar**
- **Müşteri Ekle**: Yukarıdaki INSERT'i atar. Önce `MusteriAd` benzersizlik kontrolü (`SELECT COUNT(*) ... WHERE MusteriAd = @MusteriAd`). Aynı isim varsa kullanıcı uyarılır.
- **Ülke Ekle**: `UlkeAdi` benzersizlik kontrolü, ardından INSERT.

**Validation**
- Tüm alanlar `NotEmpty`: MusteriAd, Telefon, E-Mail, Adres, ZipKod, VATNumarasi.
- `UlkelerComboBox.SelectedValue != null`.
- Ülke Ekle: `UlkeAdi` ve `NumaraBirimi` zorunlu.

**Özel Mantık**
- Ülke seçildiğinde `NumaraBirimi` otomatik olarak `musteriTelefonKodTextBox`'a doldurulur (Türkiye → "+90" gibi).
- Müşteri adı uniqueness — backend'de aynı kontrol var (`MusteriRepository.MusteriAdExistsAsync`).

**Modern Karşılığı**
- `POST /api/musteri` — uniqueness + tüm Required alanlar (mevcut).
- `POST /api/musteri/ulkeler` — uniqueness (mevcut).
- Frontend: ülke seçince telefon kodu prefix dropdown'da görünür.

---

## 2. AnaUrun.cs

**Tablolar**
- SELECT: `UrunKategorileri (KategoriID, KategoriAdi)`
- INSERT: `UrunKategorileri (KategoriAdi)`

**Aksiyonlar**
- **Ekle**: `KategoriAdi` ile yeni kategori. Validation: `kategoriTextBox` NotEmpty.

**Özel Mantık**
- DataGridView yenilemesi her ekleme sonrası SELECT ile yeniden doldurulur.
- WinForms'ta UPDATE/DELETE buton **yok** — kategoriler sadece eklenir, silinmez/değiştirilmez. (Recete.cs içinde fiyat güncellenir.)

**Modern Karşılığı**
- `GET /api/product-catalog/categories` (mevcut)
- `POST /api/product-catalog/categories` (mevcut)
- `PUT /api/product-catalog/categories/{id}` ve `DELETE` — WinForms'ta yok ama modern UI tutarlılığı için minimal eklenir; rol guard `Yonetici`.

---

## 3. Bilesen.cs

**Tablolar**
- SELECT/INSERT/UPDATE: `BilesenBilgileri (BilesenID, BilesenAdi, Birim)`

**Aksiyonlar**
- **Ekle**: `BilesenAdi` + `Birim` ile INSERT.
- **Kaydet (grid satırı)**: Inline edit + Kaydet butonu, UPDATE.

**Validation**
- `bilesenTextBox` NotEmpty, `birimComboBox.SelectedValue != null`.
- Birim ComboBox değerleri **hard-coded**: `Set, M, M2, Kg, Pcs`.

**Özel Mantık**
- WinForms'ta DELETE **yok**. Bileşenler eklenip güncellenebiliyor, silinemiyor (reçetelerde referans olduğu için kasıtlı olabilir).

**Modern Karşılığı**
- `GET/POST /api/product-catalog/components` (mevcut)
- `PUT /api/product-catalog/components/{id}` (mevcut)
- `DELETE` minimal eklenir (referans varsa 409/Conflict döndürmek ideal — Faz 3 işi olarak not).

---

## 4. Recete.cs ⚠️ KRİTİK

**Tablolar**
- SELECT: `BilesenBilgileri (BilesenID, BilesenAdi, Birim, Fiyat)`
- SELECT: `UrunKategorileri (KategoriID, KategoriAdi, Fiyat)`
- SELECT: `KategoriBilesenleri kb LEFT JOIN BilesenBilgileri b ON kb.BilesenID = b.BilesenID` (`Adet` kolonu)
- UPDATE: `UrunKategorileri (Fiyat)`
- DELETE: `KategoriBilesenleri WHERE KategoriID = @id` (kategorinin tüm reçete kalemleri silinir)
- INSERT: `KategoriBilesenleri (KategoriID, BilesenID, Adet)` (yeniden eklenir)

**Aksiyonlar**
- **Ana Ürün Seçimi (ComboBox SelectedIndexChanged)**:
  - `SELECT Fiyat FROM UrunKategorileri WHERE KategoriID = @id` → `fiyatTextBox`'a yazılır
  - LEFT JOIN ile **tüm bileşenler** + bu kategorideki adetler `CheckedListBox`'a `"BilesenAdi (Adet: 5)"` formatında doldurulur
  - Önceden ilişkili bileşenler `CheckedListBox`'ta işaretli (✓) gelir
- **Onayla**:
  1. `UPDATE UrunKategorileri SET Fiyat = @f WHERE KategoriID = @id`
  2. `DELETE FROM KategoriBilesenleri WHERE KategoriID = @id`
  3. Checked itemlar için `INSERT INTO KategoriBilesenleri (KategoriID, BilesenID, Adet) VALUES (...)` x N
- **CheckedListBox ItemCheck**: Adet bilgisi label'dan parse edilir (`"(Adet: X)"` regex/string-split).

**Validation**
- `urunComboBox.SelectedValue != null`
- `fiyatTextBox` `decimal.TryParse`, virgül/nokta normalizasyonu (modern UI'da `<input type="number">` yeterli)

**Özel Mantık** (BIREBIR korunacak)
- **DELETE-then-INSERT pattern**: Reçete tüm haliyle değiştirilir (kalem-bazlı atomic operasyon yok). Modern API'da `PUT /api/product-catalog/categories/{id}/recipe` zaten bu davranışı yapıyor — ✓.
- Kategori fiyatı reçete ile birlikte aynı transaction'da güncellenir.

**Modern Karşılığı**
- `GET /api/product-catalog/categories/{id}/recipe` (mevcut) → kategori + tüm bileşenler + checked durumu + adetler.
- `PUT /api/product-catalog/categories/{id}/recipe` (mevcut) → fiyat + kalem listesi tek payload, server delete-then-insert.
- Frontend "Reçete paneli": `CheckedListBox` yerine bileşen listesi + checkbox + adet input (sadece checked olanlar adet input'u aktif).

---

## 5. Fabrika.cs (ÖZET — TAM PORT FAZ 3)

**Tablolar**
- SELECT: `SiparisAlTablo` (300+ kolon dinamik WHERE), `MusteriBilgileri`, `UlkelerBilgileri`, `KullaniciBilgileri`, `DetayTablo`, `SiparisIslemTablo`, `ExcelIndir` (Excel template BLOB)
- UPDATE: `SiparisAlTablo SET SiparisMiTeklifMi = 'Hazir' WHERE SiparisNo = @no`
- BLOB: `SiparisAlTablo.Ek`, `SiparisAlTablo.MuhasebeEk` (dosya download)

**Aksiyonlar**
- **Ara**: Çoklu filtre (SiparisNo, MusteriAd, KullaniciID, MUlke, Aşama, TeslimatTarihi başlangıç/bitiş) → DataGridView.
- **Üretime Geçir**: `FabrikaYontim` modal'ını açar (bkz. §6).
- **Hazır Yap**: Tek update: `SiparisMiTeklifMi = 'Hazir'`.
- **Excel Oluştur**: `ExcelIndir`'den template indir, `#SIPARISNO`, `#MUSTERI`, `#URUN` placeholder'larını doldur, kullanıcıya .xlsx ver.
- **Ek/MuhasebeEk İndir**: BLOB'u Downloads'a yazar.

**Özel Mantık**
- Bakiye hesaplama (Euro/Dolar/TL/Sterlin toplamlar).
- Sipariş aşamasına göre satır renklendirme (Planlama=Sarı, Uretim=Turuncu, Hazır=Yeşil, Lojistik=Mavi, Tamamlandı=Gri).

**Modern Durumu**
- Mevcut `FactoryService` **basit set**: `GetProductionOrders`, `MoveToProduction`, `MarkAsReady` (3 endpoint). Faz 2 master-data kapsamı dışında olan **çoklu filtre arama, Excel BLOB üretimi, ek dosya indirme, döviz toplamları** Faz 3'e devredilir. Bu Faz 2 sonu raporunda açıkça belirtilir.

---

## 6. FabrikaYontim.cs

**Tablolar**
- UPDATE: `SiparisAlTablo SET SiparisMiTeklifMi = 'Uretim', STarih = @t, FabrikaNot = @n WHERE SiparisNo = @no`

**Aksiyonlar**
- **Onayla**: Yukarıdaki UPDATE; başarılı olursa modal kapanır ve parent Fabrika ekranı yenilenir.

**Modern Karşılığı**
- `PUT /api/factory/{siparisNo}/move-to-production` body `{sTarih, fabrikaNot}` (mevcut).
- `PUT /api/factory/{siparisNo}/mark-ready` (mevcut).

---

## Yetki Özeti (Faz 1 yetki matrisi ile çakışma kontrolü)

| Form | Modern Sayfa | Açabilen Roller (Form3.cs) |
|---|---|---|
| MusteriEkle | `/customers` | Yonetici, Temsilci, Gozlemci |
| AnaUrun | `/product-catalog` (Kategoriler) | Yonetici |
| Bilesen | `/product-catalog` (Bileşenler) | Yonetici |
| Recete | `/product-catalog` (Reçete) | Yonetici (`iliskilendirTabButton`) |
| Fabrika | `/factory` | Yonetici, Fabrika, Gozlemci |
| FabrikaYontim | `/factory` modal | Yonetici, Fabrika |

Yazma yetkisi (`POST/PUT/DELETE`):
- `/customers`: Yonetici, Temsilci (oluşturma/güncelleme); silme yalnız Yonetici. (Spec ile uyumlu.)
- `/product-catalog`: Yonetici. Fabrika rolü read-only (reçeteyi görmesi gerek ama değiştirmemesi WinForms'la uyumlu).
- `/factory`: Yonetici, Fabrika (Üretime Geçir, Hazır Yap).
