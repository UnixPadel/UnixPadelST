# Bekleyen İşler → Ana Sayfa entegrasyonu — değerlendirme ve uygulama planı

Tarih: 13.11.2026 · Durum: **Faz 1 + Faz 2 uygulandı (v0.3.10)** — §5 kararları önerilen yönde alındı: Gözlemci'ye iş kuyruğu yok, çakışan KPI'lar gizlenir.
Kapsam: `CrmModern.Web` (Faz 1), `CrmModern.API` + `Infrastructure` (Faz 2)

---

## 1. Mevcut durum (kodda doğrulandı)

| Konu | Bulgu | Kaynak |
|---|---|---|
| Bekleyen İşler nerede | Ayrı rota `/inbox`, menüde "Genel" grubunun 2. öğesi. Rozeti **yok** (`countField` tanımsız). | `lib/navigation.ts:38` |
| Ana Sayfa ne gösteriyor | KPI kartları → ciro şeridi → grafikler → "Ekranlar" kartları. Kişinin **ne yapması gerektiği** hiçbir yerde yok. | `pages/DashboardPage.tsx:258-323` |
| KPI sayıları | **Küresel** ve kendi tanımları var (örn. "Sevkiyat bekleyen = Hazır + Lojistik"). Kullanıcıya özel kuyruk değil; 60 sn önbellekli. | `ReportingService.cs:668-714` |
| Bekleyen İşler sayıları | Role/kullanıcıya göre filtrelenmiş, **yapılabilir** işler (örn. Lojistik → yalnız `Hazir`). | `pages/WorkInboxPage.tsx:70-155` |
| Kuyruk mantığı | Tamamen sayfa bileşeninin içinde; 8 ayrı `useQuery`, başka yerde yeniden kullanılamıyor. | `WorkInboxPage.tsx:50-159` |
| Açılış sayfası | Kullanıcı tercihi zaten var; `/inbox` seçilebiliyor ama varsayılan `/dashboard`. | `lib/preferences.ts:583`, `PreferencesPage.tsx:28` |
| Kılavuz | "Güne Bekleyen İşler ile başla" diyor — yani ürün niyeti zaten bu ekranın ilk durak olması. | `data/guide.ts:34` |

**Asıl sorun:** Kullanıcı girişte aynı şeyi soran iki farklı cevap görüyor. Ana Sayfa "Sevkiyat bekleyen: 14" (küresel, Hazır+Lojistik) derken Bekleyen İşler "Sevkiyat talebi açılacak: 5" (yalnız Hazır) diyor. Bu, iki ekranı da okumayı ve sayıları kafada uzlaştırmayı gerektiriyor — bilişsel yükün kaynağı bu.

---

## 2. Seçeneklerin değerlendirmesi

