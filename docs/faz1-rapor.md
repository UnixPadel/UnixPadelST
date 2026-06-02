# Faz 1 — Login + JWT + Rol Bazlı Layout Raporu

_Tarih: 2026-05-05_

## 1. WinForms'tan Birebir Portlanan Davranışlar

### Login (Form1.cs 187–237)
- Sorgu: `SELECT * FROM KullaniciBilgileri WHERE KullaniciAdi = @k AND Sifre = @s`
- **Şifre saklama:** DB kolonu `Sifre varchar(25)` — düz metin. WinForms düz metin karşılaştırma yapıyor, modern API de aynı şekilde karşılaştırıyor (`KullaniciRepository.GetByKullaniciAdiAndSifreAsync`). **Hash'a geçirilmedi.**
  - `UserService.cs` üst notunda `TODO(faz3)`: yeni kullanıcılar için bcrypt opsiyonu, eski kayıtlar için dual-read.
- `Durum != "Aktif"` → 401 + "Hesabınız pasif durumda."
- Eşleşme yoksa → 401 + "Kullanıcı adı veya şifre hatalı."
- Tablo boş / DB hatası → middleware `ApiResponse.Fail` zarfı + uygun HTTP kodu (500 değil 401 üretmiyoruz; gerçek server hatasıysa 500 dönmesi doğru).

### Menü erişimi (Form3.cs 148–323)
- 6 rol: `Yonetici · Temsilci · Muhasebe · Fabrika · Lojistik · Gozlemci`
- Yetki matrisi: bkz. [`faz1-yetki-matrisi.md`](faz1-yetki-matrisi.md).
- `Yonetici` ≡ admin (alias yok); `[Authorize(Roles="Yonetici")]` user CRUD'unda kullanıldı.
- "Satın Alma" özel kuralları (`elshan.rasulov`, `omur.caliskan`) `LoginResponseDto.CanApprovePurchase` ve `KullaniciBilgileri.SatinAlmaYetkisi` üzerinden taşınıyor; `AuthService.PurchaseRequestRoles`'a Form3 satır 319 ile uyumlu olacak şekilde **`Temsilci` rolü eklendi** (önceden eksikti).

### KullaniciYonet (KullaniciYonet.cs)
- INSERT öncesi `KullaniciAdi` benzersizlik kontrolü → `UserService.CreateAsync` `BusinessException` fırlatıyor.
- Tüm zorunlu alanlar (KullaniciAdi/Ad/Soyad/Sifre/Email/Telefon/Durum/YetkiTuru) DTO'da zorunlu.
- `OlusturmaTarihi` & `SatinAlmaYetkisi` kolonları tabloda mevcuttu, entity'ye eklendi (`Kullanici.cs`) ve `KullaniciConfiguration.cs`'e map edildi. Map'leme dışı değişiklik yok — şema dokunulmadı.

## 2. Backend — Tamamlanan Endpointler

| Method | Route | Auth | Notu |
|---|---|---|---|
| POST | `/api/auth/login` | yok | { token, kullaniciID, kullaniciAdi, ad, soyad, yetkiTuru, canApprovePurchase, canViewPurchaseRequests } |
| GET  | `/api/auth/me` | JWT | sayfa yenilemede kullanıcıyı tazeler, token yok |
| POST | `/api/auth/logout` | JWT | 204; JWT stateless — sadece client temizliği |
| GET  | `/api/users` | Yonetici | tüm kullanıcılar |
| GET  | `/api/users/{id}` | Yonetici | tekil |
| POST | `/api/users` | Yonetici | duplicate `KullaniciAdi` kontrolü |
| PUT  | `/api/users/{id}` | Yonetici | şifre dışı alanlar |
| DELETE | `/api/users/{id}` | Yonetici | hard delete |
| POST | `/api/users/{id}/password` | Yonetici | düz metin şifre güncelleme |

JWT pipeline `Program.cs` zaten yapılandırılmış: `AddAuthentication(JwtBearer) + AddAuthorization`, claim'lerde `ClaimTypes.Role = YetkiTuru`. Swagger Bearer auth tanımı mevcut. CORS `http://localhost:5173` + credentials açık.

