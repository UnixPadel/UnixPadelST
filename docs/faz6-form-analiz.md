# Faz 6 — Satın Alma Form Davranış Analizi

_Kaynaklar: SatinAlmaForm.cs (328), SatinAlimOnIzlemeForm.cs (335), SatinAlmaTakipForm.cs (527), SatinAlmaOnayForm.cs (1075), SatinAlmaTumTalepForm.cs (466), SatinAlmaMigrations.cs (76), Scripts/SatinAlmaTalep*.sql, Form3.cs satır 329–333._

---

## 1. Yetki Kuralları (Form3.cs satır 329–333)

```csharp
satinAlmaButton.Visible            = (Yetki == "Lojistik" || Yetki == "Fabrika"
                                       || Yetki == "Gozlemci" || Yetki == "Temsilci");
satinAlmaOnaylariButton.Visible    = (KullaniciAdi == "elshan.rasulov");
satinAlimOnIzlemeButton.Visible    = (KullaniciAdi == "omur.caliskan");
satinAlmaTakipButton.Visible       = (Yetki == "Muhasebe");
tumSatinAlmaTalepleriButton.Visible= (KullaniciAdi == "elshan.rasulov");
```

**Modern API yetki haritası (Yonetici her zaman dahil):**

| Sayfa | Yetki |
|---|---|
| Yeni Talep | `Lojistik, Fabrika, Gozlemci, Temsilci, Yonetici` |
| Taleplerim | authenticated (kendi departmanı) |
| Tüm Talepler | `Yonetici` + kullanıcı adı `elshan.rasulov` |
| Ön Onay | `Yonetici` + kullanıcı adı `omur.caliskan` |
| Ödeme Detayı | `Yonetici, Muhasebe` |
| Nihai Onay | `Yonetici` + kullanıcı adı `elshan.rasulov` |

Özel kullanıcı kontrolleri (omur, elshan) **rol değil kullanıcı adı bazlı** — service tarafında savunma katmanı.

---

## 2. Durum Akışı (BIREBIR)

```
[Lojistik/Fabrika/Gozlemci/Temsilci]
        ↓ SatinAlmaForm.cs — INSERT
[Bekliyor]   (legacy alias: 'Onay Bekliyor')
        ↓ omur.caliskan
[SatinAlimOnIzlemeForm.cs — btnOnayla]
        ↓
[Ön Onaylandı]
        ↓ Muhasebe rolü
[SatinAlmaTakipForm.cs — btnKaydet]
        ↓
[Muhasebe Tamamlandı]
        ↓ elshan.rasulov
[SatinAlmaOnayForm.cs — btnOnayla]
   ⟳ RULE 4: TalepTipi='SatinAlma' AND OdemeTuru IS NULL → BLOK ⟲
        ↓
[Onaylandı]   (TERMINAL)

Red (herhangi aşamada):  → [Reddedildi] (TERMINAL)
                          RedNotu, IslemYapanKullanici, IslemTarihi doldurulur
```

**Durum string'leri (BIREBIR, Türkçe karakterli):**
- `Bekliyor`
- `Onay Bekliyor` (legacy alias)
- `Ön Onaylandı`
- `Muhasebe Tamamlandı`
- `Onaylandı`
- `Reddedildi`

**Grid renk kuralları (RGB):**
- `Onaylandı` → `RGB(198,239,206)` açık yeşil
- `Muhasebe Tamamlandı` → `RGB(221,235,247)` açık mavi
- `Ön Onaylandı` → `RGB(189,215,238)` koyu mavi
- `Reddedildi` → `RGB(255,199,206)` kırmızı/pembe
- diğer (Bekliyor) → `RGB(255,235,156)` sarı

---

## 3. SatinAlmaForm.cs — Talep Girişi

**INSERT:**
```sql
INSERT INTO SatinAlmaTalep
  (UrunAdi, UrunTuru, UrunMaliyeti, AlinanYer, Notlar,
   TalepEdenKullaniciAdi, Departman, TalepTarihi, Durum, TalepTipi)
VALUES
  (@UrunAdi, @UrunTuru, @UrunMaliyeti, @AlinanYer, @Notlar,
   @KullaniciAdi, @Departman, NOW(), 'Bekliyor', 'SatinAlma')
```

**Validation:** `UrunAdi`, `UrunTuru`, `UrunMaliyeti` (decimal, Invariant parse), `AlinanYer` zorunlu.

