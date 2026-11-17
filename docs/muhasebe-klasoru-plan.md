# Muhasebe Klasörü — UX analizi, yeni user flow ve uygulama planı

Durum: **Onaylandı ve uygulandı (commit edilmedi)** · 2026-11-16 · K1–K6 varsayılanlarla.

Uygulama notları: "Tümünü indir (ZIP)" kapsam dışı kaldı. Tahsilat ekranında satırda zaten "+ Tahsilat" olduğu için ikinci bir "+" eklenmedi; orada yalnız klasör düğmesi (sayaçlı) var. Klasör sayaçları liste DTO'larına eklenmek yerine tek bir `GET /api/orders/folder-counts` ucundan gelir (tüm ekranlar aynı önbelleği paylaşır). Electron'da PDF önizlemesi için `webPreferences.plugins: true` açıldı.

## 1. Bugünkü akış ve sorunları

| # | Bugün | Bilişsel yük / risk |
|---|---|---|
| 1 | Aynı "Muhasebe Ek" etiketi Muhasebe Onay'da **yükler**, Kontrol'de **indirir**. | Aynı kelime iki farklı iş yapıyor; kullanıcı her seferinde hatırlamak zorunda. |
| 2 | Dosya seçildiği anda yüklenir ve **öncekinin üzerine yazar**; uyarı ve geri alma yok. | Sessiz veri kaybı. |
| 3 | Siparişte ek olup olmadığı hiçbir yerde görünmez; öğrenmenin yolu indirip "Ek dosya yok" hatası almak. | Deneme-yanılma. |
| 4 | Muhasebe, yüklediği dosyayı Tahsilat ve Muhasebe Onay ekranlarından geri alamaz. | Yükleyen, kendi dosyasına ulaşamıyor. |
| 5 | Sipariş başına **tek dosya**; birden fazla belge için ZIP'lemek gerekir. | Uygulama dışında fazladan iş. |
| 6 | Dosya adı ve türü saklanmaz; indirilen her dosyanın adı `.zip` olur (PDF yüklendiyse açılmaz). | Bozuk görünen dosya. |
| 7 | Proforma (Excel/PDF) sipariş başlığında, ekler başka ekranlarda. | Bir siparişin belgeleri için birkaç yere bakmak. |
| 8 | En çok açılan ekranda, yani Sipariş Detayı'nda ek yükleme ya da indirme yok. | Yanlış ekrana gitme. |
| 9 | Önizleme yok; tür ve boyut kontrolü yok (16 MB üstü genel hatayla düşer). | Hata mesajı anlaşılmaz. |

## 2. Tasarım ilkesi

**"Her siparişin bir Muhasebe Klasörü vardır."** Tek kavram, tek bileşen, her yerde aynı simge ve aynı davranış.

- Klasör her yerde aynı pencereyi açar; ekrana göre farklı düğme davranışı yoktur (sorun 1).
- Düğmede dosya sayısı görünür: `Muhasebe Klasörü · 3`. Kullanıcı açmadan içinin dolu olduğunu görür (sorun 3).
- Yükleme her zaman **ekler**, asla üzerine yazmaz; silme ayrı bir eylemdir ve onay ister (sorun 2, 5).
- Proforma klasörün içinde de durur; bir siparişin tüm belgeleri tek yerde toplanır (sorun 7).

## 3. Muhasebe Klasörü penceresi

```
┌ Muhasebe Klasörü — SSAMA09112026585 ────────────────── ✕ ┐
│ ┌─────────────────────────────────────────────────────┐  │  ← yalnız Muhasebe / Yönetici
│ │  Dosyaları buraya sürükle ya da  [Dosya seç]        │  │
│ │  PDF, Excel, Word, görsel, ZIP · en çok 25 MB       │  │
│ └─────────────────────────────────────────────────────┘  │
│ PROFORMA  (otomatik, siparişin güncel hâli)              │
│  📊 Proforma (Excel)                         [İndir]     │
│  📄 Proforma (PDF)                [Görüntüle] [İndir]    │
│ MUHASEBE EKLERİ (2)                                      │
│  📄 fatura-2026-118.pdf  1,2 MB · Burcu K. · 12.11.2026  │
│                          [Görüntüle] [İndir] [Sil]       │
│  🖼 dekont.jpg           340 KB · Burcu K. · 10.11.2026  │
│                          [Görüntüle] [İndir] [Sil]       │
│ SATICI EK                                                │
│  🗜 siparis_ek_SSAMA….zip  2,4 MB                [İndir] │
└──────────────────────────────────────────────────────────┘
```

- Yükleme: birden çok dosya; her dosya kendi ilerleme çubuğuyla ayrı istekte gider. Tür ya da boyut uygun değilse dosya yüklenmeden satırında hata gösterilir.
- Görüntüle: PDF ve görseller büyük bir önizleme penceresinde açılır. Excel, Word ve ZIP yalnızca indirilir.
- Sil: "‘fatura.pdf’ silinsin mi? Bu işlem geri alınamaz." onayı (`useConfirm`).
- Boş durum: "Bu siparişin henüz muhasebe eki yok." Yükleme yetkisi olan kullanıcı bu metnin altında yükleme alanını da görür.
- Eski tek "Muhasebe Ek" dosyası varsa, *Muhasebe Ekleri* altında "Önceki muhasebe eki" adıyla, doğru uzantıyla listelenir.

