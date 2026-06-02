# Faz 4 — LojistikYontim.cs Bulguları (4.1.d)

## Soru
WinForms `LojistikYontim.cs` (177 satır) ne yapıyor? DB'de ayrı bir taşıyıcı/firma yönetim tablosu var mı?

## Bulgular

1. **DB schema dökümünde (`docs/db-schema-snapshot.md`) ayrı tablo yok.** Aşağıdakiler kontrol edildi: `LojistikYontim`, `Tasiyici`, `KargoFirma`, `Carrier` — hiçbiri tabloda mevcut değil.

2. **`LojistikTablo` 7 kolonludur:**
   ```
   ID(PK), KullaniciAdi(int — aslında KullaniciID), SiparisNo, FirmaAdi(varchar30),
   LojistikCesit(varchar10), Fiyat(decimal), LNot(text)
   ```
   Soft-delete kolonu (`Iptal`, `Durum`, `Tamamlandi`) yok.

3. **WinForms davranışı:**
   - Form açılışında `SELECT DISTINCT FirmaAdi FROM LojistikTablo` (satır 41) ile firma combobox'ı doldurur.
   - "Onayla" butonu (satır 86–99) yeni satır INSERT eder; FirmaAdi serbest yazılabilir → bir sonraki sefer DISTINCT'e dahil olur.
   - **Master tablo CRUD'u yok**. "Yeni firma ekle" gibi ayrı bir aksiyon yok.

## Karar (Faz 4)

Spec kuralına göre ("Eğer ayrı tablo yoksa LojistikTablo içinde dropdown listesi (string) olarak portla"):

- Modern API tek endpoint açar: `GET /api/logistics/carriers` → `SELECT DISTINCT FirmaAdi FROM LojistikTablo` sonucu.
- Benzer şekilde `GET /api/logistics/cesitler` → `LojistikCesit` distinct değerleri.
- **CRUD endpoint EKLENMİYOR** (POST/PUT/DELETE carriers yok).
- Frontend `LogisticsReadyPage` üzerinde sevkiyat oluşturma modal'ında bu liste + freeform text input olarak sunulur.

## Spec ile Sapma

Faz 4 prompt'unda spec şunu listeliyordu:
```
GET    /api/logistics/carriers
POST   /api/logistics/carriers
PUT    /api/logistics/carriers/{id}
DELETE /api/logistics/carriers/{id}
```

Modern API yalnızca **GET /api/logistics/carriers** ve **GET /api/logistics/cesitler** uygular. POST/PUT/DELETE `carriers` endpoint'leri **uygulanmadı** çünkü ayrı tablo yok ve WinForms'ta CRUD davranışı yok. CarriersPage frontend de ayrı sayfa olarak değil, sevk modal'ı içinde dropdown olarak sunulur.

İleride ayrı bir taşıyıcı master tablosu eklenmek istenirse Faz 8 (cila) kapsamında yeni tablo + CRUD eklenebilir.