JWT secret + DB şifresi `dotnet user-secrets`'tan okunuyor; appsettings.json'da hâlâ `REPLACE_WITH_USER_SECRETS` placeholder var (Faz 0'dan beri).

## 3. Frontend — Tamamlananlar

- `src/api/auth.ts` → `login`, `me`, `logout`
- `src/api/users.ts` → `getUsers`, `createUser`, `updateUser`, `deleteUser`, `changeUserPassword`
- `src/lib/axios.ts` → request interceptor `Authorization: Bearer <token>`, response interceptor 401 → `localStorage` temizliği + `/login` redirect
- `src/hooks/useAuth.ts` → `getUser/saveUser/logout/isLoggedIn` (localStorage backed)
- `src/components/Layout.tsx` → mount'ta `me()` ile kullanıcıyı tazeleyip bootstrap; token yoksa `/login`
- `src/components/RoleGuard.tsx` → `roles` listesi dışındaki kullanıcılar `/dashboard`'a düşer
- `src/App.tsx` → `/users` rotası `RoleGuard roles={['Yonetici']}` ile sarıldı
- `src/components/Sidebar.tsx` → halihazırda role bazlı filtreleme yapıyordu; Çıkış Yap artık `apiLogout` da çağırıyor
- `src/pages/users/UsersPage.tsx` → DataTable + Yeni Kullanıcı modal + Düzenle modal + **Şifre sıfırla modal** + **Sil** (window.confirm ile)

## 4. Manuel Smoke Test Sonuçları

| Test | Beklenen | Sonuç |
|---|---|---|
| `POST /api/auth/login` (yanlış creds) | 401 | ✅ 401 |
| `GET /api/users` (token'sız) | 401 | ✅ 401 |
| `GET /api/auth/me` (token'sız) | 401 | ✅ 401 |
| `dotnet build` | 0 hata | ✅ 0 uyarı 0 hata |
| `tsc --noEmit` (Web) | 0 hata | ✅ temiz |
| Swagger json | tüm yeni endpointler listeli | ✅ `/api/Auth/{login,me,logout}` + `/api/users[/{id}[/password]]` |
| Vite dev server | 200 / + /login | ✅ |

Tarayıcı üzerinden gerçek kullanıcıyla uçtan uca giriş testini kullanıcı kendisi yapmalı; yetkili bir kayıt için DB'deki bir kullanıcı adı/şifre lazım — bu raporda kimlik bilgisi paylaşmadım.

## 5. Bilinen Eksikler / Sonraki Faza Devir

- **bcrypt hashing**: `UserService.cs` üst yorumunda `TODO(faz3)`. DB kolonu varchar(25) — geçişte kolonu varchar(255)+ büyütmek gerekecek.
- **"Beni hatırla"** WinForms'ta credentials.txt ile yapılıyordu; modern tarafta localStorage token zaten otomatik geri yükleniyor — ek alan gerekmedi.
- **Dil değiştirici** (Tr/Eng) WinForms login ekranındaydı; modern login'de yok. Faz 2+ için isteğe bağlı.
- **Pasif kullanıcı UI rozeti**: UsersPage'te `StatusBadge` Aktif/Pasif gösteriyor; pasif kullanıcının login denemesinde doğru hata mesajı dönüyor — uçtan uca tutarlı.
- **Satın Alma menüsü** içindeki üç özel butonun (`canApprovePurchase` vb.) frontend'de görünürlük filtresi Faz 2'de uygulanacak.
- **Logging/Audit**: Şifre değişikliği audit edilmiyor; Faz 2'de `EklemeGecmisi` tablosu (DB'de zaten var) entity'leştirilebilir.
- **Şifre sıfırlamada eski şifre kontrolü** yok (admin sıfırlaması). Self-service şifre değiştirme henüz yok — gerekirse `POST /api/auth/change-password` Faz 2'de eklenir.

## 6. Çalıştırma Notları

```bash
# Backend
cd CrmModern/CrmModern.API
dotnet run --launch-profile http     # http://localhost:5001 (Swagger /swagger)

# Frontend
cd CrmModern/CrmModern.Web
npm run dev                           # http://localhost:5173
```
