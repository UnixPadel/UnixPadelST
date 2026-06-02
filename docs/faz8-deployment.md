# Faz 8 — Production Deployment Rehberi

> Bu doküman CrmModern'in production'a alınması için gereken minimum adımları
> içerir. Tek bir Linux sunucu + nginx reverse proxy üzerinden örneklenmiştir;
> IIS / Windows Server tercih edenler için notlar sona eklenmiştir.

## 1. Önkoşullar

| Bileşen | Sürüm | Not |
|---|---|---|
| .NET SDK | 8.0+ | Sadece publish makinesinde; sunucuda **ASP.NET Core Runtime 8** yeterli |
| Node.js | 20+ | Frontend build için (sunucuda gerekli değil) |
| npm | 10+ | |
| MySQL | 8.0+ | Üretim DB (mevcut Clever Cloud kullanılabilir) |
| nginx / IIS | herhangi | Reverse proxy + statik dist serve |

## 2. Environment variables

API runtime aşağıdaki değerleri **çevre değişkenleri** üzerinden okur
(`appsettings.Production.json` boş placeholder içerir):

```
export ASPNETCORE_ENVIRONMENT=Production
export ConnectionStrings__DefaultConnection="Server=...;Port=...;Database=...;User=...;Password=...;"
export JwtSettings__SecretKey="<en az 32 karakter rastgele bir string>"
export JwtSettings__Issuer="CrmModern.API"
export JwtSettings__Audience="CrmModern.Web"
export JwtSettings__ExpiryHours=8
```

Geliştirme tarafında `dotnet user-secrets` ile aynı isimler kullanılabilir.

## 3. Backend build & publish

Publish makinesinde:

```bash
cd CrmModern
dotnet publish CrmModern.API/CrmModern.API.csproj -c Release -o ./publish
```

Çıktı: `CrmModern/publish/` (`CrmModern.API.dll` + bağımlılıklar).
Faz 8 ölçümünde boyut ~19 MB framework-dependent.

Sunucuya kopyala (örn. rsync / scp / CI artifact) → `/opt/crmmodern/api/`.

Run komutu (systemd örneği):

```ini
# /etc/systemd/system/crmmodern-api.service
[Unit]
Description=CrmModern API
After=network.target

[Service]
WorkingDirectory=/opt/crmmodern/api
ExecStart=/usr/bin/dotnet /opt/crmmodern/api/CrmModern.API.dll
Restart=on-failure
RestartSec=5
User=www-data
EnvironmentFile=/etc/crmmodern/api.env
SyslogIdentifier=crmmodern-api

[Install]
WantedBy=multi-user.target
```

`/etc/crmmodern/api.env` içine yukarıdaki environment değişkenleri konulur
(`KEY=VALUE` formatında, `export` olmadan).

## 4. Frontend build

Publish makinesinde:

```bash
cd CrmModern/CrmModern.Web
npm install
npm run build
```

Çıktı: `CrmModern.Web/dist/` (~941 KB). `index.html` + `assets/*.js` + `*.css`.
Faz 8 ölçümü:
- `dist/assets/index-*.js` ~926 KB (gzip ~265 KB)
- `dist/assets/index-*.css` ~30 KB

Sunucuya kopyala → `/var/www/crmmodern/`.

**API base URL:** Frontend `VITE_API_URL` build zamanı env'i okur. Production
build öncesi:

```bash
echo 'VITE_API_URL=https://api.crm.example.com' > .env.production.local
npm run build
```

Veya nginx üzerinden aynı origin'den serve ediliyorsa boş bırak (relative path).

## 5. nginx reverse proxy

`/etc/nginx/sites-available/crmmodern.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name crm.example.com;

    ssl_certificate     /etc/letsencrypt/live/crm.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.example.com/privkey.pem;

    # Frontend (statik dist)
    root /var/www/crmmodern;
    index index.html;

    # SPA fallback — bilinmeyen rotalar index.html'e
    location / {
        try_files $uri /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass         http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name crm.example.com;
    return 301 https://$host$request_uri;
}
```

`ln -s ... /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx`

## 6. Schema migrator otomatik çalışır

İlk start'ta `DatabaseSchemaMigrator.ApplyAsync` çağrılır:
- `KullaniciBilgileri.Sifre` varchar(25) → varchar(255) (bcrypt için)
- `EklemeGecmisi` tablosuna `Action / EntityType / EntityId / Details` kolonları
- `TalepOnaylari` tablosunu CREATE IF NOT EXISTS

Tüm operasyonlar **idempotent** — her başlangıçta tekrar çalışmasında zarar yok.
Loglarda `KullaniciBilgileri.Sifre kolonu zaten varchar(255); ALTER atlandı.`
gibi mesajlar görülmesi normaldir.

## 7. bcrypt one-time migration

Önemli: Faz 8'den önceki kullanıcı hesapları DB'de **düz metin** parolaya
sahipti. Yeni AuthService:
- İlk başarılı login'de düz metin parolayı BCrypt hash ile **otomatik
  günceller** (lazy migration).
- İkinci login'den itibaren BCrypt.Verify yolu çalışır.

Operasyon notu: Production'a deploy edildikten sonra, kullanıcılar **bir kez
login olduktan sonra** parolaları hash'lenir. İsteğe bağlı toplu migration için
ayrı bir CLI script yazılabilir (Faz 9 backlog).

## 8. DB password rotation prosedürü

1. MySQL'de yeni şifre belirle.
2. `/etc/crmmodern/api.env` dosyasında `ConnectionStrings__DefaultConnection`
   güncelle.
3. `systemctl restart crmmodern-api`.
4. Logları kontrol et (`journalctl -u crmmodern-api -f`).

## 9. Sağlık kontrolü

- `curl -s http://127.0.0.1:5001/swagger/v1/swagger.json` → development'ta JSON.
- `curl -s -X POST https://crm.example.com/api/auth/login -H "Content-Type: application/json" -d '{"kullaniciAdi":"test","sifre":"test"}'` → 401 (geçersiz kullanıcı) bekleniyor.

## 10. IIS / Windows Server alternatifi

`dotnet publish` çıktısı IIS üzerinde de barındırılabilir — `web.config`
otomatik oluşturulur. ASP.NET Core Hosting Bundle 8 sunucuda kurulu olmalı.
Frontend dist klasörü statik site olarak IIS'e bağlanabilir. Reverse proxy
yerine `URL Rewrite` modülü ile aynı host'tan serve etme önerilir.

## 11. Bilinen sınırlar / Faz 9 backlog

- Output cache yok; dashboard `IMemoryCache` 60 sn TTL.
- Rate limiting yok (Faz 9: `AddRateLimiter`).
- Centralized logging (Serilog/Seq) henüz yok.
- HTTPS sertifikası Let's Encrypt manuel; otomatik renewal cronjob önerilir.
