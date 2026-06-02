# Faz 1 — Yetki Matrisi (WinForms Form3 birebir port)

_Kaynak: `WindowsFormsApp1\Form3.cs` satır 148–323. `enabled = false` butonlar görünmez/erişilemez kabul edildi._

## 1. Roller (DB enum: `KullaniciBilgileri.YetkiTuru`)

`Yonetici · Temsilci · Muhasebe · Fabrika · Lojistik · Gozlemci`

> Not: WinForms'taki `Yonetici` rolü, kullanıcının "admin" karşılığıdır. Yeni `[Authorize(Roles="...")]` guardları `Yonetici` adıyla yazılır — alias yok.

## 2. Menü ↔ Rol Erişim Matrisi

WinForms buton adı | Modern menü | Yonetici | Temsilci | Muhasebe | Fabrika | Lojistik | Gozlemci
---|---|:-:|:-:|:-:|:-:|:-:|:-:
`siparislerımButton` | Siparişlerim | ✅ | ✅ | ❌ | ❌ | ❌ | ✅
`teklifAlButon` | Teklif Al | ✅ | ✅ | ❌ | ❌ | ❌ | ✅
`siparisOlusturButton` | Sipariş Oluştur | ✅ | ✅ | ❌ | ❌ | ❌ | ✅
`musteriEkleButton` | Müşteri | ✅ | ✅ | ❌ | ❌ | ❌ | ✅
`musteriEkle` (kategori) | — | ✅ | ❌ | ❌ | ❌ | ❌ | ❌
`kontrolButton` | Kalite Kontrol | ✅ | ❌ | ❌ | ❌ | ❌ | ❌
`fabrikaButton` | Fabrika | ✅ | ❌ | ❌ | ✅ | ❌ | ✅
`lojistikButton` | Lojistik | ✅ | ❌ | ❌ | ❌ | ✅ | ❌
`lojistikIslemGecmisiButon` | Lojistik Geçmişi | ✅ | ❌ | ❌ | ❌ | ✅ | ✅
`muhasebeButton` | Muhasebe | ✅ | ❌ | ✅ | ❌ | ❌ | ❌
`buttonMuhasebeIslem` | Muhasebe Geçmişi | ✅ | ❌ | ✅ | ❌ | ❌ | ✅
`bilesenEkle` | Ürün Kataloğu — Bileşen | ✅ | ❌ | ❌ | ❌ | ❌ | ❌
`anaUrunButton` | Ürün Kataloğu — Ana Ürün | ✅ | ❌ | ❌ | ❌ | ❌ | ❌
`kategoriEkle` | Ürün Kataloğu — Kategori | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ *
`iliskilendirTabButton` | Ürün Kataloğu — İlişki | ✅ | ❌ | ❌ | ❌ | ❌ | ❌
`kullaniciYonetButton` / `kullaniciEkleButton` | Kullanıcılar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌
`araButton` | Ara | ✅ | ✅ | ❌ | ❌ | ❌ | ✅
`chartButton` | Dashboard / Chart | ✅ | ❌ | ❌ | ❌ | ❌ | ✅

\* `kategoriEkle` Form3.cs'de hiçbir rol için `Enabled = true` yapılmamış — pasif bırakılmış. Modern UI'da gizli tutulur.

### Satın Alma — özel kurallar (Form3.cs 318–323)

Erişim kuralı | Kaynak | Notu
---|---|---
**Satın Alma talebi oluştur** (`satinAlmaButton`) — `Lojistik · Fabrika · Gozlemci · Temsilci` | satır 319 | Rol bazlı
**Muhasebe satın alma takip** (`satinAlmaTakipButton`) — `Muhasebe` | satır 322 | Rol bazlı
**Talep onayları** (`satinAlmaOnaylariButton`) — `KullaniciAdi == "elshan.rasulov"` | satır 320 | **Kullanıcı bazlı**, rol değil
**Ön izleme** (`satinAlimOnIzlemeButton`) — `KullaniciAdi == "omur.caliskan"` | satır 321 | **Kullanıcı bazlı**
**Tüm satın alma talepleri** (`tumSatinAlmaTalepleriButton`) — `KullaniciAdi == "elshan.rasulov"` | satır 323 | **Kullanıcı bazlı**

> Bu üç buton role bağlı değil — özel iki kullanıcıya açık. Backend `LoginResponseDto.CanApprovePurchase` ve `KullaniciBilgileri.SatinAlmaYetkisi` kolonu üzerinden taşınır. `AuthService.cs` halihazırda `elshan.rasulov` ve `Lojistik|Fabrika|Gozlemci` kuralını koruyor; `Temsilci` da bu listede olmalı (`AuthService.PurchaseRequestRoles` güncellenecek).

## 3. Login Davranışı (Form1.cs 187–237)

- SQL: `SELECT * FROM KullaniciBilgileri WHERE KullaniciAdi = @k AND Sifre = @s`
- **Şifre düz metin** karşılaştırılır. Hash/bcrypt yok. (DB kolon tipi `varchar(25)` — hash sığmaz.)
- Eşleşme yoksa: "Kullanıcı adı veya şifre hatalı." → 401
- Eşleşme var ama `Durum != "Aktif"` → "Hesabınız pasif durumda." → 401
- Eşleşme var ve `Aktif` → token üret, dashboard'a yönlendir.

## 4. Modern Tarafa Çıkarımlar

- Sidebar `Sidebar.tsx` zaten `roles` listesi üzerinden filtreleme yapıyor; bu tablo o filtrelerin "kanonik" kaynağıdır — gerekirse sidebar listesi bu tabloya göre düzeltilecek.
- `/users` sadece `Yonetici` görür → `RoleGuard` bileşeni eklenir.
- "Satın Alma" menüsü herkes için görünür ama içerideki butonlar yukarıdaki üç özel kurala göre saklanır (Faz 2'de detaylanır).
