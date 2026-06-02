# Faz 4 — WinForms Form Davranış Analizi

_Kaynaklar: `Kontrol.cs (4274 satır)`, `KontrolRed.cs (90)`, `Lojistik.cs (1391)`, `LojistikGecmis.cs (1107)`, `LojistikYontim.cs (177)`, `FabrikaYontim.cs (92)`. Bu doküman Faz 4 portunun "doğruluk kaynağı"dır._

---

## 1. Kontrol.cs — Kalite Kontrol

**Listeleme (satır ~710):**
```sql
SELECT * FROM SiparisAlTablo
WHERE Kontrol = 'Kontrol'
ORDER BY SiparisAlID DESC
```
- Hem `Teklif` hem `Siparis` aşamaları gösterilir (SiparisMiTeklifMi filtrelenmez).
- Kalite kontrol sipariş bazlıdır, kalem bazlı değil.

**Onay Butonu (`kontrolOnayla_Click`, satır ~2608):**
```sql
UPDATE SiparisAlTablo
SET Kontrol = 'Onay',
    SiparisMiTeklifMi = CASE WHEN SiparisMiTeklifMi = 'Teklif'
                              THEN 'Siparis'
                              ELSE SiparisMiTeklifMi END
WHERE SiparisNo = @SiparisNo AND Kontrol <> 'Onay'
```
- Teklif → Siparis dönüşümü onayda otomatik (Faz 3'teki ApproveOrderAsync ile birebir).
- WinForms ek dosya/foto kolonu yok; yalnız `Kontrol` + `SiparisMiTeklifMi`.
- WinForms audit yazmaz; modern API `SiparisOnaylari` audit satırı yazar (Faz 3 davranışı).

**Yetki:** Form3.cs satır 156–179: yalnız `Yonetici`'de `kontrolButton.Enabled=true`.

---

## 2. KontrolRed.cs — Red Modal

**Giriş:** `redTextBox` (zorunlu) + `siparisNoTextBox` (parametreden gelir).

**SQL (satır 51–56):**
```sql
UPDATE SiparisAlTablo
SET Red = @Red, Kontrol = 'Reddet'
WHERE SiparisNo = @SiparisNo
  AND Kontrol <> 'Onay'
  AND SiparisMiTeklifMi IN ('Teklif', 'Siparis')
```
- Audit yok (modern API'da `SiparisOnaylari` satırı eklenir).

---

## 3. Lojistik.cs — Sevkiyat Oluşturma

**Listeleme (satır ~203):**
```sql
SELECT ... FROM SiparisAlTablo sat
WHERE sat.SiparisMiTeklifMi IN ('Siparis','Planlama','Uretim','Hazir','Lojistik','Tamamlandı')
ORDER BY SiparisAlID DESC
```
- Geniş kapsam (sadece `Hazir`'ı değil). Modern API `GET /api/logistics/ready` için **`Hazir + Kontrol='Onay'`** subset'ini öneriyoruz; mevcut `LogisticsService.GetLogisticsOrdersAsync` zaten bu davranışı veriyor.

**"Sevkiyata Al" (LojistikYontim.cs üzerinden, satır 86–99 ile birlikte):**
```sql
INSERT INTO LojistikTablo (KullaniciAdi, SiparisNo, FirmaAdi, LojistikCesit, Fiyat, LNot)
VALUES (@KullaniciAdi, @SiparisNo, @FirmaAdi, @LojistikCesit, @Fiyat, @LNot)
```
- `KullaniciAdi` aslında **int — KullaniciID**. (WinForms kolonu yanlış adlandırılmış, modern entity `LogisticsEntry.KullaniciID` property'si bu kolona map ediyor.)

**Yan etki (Lojistik.cs satır 103–107):**
```sql
UPDATE SiparisAlTablo
SET STarih = @STarih, LojistikNot = @LojistikNot, SiparisMiTeklifMi = 'Lojistik'
WHERE SiparisNo = @SiparisNo
```

**Taşıyıcı seçici:** `SELECT DISTINCT FirmaAdi FROM LojistikTablo` (satır 41). Hard-coded liste yok, ayrı master tablo da yok. **Karar:** Modern API'da `GET /api/logistics/carriers` → distinct firma listesi. CRUD endpoint **eklenmiyor** (kullanıcı yeni firmayı bir sevk ile yazınca otomatik dropdown'a düşer).

**Çoklu teslimat adresi (`SiparisTeslimatTablo`):** Lojistik.cs içinde KULLANILMIYOR. Yalnızca SiparisForm.cs'de OrderShipment yazılıyor — Faz 4 lojistik UI tek-adres odaklı, OrderShipment yazma akışı Faz 4 kapsamı dışında (Faz 3 entity hazır).

---

## 4. LojistikGecmis.cs — Geçmiş Sorgu

**Listeleme (satır 213–234):**
```sql
SELECT lt.SiparisNo,
       CONCAT(kb.Ad,' ',kb.Soyad) AS Kullanici,
       lt.FirmaAdi, lt.LojistikCesit, lt.Fiyat
FROM LojistikTablo lt
LEFT JOIN KullaniciBilgileri kb ON lt.KullaniciAdi = kb.KullaniciID
WHERE 1=1 [+ dinamik LIKE filtreler: SiparisNo, FirmaAdi]
```

**Excel/Print:** `excelYazOzet_Click` Kontrol.cs satır ~2680'de — `ExcelIndir` BLOB template kullanır (Faz 8'e devir).

**Silme/İptal:** **YOK.** Hard DELETE tetiklenmiyor, soft-delete kolonu (`Iptal tinyint`) tanımlı değil. Modern API `Cancel` aksiyonu ya hard DELETE + Order.SiparisMiTeklifMi rollback ('Lojistik' → 'Hazir') yapar, ya da Faz 5/8'e devredilir. **Karar:** Hard DELETE + rollback (SiparisAlTablo.SiparisMiTeklifMi='Hazir').

**Tamamlandı işaretleme:** WinForms LojistikGecmis'te yok. Modern API `POST /api/logistics/{sevkId}/complete` Order'ı `Tamamlandi`'ya çeker + `TamamlandiTablo` audit satırı yazar (Faz 3'te entity hazırlandı).

---

## 5. LojistikYontim.cs — KARAR (4.1.d)

**Bulgu:** Form bir sipariş için lojistik kaydı yazıyor (LojistikTablo'ya). Ayrı bir taşıyıcı yönetim tablosu (LojistikYontim, Tasiyici, KargoFirma, vs.) **DB'de YOK**. FirmaAdi listesi `SELECT DISTINCT FirmaAdi FROM LojistikTablo` ile dinamik dolduruluyor.

**Karar (kullanıcı kuralı: "Eğer ayrı tablo yoksa LojistikTablo içinde dropdown listesi (string) olarak portla"):**
- Modern API `GET /api/logistics/carriers` → distinct FirmaAdi listesi.
- `LojistikCesit` için de `GET /api/logistics/cesitler` benzer pattern.
- CRUD endpoint **eklenmedi** — yeni firma adı sevkiyat oluştururken serbest girilir, listeye otomatik dahil olur.
- Frontend'de "Yeni Taşıyıcı Ekle" butonu YOK; sevkiyat formunda "Yeni firma yaz" combo input'u var.
- Detaylı bulgu: [`docs/faz4-lojistikyontim-bulgular.md`](faz4-lojistikyontim-bulgular.md).

---

## 6. FabrikaYontim.cs — Üretime Geçirme

**SQL (satır ~38):**
```sql
UPDATE SiparisAlTablo
SET SiparisMiTeklifMi = 'Uretim',
    STarih = @STarih,
    FabrikaNot = @FabrikaNot
WHERE SiparisNo = @SiparisNo
```

**StokTablo tüketimi:** **YOK.** WinForms reçeteden malzeme düşmüyor. Faz 4'te de yazma yok (Faz 5/üretim modülünde değerlendirilecek).

**Yetki:** `Yonetici, Fabrika`.

---

## 7. Aşama Geçiş Akışı (BIREBIR)

```
[Sipariş oluştur]                    Kontrol  =Kontrol
       │ Faz 3 SiparisForm
       ▼
[QC Onay (Yonetici)]                 Kontrol  =Onay  + (Teklif→Siparis)
       │ Faz 4 /api/quality-control/{no}/approve
       ▼
[Üretime Geçir (Fabrika)]            SiparisMiTeklifMi=Uretim, STarih, FabrikaNot
       │ /api/factory/{no}/move-to-production
       ▼
[Hazır Yap (Fabrika)]                SiparisMiTeklifMi=Hazir
       │ /api/factory/{no}/mark-ready
       ▼
[Sevkiyata Al (Lojistik)]            SiparisMiTeklifMi=Lojistik, LojistikNot
       │ /api/logistics    + LojistikTablo INSERT
       ▼
[Tamamlandı (Lojistik)]              SiparisMiTeklifMi=Tamamlandi
       │ /api/logistics/{id}/complete + TamamlandiTablo INSERT
       ▼
[Bitti]
```

**Red yan-akışı:** QC Reddet → `Kontrol=Reddet, Red=aciklama`. Revize edilebilir (Faz 3 mevcut).

---

## 8. Yetki Özeti (Form3.cs satır 156–323 ile uyumlu)

| Sayfa | Okuma | Yazma |
|---|---|---|
| `/quality-control` | `Yonetici` | `Yonetici` |
| `/factory` | `Yonetici, Fabrika, Gozlemci` | `Yonetici, Fabrika` |
| `/logistics/ready` | `Yonetici, Lojistik` | `Yonetici, Lojistik` |
| `/logistics/history` | `Yonetici, Lojistik, Gozlemci` | `Yonetici, Lojistik` (complete/cancel) |
| `/logistics/carriers` | authenticated | — (CRUD yok) |
