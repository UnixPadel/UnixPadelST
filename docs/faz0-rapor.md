# Faz 0 — Ortam ve DB Durum Raporu

_Tarih: 2026-05-05_

## 1. Bağlantı Durumu

**DB Bağlantısı: BAŞARILI ✅**

- Sunucu: `b5l1shhnklxmq4ogmpjc-mysql.services.clever-cloud.com:21446`
- Veritabanı: `b5l1shhnklxmq4ogmpjc`
- Şifre `dotnet user-secrets` ile saklandı (appsettings.json'da `REPLACE_WITH_USER_SECRETS` placeholder olarak kaldı; user-secrets override ediyor).
- JWT `SecretKey` de user-secrets'a yazıldı.
- Şema dökümü: [`docs/db-schema-snapshot.md`](db-schema-snapshot.md) — küçük tek seferlik bir konsol aracıyla (`_tools/SchemaDump`, MySqlConnector) `INFORMATION_SCHEMA` üzerinden alındı.

## 2. DB'deki Tablo Listesi (46 tablo)

```
BilesenBilgileri          ChatMessages              ClientCategories
ClientProjects            ClientResources           Clients
DestekTalepleri           DetayTablo                DiscussionAssignedUsers
DiscussionParticipants    Discussions               EklemeGecmisi
ExcelIndir                FileStorage               GuncellemeKontrol
KategoriBilesenleri       KullaniciBilgileri        LojistikTablo
MeetingDocuments          MeetingNotes              MeetingParticipants
Meetings                  MessageDocuments          MuhasebeIslemTablo
MusteriBilgileri          OznitelikTablo            Projects
SatinAlmaTalep            SatinAlmaTalepleri        SiparisAlTablo
SiparisIslemTablo         SiparisOnaylari           SiparisTeslimatTablo
StokTablo                 TalepOnaylari             TalepUrunleri
TamamlandiTablo           TaskAssignments           TaskClients
TaskProjects              Tasks                     TeslimatBilgileri
TeslimatBilgisiTablo      UlkelerBilgileri          UrunKategorileri
UrunMaliyetTablo
```

## 3. Entity ↔ Tablo Eşleşmesi

`CrmModern.Core/Entities` altındaki **14 entity**, `Configurations` altındaki **14 konfigürasyon** ile DB'deki tablolara birebir eşleşiyor:

| Entity | ToTable(...) | DB'de Var mı |
|---|---|---|
| `Kullanici` | `KullaniciBilgileri` | ✅ |
| `Musteri` | `MusteriBilgileri` | ✅ |
| `Ulke` | `UlkelerBilgileri` | ✅ |
| `Order` | `SiparisAlTablo` | ✅ |
| `OrderItem` | `SiparisIslemTablo` | ✅ |
| `OrderDetail` | `DetayTablo` | ✅ |
| `DeliveryAddress` | `TeslimatBilgisiTablo` | ✅ |
| `ProductCategory` | `UrunKategorileri` | ✅ |
| `Component` | `BilesenBilgileri` | ✅ |
| `CategoryComponent` | `KategoriBilesenleri` | ✅ |
| `Attribute` | `OznitelikTablo` | ✅ |
| `LogisticsEntry` | `LojistikTablo` | ✅ |
| `AccountingTransaction` | `MuhasebeIslemTablo` | ✅ |
| `PurchaseRequest` | `SatinAlmaTalep` | ✅ |

**Eşleşme oranı (entity → tablo): 14/14 = %100**
**Tablo kapsama oranı (tablo → entity): 14/46 ≈ %30**

### 3.1. DB'de Olup Entity'si Olmayan Tablolar (32)

Modernizasyon kapsamında ileride eklenmeleri gerekecek alanlar:

- **Müşteri/Proje yönetimi:** `Clients`, `ClientCategories`, `ClientProjects`, `ClientResources`, `Projects`
- **Görev (Task) modülü:** `Tasks`, `TaskAssignments`, `TaskClients`, `TaskProjects`
- **Toplantılar:** `Meetings`, `MeetingNotes`, `MeetingParticipants`, `MeetingDocuments`
- **Tartışma/Chat:** `Discussions`, `DiscussionAssignedUsers`, `DiscussionParticipants`, `ChatMessages`, `MessageDocuments`
- **Destek/Talep:** `DestekTalepleri`, `SatinAlmaTalepleri`, `TalepOnaylari`, `TalepUrunleri`, `SiparisOnaylari`
- **Lojistik/Stok/Maliyet:** `StokTablo`, `UrunMaliyetTablo`, `SiparisTeslimatTablo`, `TeslimatBilgileri`, `TamamlandiTablo`
- **Sistem:** `EklemeGecmisi`, `GuncellemeKontrol`, `ExcelIndir`, `FileStorage`

### 3.2. Entity'si Olup DB'de Olmayan

**Yok.** Tüm 14 entity, mevcut DB'de bir tabloya karşılık geliyor.

## 4. Konfigürasyon Kapsamı

`Persistence/Configurations` klasöründe **14 konfigürasyon dosyası** var; her biri bir entity'ye karşılık geliyor:

```
AccountingTransactionConfiguration   AttributeConfiguration
CategoryComponentConfiguration       ComponentConfiguration
DeliveryAddressConfiguration         KullaniciConfiguration
LogisticsEntryConfiguration          MusteriConfiguration
OrderConfiguration                   OrderDetailConfiguration
OrderItemConfiguration               ProductCategoryConfiguration
PurchaseRequestConfiguration         UlkeConfiguration
```

`AppDbContext.OnModelCreating` içinde `ApplyConfigurationsFromAssembly(...)` çağrısı ile hepsi otomatik yükleniyor — orphan konfigürasyon yok, eksik kayıt yok.

## 5. Tespit Edilen Riskler

1. **İki adet "Satın Alma" tablosu mevcut:**
   - `SatinAlmaTalep` (entity ile eşleşmiş, yeni CRM tarafı)
   - `SatinAlmaTalepleri` (entity'siz, eski WinForms tarafı?)
   - **Risk:** Faz 0'a göre WinForms şemasını birebir koruyacağız. Hangi tablonun "kanonik" olduğu netleşmeden iki kaynak senkronize tutulamaz. Faz 1'de hangi tablo nereye yazıyor mutlaka netleşmeli.

2. **İki adet "Teslimat" tablosu mevcut:**
   - `TeslimatBilgisiTablo` (entity: `DeliveryAddress`)
   - `TeslimatBilgileri` (entity'siz)
   - Aynı tip duplikasyon riski; içerik farklı olabilir, snapshot dosyasında her ikisinin kolonları kontrol edilmeli.

3. **Sipariş onay zinciri eksik kapsama:** `Order` (SiparisAlTablo) entity'si var ama ilişkili `SiparisOnaylari`, `SiparisTeslimatTablo` entity'siz. Sipariş yaşam döngüsünün yarısı modern tarafta görünmüyor.

4. **Ürün maliyet & stok eksik:** `StokTablo`, `UrunMaliyetTablo` modellenmemiş — fiyat/maliyet hesabı API tarafında üretilemez.

5. **Kullanıcı/Müşteri ayrımı:** `MusteriBilgileri` (entity: `Musteri`) ile `Clients`/`ClientCategories` farklı tablolar; muhtemelen iki ayrı müşteri konsepti var. Hangisinin "müşteri" olduğu netleştirilmeli.

6. **Index/FK denetimi:** Detaylı liste `db-schema-snapshot.md` "Foreign Keys" ve "Indexler" bölümlerinde. Faz 1 öncesi entity-FK uyumluluğu ayrıca kontrol edilmeli — şu anda sadece tablo/kolon eşleşmesi doğrulandı.

## 6. Sonraki Adımlar (Faz 0 dışında)

- Sıralama önerisi: Önce Auth/JWT akışı uçtan uca test edilmeli (Faz 1), sonra eksik domain'ler entity olarak eklenmeli (Faz 2+). Migration üretmeden, mevcut tablolara `ToTable(...)` map'lemesi yeterli.