**Liste (kendi departmanı, Gözlemci ise tümü):**
```sql
SELECT ... FROM SatinAlmaTalep
WHERE Departman = @Departman
  AND COALESCE(TalepTipi,'SatinAlma') = 'SatinAlma'
ORDER BY TalepTarihi DESC LIMIT 200
```

---

## 4. SatinAlimOnIzlemeForm.cs — Ön Onay

**Yetki:** `KullaniciAdi == 'omur.caliskan'` (Form3 satır 3782 kontrolü).

**Bekleyen WHERE:**
```sql
WHERE Durum IN ('Bekliyor','Onay Bekliyor')
  AND COALESCE(TalepTipi,'SatinAlma') = 'SatinAlma'
ORDER BY TalepTarihi ASC
```

**Onayla:**
```sql
UPDATE SatinAlmaTalep
SET Durum='Ön Onaylandı', OnIzlemeYapan=@Kullanici, OnIzlemeTarihi=NOW()
WHERE TalepID=@ID AND Durum IN ('Bekliyor','Onay Bekliyor')
```

**Reddet** (red notu zorunlu):
```sql
UPDATE SatinAlmaTalep
SET Durum='Reddedildi', RedNotu=@Not,
    OnIzlemeYapan=@Kullanici, OnIzlemeTarihi=NOW(),
    IslemYapanKullanici=@Kullanici, IslemTarihi=NOW()
WHERE TalepID=@ID AND Durum IN ('Bekliyor','Onay Bekliyor')
```

---

## 5. SatinAlmaTakipForm.cs — Muhasebe Ödeme Detayı (DİNAMİK PANEL)

**Yetki:** `Yetki == 'Muhasebe'` (Form3 satır 3803).

**Bekleyen WHERE:**
```sql
WHERE COALESCE(TalepTipi,'SatinAlma') = 'SatinAlma'
  AND OdemeTuru IS NULL
  AND Durum IN ('Ön Onaylandı','Onay Bekliyor')
```

**Geçmiş WHERE:**
```sql
WHERE COALESCE(TalepTipi,'SatinAlma') = 'SatinAlma'
  AND (OdemeTuru IS NOT NULL
       OR Durum IN ('Muhasebe Tamamlandı','Onaylandı','Reddedildi'))
```

**ComboBox OdemeTuru seçenekleri (hard-coded, BIREBIR):**
1. `Peşin`
2. `Vadeli`
3. `Mal Mukabili`
4. `Çek / Senet`
5. `Havale / EFT`
6. `Kredi Kartı / Banka Kartı`

> Not: WinForms'ta "Kredi Kartı" ve "Banka Kartı" tek bir combobox item'ı (`Kredi Kartı / Banka Kartı`). Modern UI'da görsel yarı-bölünmüş gösterilebilir ama kaydetme tek string.

**Dinamik panel alanları (OdemePanelleriniGuncelle):**

| OdemeTuru | Aktif TextBox/DatePicker'lar | Kaydet UPDATE alanları |
|---|---|---|
| `Peşin` | OdenenTutar, OdemeIslemTarihi | OdenenTutar, OdemeIslemTarihi |
| `Vadeli` | OdenenTutar, OdemeVadeSuresi, OdemeVadeTutari | OdenenTutar, OdemeVadeSuresi, OdemeVadeTutari |
| `Mal Mukabili` | OdenenTutar, OdemeAciklama | OdenenTutar, OdemeAciklama |
| `Çek / Senet` | OdemeTutari, OdemeBelgeNo, OdemeVadeTarihi | OdemeTutari, OdemeBelgeNo, OdemeVadeTarihi |
| `Havale / EFT` | OdemeTutari, OdemeBankaAdi, OdemeIslemTarihi | OdemeTutari, OdemeBankaAdi, OdemeIslemTarihi |
| `Kredi Kartı / Banka Kartı` | OdemeTutari, OdemeKartTipi, OdemeTaksitSayisi, OdemeBankaAdi | OdemeTutari, OdemeKartTipi, OdemeTaksitSayisi, OdemeBankaAdi |

**Tutar parse:** TR-culture (virgül) deneme → InvariantCulture fallback. `NumberStyles.Number`. Negatif tutar **yasak** (validation).

