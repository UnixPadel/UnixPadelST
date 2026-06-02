# Faz 5 — Muhasebe Form Analizi

_Kaynaklar: `Muhasebe.cs (2387 satır)`, `MuhasebeGecmis.cs (1168 satır)`, `Form3.cs satır 190–208`._

---

## 1. MuhasebeIslemTablo Şeması (DB)

```
| Kolon           | Tip            | Null |
|-----------------|----------------|------|
| ID              | int (PK,AI)    | NO   |
| KullaniciID     | int            | NO   |
| MusteriID       | int            | NO   |
| SiparisNo       | varchar(50)    | YES  |
| OdenenMiktar    | decimal(10,2)  | NO   |
| Tarih           | date           | NO   |
```

**Kritik:** `IslemTuru` ve `OdemeYontemi` kolonları **DB'de YOK**. Spec'in bu alanları schema değişikliği gerektirir — kullanıcı kuralı: "DB tablo/kolon adı DEĞİŞMEZ" → bu alanlar uygulanmaz. DTO ve UI sadece `OdenenMiktar + Tarih + (Açıklama UI-only)` ile sınırlı kalır. Tediye (giden ödeme) zaten WinForms'ta yok.

---

## 2. Muhasebe.cs — Listeleme

```sql
SELECT sat.SiparisNo, sat.MusteriAd, sat.MUlke,
       sat.ToplamFiyat, sat.OdenenMiktar,
       GREATEST(sat.ToplamFiyat * sat.PesinYüzde/100 - COALESCE(sat.OdenenMiktar,0), 0) AS KaparoFiyat,
       sat.ToplamFiyat - COALESCE(sat.OdenenMiktar,0) AS KalanBakiye,
       sat.PesinYüzde, sat.TeslimatÇeşiti, sat.ParaTipi,
       sat.OdemeDurum, sat.SiparisMiTeklifMi, sat.Tarih, sat.Sirket
FROM SiparisAlTablo sat
LEFT JOIN MuhasebeIslemTablo mit ON sat.SiparisNo = mit.SiparisNo
LEFT JOIN SatinAlmaTalep st       ON sat.SiparisNo = st.SiparisNo AND st.TalepTipi='Muhasebe'
WHERE sat.Kontrol = 'Onay'
ORDER BY sat.Tarih DESC
```

**Filtre seçenekleri (UI):**
- "Tamamı": `Kontrol='Onay' AND SiparisMiTeklifMi <> 'Teklif'`
- "Beklemede": `OdemeDurum='Beklemede' AND Kontrol='Onay' AND SiparisMiTeklifMi='Siparis'`
- "Ödendi": `OdemeDurum='Ödendi' AND Kontrol='Onay' AND SiparisMiTeklifMi='Siparis'`

`SiparisAlTablo.OdenenMiktar` zaten kullanılıyor (`SUM` doğrudan kolondan okunuyor).

---

## 3. Tahsilat Akışı

WinForms Muhasebe.cs'te **doğrudan MuhasebeIslemTablo INSERT atan bir buton YOK** — bunun yerine "Talep Gönder" (`odmeButton`) butonu `SatinAlmaTalep` tablosuna yazıyor (Faz 6 satın alma onay akışı). MuhasebeIslemTablo audit-only görünüyor.

**Modern karar:** Faz 5 spec'i muhasebe tahsilatını net bir akış olarak istiyor (`POST /api/accounting/transactions`). Bu nedenle modern API'de **tahsilat = `MuhasebeIslemTablo` INSERT + `SiparisAlTablo.OdenenMiktar` toplama** olarak uygulandı. WinForms'ta UI üzerinden bu, "Talep Gönder → Yönetici Onay → işlem yazma" şeklinde dolaylı; modern API'de tek POST'a sadeleştirildi.

**Modern INSERT (pseudo-SQL):**
```sql
INSERT INTO MuhasebeIslemTablo (SiparisNo, KullaniciID, MusteriID, OdenenMiktar, Tarih)
VALUES (@SiparisNo, @JWT_UserID, @Order_MusteriID, @Tutar, @Tarih)

UPDATE SiparisAlTablo
SET OdenenMiktar = (SELECT SUM(OdenenMiktar) FROM MuhasebeIslemTablo WHERE SiparisNo = @SiparisNo),
    OdemeDurum   = CASE WHEN ToplamFiyat - SUM(...) <= 0 THEN 'Ödendi' ELSE 'Beklemede' END
WHERE SiparisNo = @SiparisNo
```

---

## 4. OdemeDurum String'leri (BIREBIR)

WinForms enum değerleri:
- `'Beklemede'` (default DB constraint)
- `'Ödendi'`