## 4. Düğmenin yeri

**Sipariş Detayı başlık şeridi, belge düğmelerinin yanı** (görseldeki ekran):

```
[Teklif] [Kontrolde] 09.11.2026 · Unixpadel     [Kopyalayıp yeni oluştur] [Excel] [PDF] [📁 Muhasebe Klasörü · 3]
```

Neden burası:
- Kullanıcı belgeyi zaten bu kümede arıyor (Excel, PDF). Klasör de belge kümesinin "tamamı" olduğu için onların hemen yanında, kümenin sonunda durur.
- Başlık şeridi kaymaz, bölüm çapası (Genel · Kalemler…) seçili olsa bile hep görünür.
- `OrderDetailPanel` tek bileşen olduğundan düğme siparişin açıldığı **her yerde** kendiliğinden görünür: Siparişlerim, Kontrol, Fabrika, Lojistik Hazır ve Geçmiş, Muhasebe ekranları, Bekleyen İşler, Arama, Cari Bakiye (`?order=`).
- Excel ve PDF hızlı düğmeleri kalır; satış temsilcisinin sık yaptığı "proformayı indir" işi tek tıkta kalır.

## 5. Yeni user flow

**Akış A — Sipariş açıkken (herkes, en sık yol)**
Herhangi bir listede satırı aç → Sipariş Detayı → `Muhasebe Klasörü · n` → klasörde görüntüle / indir (yetkiliyse ekle / sil) → Esc → siparişe dönülür.

**Akış B — Toplu dosyalama (Muhasebe)**
Menü → *Muhasebe · Klasörler* → filtre *Klasör: Dosyası olmayanlar* → satırdaki **+** → klasör açılır ve dosya seçici kendiliğinden açılır → dosya seç → yüklenir, satırdaki sayaç artar, satır filtreden düşer → sonraki satır.

**Akış C — İş ekranları (Tahsilat, Muhasebe Onay, Kontrol)**
Bugünkü "Muhasebe Ek" / "Ek yükle" düğmelerinin yerine aynı `Muhasebe Klasörü · n` düğmesi gelir ve aynı pencereyi açar. Ayrı yükleme penceresi kaldırılır.

## 6. Menü kararı: yeni sekme mi, mevcut ekran mı?

Önerin "Muhasebe Ek Dosya" adında yeni bir sekme açmaktı. *Muhasebe · Teklif ve Siparişler* (MS) ekranı zaten tüm teklif ve siparişleri listeliyor ve her satırda proforma Excel/PDF düğmesi var; bu, klasörün işinin yarısı. Yeni bir sekme aynı listeyi ikinci kez gösterir ve "dosyayı hangi ekrandan ekliyordum?" sorusunu doğurur.

**Öneri:** MS ekranı klasör merkezine dönüşsün, adı *Muhasebe · Klasörler* olsun (kısayol kodu MS aynı kalsın).
- Yeni sütun: **Klasör**. Sayaç gösterir (`📁 3` ya da `—`); tıklanınca klasörü açar.
- Satırda **+** düğmesi (Akış B).
- Yeni filtre: *Klasör: Tümü / Dosyası olan / Dosyası olmayan*. Muhasebenin asıl ihtiyacı "belgesi eksik siparişleri bulmak".
- Satırdaki ayrı Excel ve PDF simgeleri sağ tık menüsüne taşınır; proforma klasörün içinde de duruyor. Satırda üç düğme kalır: Siparişi Aç · Klasör · +.

## 7. Kararlar (onaylarsan bu varsayılanlarla ilerlerim)

| # | Konu | Varsayılan |
|---|---|---|
| K1 | Parayı göremeyen kullanıcılar (Fabrika rolü ve `hideMoney` kapsamındakiler) | Klasör düğmesini **görmez**. Proformayı zaten indiremiyorlar; muhasebe belgeleri (fatura, dekont) tutar içerir. |
| K2 | Görüntüleme ve indirme | Sipariş Detayı'nı açabilen herkes (Satış Temsilcisi kendi siparişinde). Proforma için bugünkü kural aynen geçerli. |
| K3 | Ekleme ve silme | Yalnızca **Muhasebe** ve **Yönetici** (bugünkü yükleme yetkisiyle aynı). Silme onay ister, denetim kaydına yazılır. |
| K4 | Satıcı Ek | Klasörde salt okunur olarak görünür (temsilcinin yüklediği ZIP/RAR). |
| K5 | Eski tek "Muhasebe Ek" verisi | Taşınmaz; klasörde "Önceki muhasebe eki" olarak gösterilir. İndirilebilir ve silinebilir. |
| K6 | Menü | Yeni sekme yerine MS ekranı → *Muhasebe · Klasörler* (bölüm 6). |

## 8. Uygulama planı