| # | Seçenek | Artı | Eksi | Karar |
|---|---|---|---|---|
| A | Açılış sayfasını herkes için `/inbox` yapmak | Sıfır yeni bileşen | Yönetici/Gözlemci/Muhasebe ciro ve grafikleri kaybeder; boş kuyruklu rollerde boş ekranla açılış. Tercih zaten var. | **Hayır** (tercih olarak kalsın) |
| B | Ana Sayfa'nın en üstüne kompakt **"Sıradaki işlerin"** paneli | Girişte tek bakışta "ne yapmalıyım"; mevcut sayfa yapısı korunur; KPI çakışması burada çözülür | Ana Sayfa'da 8 sorgu daha (Faz 2'de teke iner) | **Evet — çekirdek** |
| C | Üst çubukta zil/sayaç + açılır liste | Her ekranda görünür (Jakob: tanıdık bildirim deseni) | Üçüncü bir yüzey: aynı listeyi panel, sayfa ve açılır pencerede tekrar eder (Hick); açılır pencerede odak tuzağı / klavye karmaşıklığı | **Hayır** |
| D | Menüdeki "Bekleyen İşler" öğesine **toplam rozeti** | Her ekranda görünür, yeni yüzey eklemez, diğer menü rozetleriyle aynı desen | Toplamı hesaplamak için ya her sayfada 8 sorgu ya da backend özeti gerekir | **Evet — Faz 2** (backend özetiyle) |

**Öneri: B + D.** Yeni bir gezinme kavramı eklenmiyor; var olan iki desen (Ana Sayfa paneli, menü rozeti) güçlendiriliyor. C, aynı bilgiyi üçüncü kez gösterdiği için bilişsel yükü artırır.

---

## 3. Panel tasarımı (UX şartnamesi)

### 3.1 Yerleşim
Ana Sayfa'da hiyerarşi, "eylem → durum → analiz" sırasına çekilir:

```
┌ Ana Sayfa ─────────────────────────────────────────────────────┐
│ Hoş geldin, Burcu · 7 iş seni bekliyor                          │  ← PageHeader açıklaması tek cümle özet
├────────────────────────────────────────────────────────────────┤
│ Sıradaki işlerin                                    Tümünü gör → │  ← h2 + /inbox bağlantısı
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Cari onay bekleyen          [4]   en eski  6 gün ⚠        Aç → │ │  ← satırın tamamı tek hedef
│ │ Lojistik onayı bekleyen     [2]   en eski  1 gün          Aç → │ │
│ │ Kapanış bekleyen            [1]   en eski  4 gün ⚠        Aç → │ │
│ └──────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│ KPI kartları (panelle çakışanlar hariç)                         │
│ Ciro şeridi · Grafikler · Ekranlar                              │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 İçerik kuralları
- **Kuyruk başına bir satır**, kalem başına değil. Kalem listesi `/inbox`'ta kalır (aşamalı açıklama). Böylece en kalabalık kullanıcıda bile (elshan.rasulov, 11 kuyruk) satır sayısı sınırlı kalır.
- **Yalnız dolu kuyruklar** gösterilir. Boş kuyruklar gizlenir (gürültü yok).
- **En fazla 6 satır** (Miller). Fazlası için son satır: "+3 kuyruk daha → Bekleyen İşler".
- **Sıralama sabit** (iş akışı sırası, `/inbox` ile aynı). Yaşa göre yeniden sıralamak, her girişte satırların yer değiştirmesine ve uzamsal hafızanın bozulmasına yol açar. Gecikme, satırın yerini değiştirerek değil, yaş çipiyle vurgulanır.
- **Gecikme sinyali yalnız renkle verilmez:** `AgeChip` metni ("6 gün") + eşik aşılınca uyarı ikonu + `aria-label="en eski iş 6 gündür bekliyor, gecikmiş"`.
- **Satır tek hedef (Fitts):** tüm satır, o kuyruğun iş ekranına giden tek bir `<Link>`. Ekran, kuyruğu filtrelenmiş açar (örn. `/accounting/approval?view=cariQueue`). Satırda ikinci bir buton yok.
- **Başlık özeti:** `PageHeader` açıklaması "Hoş geldin, X · N iş seni bekliyor" olur; ayrı bir rozet/istatistik bandı eklenmez.

### 3.3 KPI çakışmasının giderilmesi
Panel bir kuyruğu gösteriyorsa, aynı işi anlatan küresel KPI kartı o kullanıcı için gizlenir. Böylece aynı soru için ekranda tek sayı kalır.

| KPI | Panel kuyruğu (görünürse KPI gizlenir) |
|---|---|
| `pendingQC` | `qc` |
| `inProduction` | `production` |
| `pendingShipment` | `shipment` |
| `pendingPurchase` | `finalApproval` veya `payment` |

`last30Orders`, `myOpenOrders`, `pendingPayment` ve ciro şeridi analitik olduğu için kalır.

### 3.4 Durumlar
| Durum | Davranış |
|---|---|
| Yükleniyor | Satır yüksekliğinde (44 px) iskelet satırlar; sayı `min(rolün kuyruk sayısı, 4)`. Panel yüksekliği önceden ayrıldığı için alttaki KPI'lar kaymaz. |
| Hepsi boş | Tek satır: ✓ "Sende bekleyen iş yok." (başarı tonu + ikon). Büyük boş durum çizimi yok; değerli alan harcanmaz. |
| Rolün hiç kuyruğu yok | Panel hiç çizilmez (örn. Gözlemci, Faz 2 kararından sonra). |
| Bir kuyruk hata verdi | O satır kalır: "Cari onay bekleyen — yüklenemedi · Tekrar dene". "İş yok" ile karıştırılmaz (mevcut `/inbox` kuralıyla aynı). Toplam özet "en az N iş" der. |
| Tazeleme | 60 sn `refetchInterval` + F5 (mevcut `invalidateQueries`). `/inbox` ile **aynı query key'leri** kullanıldığı için panelden sayfaya geçiş anlık açılır. |

### 3.5 Erişilebilirlik ve etkileşim
- `<section aria-labelledby>` + `<h2>`; satırlar `<ul>/<li>` içinde `<Link>`.
- Odak halkası: mevcut `focus-visible:ring-2 focus-visible:ring-ring` deseni.
- Hover yalnız `@media (hover: hover)` altında arka plan tonu; basılıyken anında `active` tonu.
- Satır yüksekliği ≥ 44 px (sıkı tablo yoğunluğu tercihinden bağımsız; panel bir tablo değil).
- Sayı rozeti `aria-label="4 iş"`; ekran okuyucu satırı "Cari onay bekleyen, 4 iş, en eski 6 gün" diye okur.
- Yeni renk yok: mevcut `warning-soft`, `success`, `muted` token'ları.
- Animasyon yok (yalnız 150 ms renk geçişi).

---

## 4. Uygulama planı

### Faz 1 — Frontend (backend değişikliği yok) · ~1 gün
1. **Kuyruk mantığını hook'a çıkar** — `src/hooks/useWorkQueues.ts`
   - `WorkInboxPage.tsx:50-159` içindeki yetki kontrolü, 8 `useQuery` ve `Queue[]` üretimi buraya taşınır.
   - Dönüş: `{ queues, total, anyLoading, refetchAll }`. Her `Queue`'ya `queuePath` (filtreli iş ekranı) ve `oldestSince` eklenir.
   - Query key'ler aynen korunur (`['quality-control','inbox']` vb.) → önbellek paylaşımı.
2. **`WorkInboxPage.tsx`'i hook'a bağla** — davranış değişmez; yalnız mantık taşınır.
3. **`src/components/WorkQueuePanel.tsx`** — §3'teki şartname: dolu kuyruklar, en fazla 6 satır, tüm durumlar.
4. **`DashboardPage.tsx`**
   - `PageHeader`'dan hemen sonra `<WorkQueuePanel />`.
   - `PageHeader` açıklamasına "· N iş seni bekliyor" (yüklenince; hata varsa "en az N").
   - §3.3 eşlemesiyle KPI listesini panelde görünen kuyruklara göre süz.
5. **i18n** — `tr.json` ve `en.json`'a `inbox.panel.{title,seeAll,more,oldest,empty,retry,summary}`.
6. **İçerik** — `data/guide.ts`'teki "Güne Bekleyen İşler ile başla" cümlesini panele göre güncelle; `data/changelog.ts`'e kayıt.
7. **Doğrulama** — her rol için (Temsilci, Fabrika, Lojistik, Muhasebe, burcu.karaman, elshan.rasulov, Gözlemci): panel satırları `/inbox` sayılarıyla birebir aynı mı, gizlenen KPI'lar doğru mu, boş/hata/yükleme durumları, klavyeyle gezinme.

### Faz 2 — Backend özeti + menü rozeti · ~1 gün
1. **`GET /api/inbox/summary`** → `[{ queueId, count, oldestSince }]`. Kullanıcıya göre sunucuda hesaplanır (rol + `burcu.karaman` / `elshan.rasulov` kullanıcı adı kuralları, `ReportingController.RevenueHidden` gibi tek yerde).
   - Tek SQL turu, 30–60 sn `IMemoryCache` (KPI'larla aynı desen).
2. **Panel bu uca geçer:** Ana Sayfa'da 8 istek tek isteğe iner. `/inbox` sayfası kalem listesi için mevcut sorgularını kullanmaya devam eder.
3. **Menü rozeti (D):** `useNavCounts` yanında `useInboxSummary` (60 sn, odak dönüşünde tazele, hata sessiz). `NavItem`'a `countField` yerine `countSource: 'inbox'` gibi bir genişleme; "Bekleyen İşler" öğesi toplamı gösterir.
4. **Ön/arka uç kural testi:** `CrmModern.Tests`'e her rol için beklenen kuyruk kümesi testi (frontend kurallarıyla aynı matris).

### Faz 3 — İsteğe bağlı
- Yeni kullanıcıların varsayılan açılış sayfası: Ana Sayfa kalır (panel artık işi gösterdiği için `/inbox`'a yönlendirmeye gerek yok).
- Menüdeki modül rozetlerinin (küresel sayılar) panel tanımlarıyla hizalanması — ayrı bir karar.

---

## 5. Kararınızı bekleyen konular
1. **Gözlemci kuyrukları:** Gözlemci `/factory`'yi gördüğü için bugün `/inbox`'ta "Üretime alınacak" ve "Üretimde" kuyruklarını *kendi işiymiş gibi* görüyor (`WorkInboxPage.tsx:94`). Yolda sevkiyatlarda Gözlemci zaten hariç tutuluyor. Öneri: salt-okunur roller için iş kuyruğu gösterilmesin → Gözlemci'de panel hiç çizilmez.
2. **KPI gizleme:** §3.3 eşlemesi, bazı rollerin Ana Sayfa'sından bilinen bir kartı kaldırır (örn. Lojistik'te "Sevkiyat bekleyen"). Alternatif: kart kalır ama başlığı "Tümü: sevkiyat bekleyen" olarak netleştirilir. Öneri: gizleme.
3. **Faz 2'nin zamanlaması:** Faz 1 tek başına yayınlanabilir; elshan.rasulov'un Ana Sayfa'sı dakikada 8 ek istek yapar (kabul edilebilir). Menü rozeti Faz 2'ye kadar gelmez.

## 6. Riskler
- **Sayı tutarsızlığı:** Panel ve `/inbox` aynı hook'tan beslendiği sürece tutarlı. Faz 2'de backend kuralları frontend'den saparsa tutarsızlık geri gelir → §4 Faz 2 madde 4'teki test bunu yakalar.
- **Yayın:** Sürüm numarası etiketlemeden önce `package.json`'da artırılmalı (mevcut yayın süreci).
