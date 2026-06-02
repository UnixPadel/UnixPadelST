# UnixPadelST — Release & Auto-Update Rehberi

## Mimari özet

```
┌───────────────────────────┐         ┌──────────────────────────────┐
│ esrselin/UnixPadelST      │         │ esrselin/UnixPadelST-Releases│
│ (private)                 │         │ (public)                     │
│ Kaynak kod                │ release │ Sadece installer binary'leri │
│ + Dockerfile (API deploy) │ ───────►│ (.exe, .blockmap, latest.yml)│
└───────────────────────────┘         └──────────────────────────────┘
         │                                       │
         │ git push                              │ electron-updater
         ▼                                       │ (her açılışta kontrol)
   Render.com (API)                              ▼
   https://unixpadelst.onrender.com      Fabrika / Merkez PC'leri
                                          (UnixPadelST.exe)
```

- **Kaynak kod** `UnixPadelST` (private) repo'sunda kalır.
- **Installer'lar** `UnixPadelST-Releases` (public) repo'suna release olarak yüklenir — kullanıcıların auto-update yapabilmesi için public olması zorunlu (private releases token gerektirir).
- API her zaman Render'da merkezi; frontend ise her bilgisayardaki .exe'nin içinde paketli.

---

## İLK KURULUM (bir kerelik)

### 1. Public release repo'sunu oluştur

GitHub'da yeni bir repo aç:
- **Name:** `UnixPadelST-Releases`
- **Visibility:** **Public**
- **Initialize with README:** isteğe bağlı (boş da olabilir)

Bu repo'ya kod **PUSH ETMEYECEKSİN** — sadece electron-builder release artifact'leri yükleyecek.

### 2. Personal Access Token (PAT) üret

electron-builder release oluşturabilmek için yetkili bir token gerekir.

1. GitHub → sağ üst profil → **Settings**
2. Sol menü en altta **Developer settings**
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
4. **Note:** `UnixPadelST release publish`
5. **Expiration:** 90 days (veya istediğin)
6. **Scopes:** sadece `public_repo` yeterli (tüm `repo` da olur ama daha geniş)
7. **Generate token** → çıkan değeri **kopyala** (bir daha gösterilmez)

### 3. Token'ı lokal makinene kaydet

PowerShell'de **kalıcı** env var olarak:

```powershell
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'ghp_xxxYOUR_TOKENxxx', 'User')
```

> **Not:** Yeni bir PowerShell penceresi açtığında env var aktif olur. Aynı pencerede hemen kullanmak için `$env:GH_TOKEN = 'ghp_xxx'` de yapabilirsin (oturumluk).

Token'ı doğrula:
```powershell
echo $env:GH_TOKEN
```

### 4. `electron-updater` paketini yükle

```powershell
cd CrmModern.Web
npm install
```

(`package.json` zaten güncel, sadece paketi indirir.)

---

## YENİ SÜRÜM ÇIKARMA (her release'de)

### 1. Sürüm numarasını arttır

`CrmModern.Web/package.json` içinde:
```json
"version": "0.1.0"  →  "version": "0.1.1"
```

SemVer kuralı:
- **0.1.x** — küçük UI değişikliği, bug fix
- **0.x.0** — yeni özellik
- **x.0.0** — büyük yapısal değişiklik

### 2. Release komutu

```powershell
cd CrmModern.Web
npm run release
```

Bu komut:
1. Vite ile frontend'i build eder (`dist/`)
2. electron-builder ile installer'ı paketler (`release/UnixPadelST-Setup-0.1.1.exe`)
3. `GH_TOKEN` ile `UnixPadelST-Releases` repo'sunda yeni bir release oluşturur (draft)
4. `.exe`, `.blockmap`, `latest.yml` dosyalarını release'e yükler

### 3. Release'i yayına al

1. https://github.com/esrselin/UnixPadelST-Releases/releases adresine git
2. Yeni oluşan **draft release**'i bul (örn. `v0.1.1`)
3. **Edit** → release notes yaz (opsiyonel) → **Publish release** tıkla

> ⚠️ Draft kaldığı sürece kullanıcılar güncelleme almaz. **Publish** etmeyi unutma.

### 4. Otomatik güncellemeyi izle

- Mevcut kullanıcılar uygulamayı bir sonraki açışlarında 5 sn içinde update kontrolü yapar
- Yeni sürüm arka planda indirilir (genelde 1-2 dk)
- İndirme bitince kullanıcıya küçük dialog çıkar: "Şimdi Yeniden Başlat / Sonra"
- "Sonra" → bir sonraki kapanışta otomatik uygulanır

---

## SIK SORULAN SORUNLAR

### "Sürüm yükselttim ama kullanıcılar yeni sürümü görmüyor"
- GitHub'da release **Publish** edilmiş mi (Draft değil)?
- Kullanıcı uygulamayı kapatıp tekrar açtı mı? (Update kontrolü 5 sn sonra çalışır)
- `package.json` versiyonu gerçekten arttırıldı mı?

### "GH_TOKEN bulunamadı hatası"
- PowerShell penceresini kapatıp yeniden açtın mı? (env var oturuma yansır)
- `echo $env:GH_TOKEN` boş dönüyorsa `SetEnvironmentVariable` adımını tekrar yap

### "electron-updater HTTP 404"
- `UnixPadelST-Releases` repo gerçekten **public** mi?
- `package.json` içindeki `publish.owner` ve `publish.repo` doğru mu?
- En az bir release publish edilmiş mi? (İlk release manuel publish gerekir)

### "Kullanıcıyı dialog ile rahatsız etmek istemiyorum"
`electron/main.cjs` içinde `update-downloaded` handler'ındaki `dialog.showMessageBox` çağrısını sil; sadece `autoInstallOnAppQuit = true` kalsın. O zaman güncelleme tamamen sessiz, kullanıcı bir sonraki açılışta yeni sürümü görür.

---

## API DEPLOY (referans)

API tarafı bu süreçten bağımsız — kaynak kod ana repo'ya push edilir, Render otomatik redeploy yapar. Bkz: ana repo'daki `Dockerfile` ve Render dashboard.
