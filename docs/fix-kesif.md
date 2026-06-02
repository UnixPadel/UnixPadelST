# Fix Keşif Notları — 2026-06-01

6 hatanın dosya/satır konumları ve ön bulgular. Düzeltmelerden ÖNCE
yapılan keşif. Düzeltmeler `fix-log.md`'ye yazılacak.

---

## DÜZELTME 1 — Login'de Sifre kolonu yeniden yazılıyor (KRİTİK)

**Kök neden konumu:** `CrmModern.Infrastructure/Services/AuthService.cs`
satır 36–76, özellikle 63–76 arasındaki "Lazy migration" bloğu.

Akış:
1. `GetByKullaniciAdiAsync` ile kullanıcı çekiliyor.
2. `Sifre` `$2` ile başlıyorsa `BCrypt.Verify`, değilse düz metin eşitlik
   yapıyor (Faz 8 dual-read).
3. Doğrulama OK ise **`!isBcrypt`** durumunda
   `BCrypt.HashPassword(request.Sifre)` üretip
   `KullaniciRepository.UpdateSifreAsync(KullaniciID, newHash)` çağrılıyor.

BCrypt her hash üretiminde rastgele salt ürettiği için **her düz-metin
login DB'deki Sifre kolonunu farklı bir string ile değiştiriyor**.
İkinci login'de `isBcrypt=true` olunca durur — ama görev tanımı bu
"lazy migration on login" davranışını güvenlik kuralı olarak yasaklıyor:
"Şifre değiştirme SADECE kullanıcının bilinçli 'şifre değiştir'
aksiyonunda olmalı, login'de değil."

`UpdateSifreAsync` (`KullaniciRepository.cs:24-27`): yalnız Sifre kolonunu
`ExecuteUpdateAsync` ile set ediyor — başka yan etki yok. Yani
"körlemesine entity update" değil; sorun açıkça lazy-migration bloğunun
kendisi.

**Düzeltme:** Lazy migration bloğunu kaldır. Login sadece **verify**
yapsın. Düz-metin hesapların migrasyonu `UserService.ChangePasswordAsync`
veya admin/script yoluyla olur.

---

## DÜZELTME 2 — Sidebar açılır/kapanır değil

**Konum:**
- `CrmModern.Web/src/components/Layout.tsx` (Sidebar inline render)
- `CrmModern.Web/src/components/Sidebar.tsx` (sabit `w-60`)

`Layout` `flex h-screen` kullanıyor; topbar mevcut (GlobalSearch için).
Hamburger butonu, `isSidebarOpen` state, localStorage ve mobil overlay
yok.

---

## DÜZELTME 3 — i18n yok

`package.json` içinde **react-i18next / i18next yok**. Kurulum + altyapı
sıfırdan kurulacak. Metinler her sayfada hardcoded TR.

Plan: `npm install react-i18next i18next i18next-browser-languagedetector`,
`src/i18n/` klasörü, `tr.json` + `en.json`, `main.tsx`'te import,
header'a dil seçici.

---

## DÜZELTME 4 — Sayısal alanlar manuel girilemiyor

**Konum:** `CrmModern.Web/src/pages/orders/NewOrderPage.tsx` satır
158–160 (indirim, kdv, pesinYuzde), 180 (expandAdet), 213–214
(teslimatFiyat, mTeslimat).

Pattern:
```tsx
<Input type="number" value={form.indirim}
  onChange={(e) => setForm(f => ({...f, indirim: Number(e.target.value)}))} />
```

**Bug:** `Number('')` = `0`, ama daha kötüsü kullanıcı silmek
isterse controlled value `0`'a snap'leniyor — kullanıcı sıfırı silip
yeni sayı yazamıyor. `Math.max(1, Number(...))` (satır 180) durumu
beter ediyor: input asla 1'in altına inemiyor → kullanıcı "1"i silmeye
çalışırken donuyor.

**Düzeltme:** Boş string state'de tutulsun, sadece submit'te
sayıya çevrilsin; ya da ortak bir `NumberInput` bileşeni yapılsın.

---

## DÜZELTME 5 — Yeni sipariş detay alanında Enter çalışmıyor

**Konum:** `NewOrderPage.tsx` satır 190–193.

```tsx
<Label>Detaylar (her satır bir not)</Label>
<Input value={(form.details ?? []).join('|')}
  onChange={(e) => setForm(f => ({...f, details: e.target.value.split('|').filter(Boolean)}))}
  placeholder="Not 1 | Not 2 | ..." />
```

Tek satırlık `<Input>`, kullanıcı `|` ile ayırmaya zorlanıyor. Enter
yapamaz. **Textarea**'ya çevrilip `\n` ile split edilecek.

---

## DÜZELTME 6 — Kalite kontrol layout taşması

**Konum:** `CrmModern.Web/src/pages/quality-control/QualityControlPage.tsx`.

DataTable'ın "İşlem" sütununda 3 buton yan yana (Detay/Onayla/Reddet).
Ayrıca Reddet dialog'unun DialogContent boyutu butonları kırpıyor
olabilir.

Düzeltme öncesi `DataTable` ve `Dialog` bileşenlerinin overflow
davranışına bakılacak.

---

## Genel Notlar

- Auth: BCrypt.Net + JWT, Identity yok, custom.
- Frontend: Vite + React 18 + Tailwind + Radix. `@/` alias var.
- `Layout.tsx` zaten responsive flex; sidebar collapsible eklemek
  küçük müdahaleyle yapılabilir.