**Kaydet:**
```sql
UPDATE SatinAlmaTalep
SET Durum='Muhasebe Tamamlandı',
    OdemeTuru=@OT, OdenenTutar=@OdT, OdemeTutari=@OT2,
    OdemeVadeSuresi=@VS, OdemeVadeTutari=@VT, OdemeVadeTarihi=@VTr,
    OdemeBelgeNo=@BN, OdemeBankaAdi=@BA, OdemeIslemTarihi=@IT,
    OdemeKartTipi=@KT, OdemeTaksitSayisi=@TS, OdemeAciklama=@AC,
    MuhasebeYapanKullanici=@Kullanici, MuhasebeTarihi=NOW()
WHERE TalepID=@ID
  AND Durum IN ('Ön Onaylandı','Onay Bekliyor')
  AND OdemeTuru IS NULL
```

---

## 6. SatinAlmaOnayForm.cs — Nihai Onay (RULE 4)

**Yetki:** `KullaniciAdi == 'elshan.rasulov'` (Form3 satır 3766).

**Bekleyen WHERE (dual source):**
```sql
WHERE (COALESCE(TalepTipi,'SatinAlma')='SatinAlma' AND Durum='Muhasebe Tamamlandı')
   OR (TalepTipi='Muhasebe' AND Durum='Onay Bekliyor')
```

**Sol panel — SatinAlma tipi için Muhasebe'den gelen tüm alanlar (read-only):**
`OdemeTuru, OdenenTutar, OdemeTutari, OdemeVadeSuresi, OdemeVadeTutari, OdemeVadeTarihi, OdemeBelgeNo, OdemeBankaAdi, OdemeIslemTarihi, OdemeKartTipi, OdemeTaksitSayisi, OdemeAciklama, MuhasebeYapanKullanici, MuhasebeTarihi`.

**Sol panel — Muhasebe tipi için (faz 5 köprüsü):**
`MusteriAdi, ToplamSiparis, KaporaBakiyesi, KalanBakiyeTalep, PesinYuzde, Maliyet, MaliyetDetayi, Kar`.

### RULE 4 (KRİTİK)
```csharp
if (TalepTipi == "SatinAlma" && string.IsNullOrWhiteSpace(OdemeTuru))
{
    MessageBox.Show("Satın Alma tipi talepler için ödeme bilgisi zorunludur!\n" +
                    "Lütfen önce Muhasebe bölümü ödeme detayını girsin.");
    return; // BLOK
}
```

**Onayla UPDATE:**
```sql
UPDATE SatinAlmaTalep
SET Durum='Onaylandı', IslemYapanKullanici=@Kullanici, IslemTarihi=NOW()
WHERE TalepID=@ID
  AND Durum IN ('Muhasebe Tamamlandı','Ön Onaylandı','Onay Bekliyor')
  AND (COALESCE(TalepTipi,'SatinAlma') <> 'SatinAlma' OR OdemeTuru IS NOT NULL)
```

**Reddet:** Standart UPDATE Durum='Reddedildi' + RedNotu zorunlu.

---

## 7. SatinAlmaTumTalepForm.cs — Tüm Talepler

**Yetki:** `KullaniciAdi == 'elshan.rasulov'`.

**Filtreler:**
- Durum: (Tümü), Bekliyor, Ön Onaylandı, Muhasebe Tamamlandı, Onay Bekliyor, Onaylandı, Reddedildi
- Aşama (computed): Fabrika/Ön İzleme, Muhasebe, Nihai Onay, Tamamlandı
- Tarih aralığı (default son 1 ay)
- Talep eden (LIKE)

**Aşama hesabı (SQL CASE):**
```sql
CASE
  WHEN Durum IN ('Bekliyor','Onay Bekliyor')                     THEN 'Fabrika / Ön İzleme'
  WHEN Durum='Ön Onaylandı' AND OdemeTuru IS NULL                THEN 'Muhasebe'
  WHEN Durum='Muhasebe Tamamlandı'                                THEN 'Nihai Onay'
  WHEN Durum IN ('Onaylandı','Reddedildi')                       THEN 'Tamamlandı'
  ELSE 'Bilinmiyor'
END AS Asama
```

Sayfalama: 50 kayıt/sayfa.

---

## 8. SatinAlmaMigrations.cs

`SatinAlmaTalep` tablosuna 17 kolon ekleyen idempotent runner (`INFORMATION_SCHEMA.COLUMNS` bakıp `ALTER TABLE ADD COLUMN IF NOT EXISTS`). DB'de bu kolonlar **zaten mevcut** (snapshot doğruluyor), modern API runner port etmez.