**Yok:** `'KısmiÖdeme'`, `'Tamamlandi'`. Spec'in bu önerileri **WinForms birebir kuralı** gereği uygulanmaz; sadece iki durum: tam ödendi mi → `'Ödendi'`, değilse → `'Beklemede'`.

WinForms'ta `SiparisAlTablo.OdemeDurum` otomatik update kodu **yorum satırı** (satır 2186–2212). Modern API bu davranışı düzeltir: tahsilat girince OdemeDurum otomatik güncellenir.

---

## 5. Müşteri Bazlı 4-Döviz Bakiyesi

WinForms `BakiyeHesapla()` (MuhasebeGecmis.cs):
```sql
SELECT sat.ParaTipi, SUM(mit.OdenenMiktar) AS ToplamOdenen
FROM MuhasebeIslemTablo mit
LEFT JOIN SiparisAlTablo sat ON mit.SiparisNo = sat.SiparisNo
WHERE sat.MusteriID = @MusteriID  -- (modern: müşteri filtresi)
GROUP BY sat.ParaTipi
```

**Modern API** `GET /api/accounting/customers/{id}/balance`:
- Toplam Sipariş (ToplamFiyat × paraTipi gruplaması)
- Toplam Ödenen (mit.OdenenMiktar)
- Kalan = Toplam − Ödenen
- 4 döviz: Euro, Dolar, TL, Sterlin

---

## 6. MuhasebeEk Yükleme/İndirme

**Yükleme** (Muhasebe.cs `MuhasebeEkEkle_Click`):
```sql
UPDATE SiparisAlTablo SET MuhasebeEk = @blob WHERE SiparisNo = @no
```
- Hedef kolon: `SiparisAlTablo.MuhasebeEk` (`mediumblob`). Order entity'ye Faz 3'te eklenmişti.

**İndirme**: `byte[] = (byte[])reader["MuhasebeEk"]` → kullanıcı dosyaya yazar. Modern API zaten Faz 3'te indirme açıktı; bu fazda **yükleme bloğu kaldırılır**.

**Yetki**: `Yonetici, Muhasebe` yükler; indirmek tüm authenticated.

---

## 7. Sipariş Tamamlanma → Muhasebe Köprüsü

WinForms'ta **otomatik muhasebe işlem satırı yazılmıyor**. Lojistik `SiparisMiTeklifMi='Tamamlandi'` yaptığında muhasebe sayfası sadece WHERE filtresinde siparişi listeler. **Faz 4 LogisticsService.CompleteShipmentAsync'e dokunulmaz**.

---

## 8. MuhasebeGecmis.cs — Geçmiş Sorgu

```sql
SELECT mit.SiparisNo, sat.MusteriAd, sat.MUlke,
       CONCAT(kb.Ad,' ',kb.Soyad) AS Kullanici,
       sat.ParaTipi, mit.OdenenMiktar, mit.Tarih
FROM MuhasebeIslemTablo mit
LEFT JOIN SiparisAlTablo sat   ON mit.SiparisNo = sat.SiparisNo
LEFT JOIN KullaniciBilgileri kb ON mit.KullaniciID = kb.KullaniciID
WHERE 1=1
  [AND mit.SiparisNo LIKE @SiparisNo]
  [AND sat.MusteriAd LIKE @MusteriAd]
  [AND mit.KullaniciID = @KullaniciID]
  [AND mit.Tarih BETWEEN @Bas AND @Bit]
ORDER BY mit.Tarih DESC
```

**Düzenleme/Silme:** YOK (audit-only, hard DELETE de yok). Modern API ile uyumlu.

**Excel:** WinForms `ExcelIndir` BLOB template — Faz 8'e devir. Modern API ClosedXML fallback.

---

## 9. Form3.cs Yetki Özeti — Muhasebe Rolü (satır 190–208)

Açık:
- `muhasebeButton` (Muhasebe ekranı)
- `buttonMuhasebeIslem` (Muhasebe Geçmiş)
- MuhasebeEk yükle/indir

Kapalı: Siparişler, müşteri ekle, kontrol, lojistik, kategoriler vb.

## 10. Modern Yetki Kararları

| Endpoint | Yetki |
|---|---|
| `GET /api/accounting/orders[/{no}]` | `Yonetici, Muhasebe` |
| `POST /api/accounting/transactions` | `Yonetici, Muhasebe` |
| `GET /api/accounting/transactions/history` | `Yonetici, Muhasebe, Gozlemci` |
| `GET /api/accounting/customers/{id}/balance` | `Yonetici, Muhasebe` |
| `GET /api/accounting/excel` | `Yonetici, Muhasebe` |
| `POST /api/orders/{no}/attachments?type=muhasebeek` (Faz 3 bloku kaldırıldı) | `Yonetici, Muhasebe` |
| `GET /api/orders/{no}/attachments/{type}` | authenticated |