### Faz 1 — Backend
1. **Tablo** `SiparisMuhasebeEk` (`DatabaseSchemaMigrator`, `CREATE TABLE IF NOT EXISTS`): `EkID, SiparisAlID, Ad, Tip, Boyut, Veri LONGBLOB, Tarih, YukleyenKullaniciID, YukleyenKullaniciAdi`, index `SiparisAlID`. Siparişe numara yerine `SiparisAlID` ile bağlanır; teklif siparişe dönüp numara değişse de bağ kopmaz.
2. **Core**: `OrderAccountingFile` entity, `OrderFolderDto` / `OrderFolderFileDto`, `IOrderFolderRepository`, `IOrderFolderService`.
3. **Infrastructure**: EF configuration ve `DbSet`; repository (blob'suz liste projeksiyonu, tek dosya, ekle, sil, sipariş başına toplu sayım); `UnitOfWork` property'si; `OrderFolderService` (yetki, tür ve boyut kontrolü, eski blob'ların magic-byte ile tür tespiti, `IAuditService` ile denetim kaydı). Eski kod `SiparisOnaylari` tablosuna "Onaylandi" yazıyordu; yeni kod bu tabloya dokunmaz.
4. **API** `OrderFolderController`:
   - `GET  /api/orders/{no}/folder` → klasör içeriği (blob yok) + `canManage`, `canSeeProforma`
   - `POST /api/orders/{no}/folder/files` → tek dosya (Muhasebe, Yönetici)
   - `GET  /api/orders/{no}/folder/files/{id}?inline=true` → indir ya da önizle (gerçek ad ve içerik tipiyle)
   - `DELETE /api/orders/{no}/folder/files/{id}` (Muhasebe, Yönetici)
   - Tür listesi ve 25 MB sınırı `PurchaseController`'dan ortak bir `FileRules` sınıfına taşınır. Dosyalar tek tek gönderildiği için Kestrel'in 30 MB istek sınırına takılmaz.
5. **Uyumluluk**: `POST /api/accounting/orders/{no}/muhasebe-ek` artık yeni tabloya **ekler**. Eski indirme ucu (`/attachments/muhasebeek`) kalır.
6. **Sayaçlar**: `OrderListDto`, `AccountingOrderListDto` ve `OrderDetailDto` içine `muhasebeEkSayisi` (tek grup sorgusuyla; eski blob da sayılır).
7. **Satıcı Ek indirme düzeltmesi**: dosya adı magic-byte ile `.zip` / `.rar` olarak belirlenir. İstemci adı artık kendisi uydurmaz.

### Faz 2 — Ortak bileşenler (web)
1. `src/api/orderFolder.ts`: `getFolder`, `uploadFolderFile` (ilerleme ile), `downloadFolderFile`, `openFolderFilePreview`, `deleteFolderFile`.
2. `components/order/AccountingFolderDialog.tsx`: bölüm 3'teki pencere.
3. `components/order/AccountingFolderButton.tsx`: simge + sayaç; `variant="button" | "icon"`.
4. `components/FilePreviewDialog.tsx`: PDF (iframe, blob URL) ve görsel önizleme. Electron 42'de doğrulanacak; çalışmazsa indirmeye düşer.
5. Sorgu anahtarı `['order-folder', no]`; yükleme ve silmeden sonra klasör, sipariş detayı ve liste sayaçları yenilenir (`invalidateOrderGraph`).

### Faz 3 — Yerleşim
1. `OrderDetailPanel` başlık şeridi: PDF'in sağına `Muhasebe Klasörü · n` (K1 kuralıyla).
2. `AccountingOrdersViewPage` → *Muhasebe · Klasörler*: Klasör sütunu, + düğmesi, klasör filtresi; Excel ve PDF sağ tık menüsüne; menü adı ve açıklaması.
3. `AccountingPage` (Tahsilat): satırdaki yükleme simgesi ve "Ek yükle" menüsü → klasör; eski yükleme penceresi silinir.
4. `AccountingApprovalPage`: "Muhasebe Ek" düğmesi ve satır menüsü → klasör; eski yükleme penceresi silinir.
5. `QualityControlPage`: "Muhasebe Ek" (indir) → klasör.

### Faz 4 — Metinler, kılavuz, doğrulama
1. `tr.json` + `en.json`: `folder.*`, menü adı, yeni `apiErrors` kodları. Terim: **Muhasebe Klasörü / Accounting Folder**; `docs/ux-copy/00-sozluk.md`'ye eklenir. "Muhasebe Ek" ve "Satıcı Ek" sözlükteki gibi kalır.
2. `src/data/guide.ts`: klasör bölümü (TR + EN). `changelog.ts`: sonraki sürüm notu.
3. Doğrulama: `dotnet build`, web `npm run build` (tsc), tarayıcıda: Muhasebe kullanıcısıyla yükle → sayaç → önizle → indir (doğru ad) → sil; Satış Temsilcisiyle salt okunur görünüm; Fabrika'da düğmenin gizli olması.

### Kapsam dışı (istersen sonra)
- "Tümünü indir (ZIP)": proforma + tüm ekler tek dosyada.
- Dosya kategorisi (fatura / dekont / gümrük) ve etiketleme.
