# UnixPadelST — Release & Auto-Update Rehberi

## Mimari özet

```
┌──────────────────────────────────┐         ┌──────────────────────────────────┐
│ UnixPadel/UnixPadelST            │         │ UnixPadel/UnixPadelST-Releases   │
│ (private)                        │         │ (public)                         │
│ Kaynak kod + GitHub Actions      │ Actions │ Sadece installer binary'leri     │
│ workflow + Dockerfile (API)      │ ──────► │ (.exe, .blockmap, latest.yml)    │
└──────────────────────────────────┘         └──────────────────────────────────┘
         │                                                 │
         │ git push                                        │ electron-updater
         ▼                                                 │ (her açılışta kontrol)
   Render.com (API)                                        ▼
   https://unixpadelst-jcxy.onrender.com           Fabrika / Merkez PC'leri
                                                    (UnixPadelST.exe)
```

- **Kaynak kod** `UnixPadel/UnixPadelST` (private) repo'sunda.
- **Installer'lar** `UnixPadel/UnixPadelST-Releases` (public) repo'sunda — auto-update için public olması zorunlu.
- **Build & publish** GitHub Actions ile otomatik (Windows runner). Sen lokal makinende electron-builder çalıştırmıyorsun.
- API her zaman Render'da merkezi.

---

## İLK KURULUM (bir kerelik — şirket org'unda)

### 1. Public release repo'sunu oluştur

GitHub'da `UnixPadel` org altında:
- **Name:** `UnixPadelST-Releases`
- **Visibility:** **Public** (electron-updater için zorunlu)
- **Initialize with README:** ✅ (boş repo'ya release yüklenemez)

### 2. Personal Access Token (PAT) üret

GitHub Actions'ın release repo'suna yazabilmesi için bir token gerekir.

1. GitHub → sağ üst profil → **Settings**
2. **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)**
4. **Note:** `UnixPadelST Actions release`
5. **Expiration:** 1 year
6. **Scopes:** `public_repo` (sadece public repo'lara yazma)
7. **Generate token** → değeri kopyala (bir daha gösterilmez)

> Fine-grained token kullanıyorsan: sadece `UnixPadelST-Releases` repo'suna **Contents: Read and write** yetkisi yeterli.

### 3. Token'ı Actions secret olarak ekle

1. `UnixPadel/UnixPadelST` repo'suna git
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**
4. **Name:** `RELEASES_TOKEN`
5. **Value:** Az önce kopyaladığın token (`ghp_...`)
6. **Add secret**

> Workflow `secrets.RELEASES_TOKEN`'a referansla bu değeri okuyacak. Token kod tabanına asla girmez.

---

## YENİ SÜRÜM ÇIKARMA (her release'de)

### 1. Sürüm numarasını arttır

`CrmModern.Web/package.json` içinde:
```json
"version": "0.2.0"  →  "version": "0.2.1"
```

SemVer:
- `0.2.x` — bug fix, küçük UI değişikliği
- `0.x.0` — yeni özellik
- `x.0.0` — büyük yapısal değişiklik

### 2. Sürüm notunu yaz ("Neler Yeni")

`CrmModern.Web/src/data/changelog.ts` → `RELEASE_NOTES` dizisinin **başına**, `versiyon`
alanı package.json ile **birebir aynı** olan TR + EN bir kayıt ekle:

```ts
{
  versiyon: '0.3.0',
  tarih:    '2026-10-22',
  baslik:   { tr: 'Kısa başlık', en: 'Short title' },
  maddeler: { tr: ['Kullanıcının anlayacağı dille madde'], en: ['Same item in English'] },
},
```

- Kullanıcılar güncellemeden sonraki ilk girişte bu notu **bir kez** görür (kullanıcı başına;
  atladıkları sürümlerin notları da birlikte gösterilir).
- Kayıt unutulursa yayın durmaz; Actions'ta **"Sürüm notu eksik"** uyarısı çıkar ve o sürümde
  pencere açılmaz. Lokal kontrol: `node CrmModern.Web/scripts/check-release-notes.mjs`

### 3. Commit + tag + push

```powershell
git commit -am "release: v0.2.1"
git tag v0.2.1
git push && git push --tags
```

Tag push edilir edilmez GitHub Actions otomatik tetiklenir.

### 4. Build'i izle

`UnixPadel/UnixPadelST` repo'sunda **Actions** sekmesi → çalışan workflow'u takip et (~8-12 dk).

### 5. Draft release'i yayına al

Workflow başarılı olunca `UnixPadelST-Releases` repo'sunda **draft release** oluşur.

1. https://github.com/UnixPadel/UnixPadelST-Releases/releases
2. Draft `v0.2.1`'i bul → **Edit** → release notes yaz (opsiyonel)
3. **Publish release** ← bu butona basmadan kullanıcılar güncelleme almaz

### 6. Auto-update sessizce yayılır

- Mevcut kullanıcılar bir sonraki açılışta 5 sn içinde kontrol yapar
- Yeni sürüm arka planda iner (~1-2 dk)
- Bittiğinde küçük dialog: "Şimdi Yeniden Başlat / Sonra"
- "Sonra" → bir sonraki kapanışta otomatik kurulur

---

## MANUEL TETİKLEME (tag kullanmadan)

Eğer tag push etmek istemiyorsan, Actions sayfasından manuel tetikleyebilirsin:

1. `UnixPadel/UnixPadelST` → **Actions** sekmesi
2. Sol menüden **Release UnixPadelST** workflow'u
3. Sağ üstte **Run workflow** → version gir → **Run**

Yine de package.json'daki version doğru olmalı; manuel tetikleme sadece tag pipeline'ını atlatır.

---

## SIK SORULAN SORUNLAR

### "Actions başarılı ama Releases'te yeni sürüm yok"
- `secrets.RELEASES_TOKEN` doğru ayarlanmış mı? Token expire olmuş olabilir.
- Workflow loguna bak: "publishing → github" satırının altında 401 / 403 varsa token sorunu.

### "Kullanıcılar güncelleme almıyor"
- GitHub'da release **Publish** edilmiş mi (Draft değil)?
- Kullanıcı uygulamayı kapatıp tekrar açtı mı? Kontrol 5 sn sonra çalışır.
- `package.json` versiyonu kurulu olandan büyük mü?

### "Build başarısız: native dependency error"
- `npm ci` cache'i bozulmuş olabilir. Workflow'da `cache: 'npm'` satırını geçici kaldır, tekrar dene.

### "API URL değişti, ne yapacağım?"
1. `CrmModern.Web/.env.production` → yeni URL
2. Version bump
3. Tag + push → Actions otomatik yeni .exe çıkarır

---

## API DEPLOY (referans)

API tarafı Actions'tan bağımsız:
- Render `UnixPadel/UnixPadelST` repo'sunu otomatik build ediyor (Dockerfile)
- main'e her push → Render otomatik redeploy
- Mevcut URL: https://unixpadelst-jcxy.onrender.com
