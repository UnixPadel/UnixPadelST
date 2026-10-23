import type { ChangelogEntry, ReleaseNote } from '@/types'

/**
 * Sürüm notları ("Neler Yeni").
 *
 * Her yayında (RELEASE.md) package.json `version` ile AYNI `versiyon` değeriyle
 * RELEASE_NOTES'un başına TR + EN bir kayıt eklenir. Uygulama sürümü derlemede
 * `__APP_VERSION__` olarak gelir; kullanıcı başına son görülen sürümden yeni
 * notlar girişte bir kez gösterilir (lib/releaseNotes.ts, UpdatesModal).
 * Kayıt unutulursa `scripts/check-release-notes.mjs` yayın sırasında uyarır.
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    versiyon: '0.3.6',
    tarih:    '2026-10-23',
    baslik: {
      tr: 'Arayüz ölçeği üst çubukta',
      en: 'Interface scale in the top bar',
    },
    maddeler: {
      tr: [
        'Masaüstü uygulamasında üst çubuğun sağında − ve + düğmeleriyle arayüzü küçültüp büyütebilirsin; aradaki yüzde güncel ölçeği gösterir.',
        'Yüzdeye tıklayınca ölçek otomatiğe (ekrana göre) döner; Ctrl+ / Ctrl- / Ctrl+0 ve Tercihlerim’deki ayar aynı şekilde çalışmaya devam ediyor.',
      ],
      en: [
        'In the desktop app, use the − and + buttons on the right of the top bar to make the interface smaller or larger; the percentage between them shows the current scale.',
        'Click the percentage to return to automatic scale (fits screen); Ctrl+ / Ctrl- / Ctrl+0 and the setting in Preferences keep working as before.',
      ],
    },
  },
  {
    versiyon: '0.3.5',
    tarih:    '2026-10-23',
    baslik: {
      tr: 'Alanlar daha kolay ayırt ediliyor',
      en: 'Fields are easier to tell apart',
    },
    maddeler: {
      tr: [
        'Sayfa zemini açık gri, bölümler beyaz kartlarda; Yeni Sipariş / Teklif’te Müşteri, setler, Teslimat ve Montaj ile Cari Bilgiler birbirinden net ayrılıyor.',
        'Alan çerçeveleri koyulaştı, etiketler daha okunur; üzerine gelince çerçeve belirginleşiyor, yazdığın alan açık maviyle vurgulanıyor.',
        'Kullanılamayan alanlar gri zeminli ve kesik çizgili; boş bir alanla karışmıyor.',
        'Açık olan set sekmesinin altı çizili; işaretli parçalar ve şartlar renkli satırla gösteriliyor, parça ve ek kalem tablolarında satırlar dönüşümlü renkli.',
        'Aynı görünüm tüm ekranlardaki formlara, filtrelere ve sekmelere de uygulandı; yazılar ve iş akışı değişmedi.',
      ],
      en: [
        'The page background is light grey and sections sit on white cards; in New Order / Quote, Customer, the sets, Delivery and Installation and Account Details are clearly separated.',
        'Field borders are darker and labels easier to read; borders get stronger on hover and the field you are typing in is highlighted in light blue.',
        'Unavailable fields have a grey background and a dashed border, so they no longer look like empty fields.',
        'The open set tab is underlined; checked parts and terms are shown on a tinted row, and rows alternate in colour in the parts and extra item tables.',
        'The same look applies to forms, filters and tabs on every screen; wording and workflows are unchanged.',
      ],
    },
  },
  {
    versiyon: '0.3.4',
    tarih:    '2026-10-23',
    baslik: {
      tr: 'Fabrika, Lojistik ve Muhasebe: "Siparişi Aç"',
      en: 'Factory, Logistics and Accounting: "Open Order"',
    },
    maddeler: {
      tr: [
        'Fabrika / Üretim, Sevkiyata Hazır, Sevkiyat Geçmişi ve Teklif ve Siparişler ekranlarında sağdaki detay paneli kaldırıldı; liste tam genişlikte.',
        'Her satırda işlem butonlarının solunda "Siparişi Aç" var; Sipariş Detayı penceresini açar.',
        'Satıra tıklayarak veya Enter ile de siparişi açabilirsin.',
      ],
      en: [
        'On Factory / Production, Ready to Ship, Shipment History and Quotes & Orders, the side detail panel is gone and the list uses the full width.',
        'Each row has an "Open Order" button to the left of its actions; it opens the Order Detail window.',
        'You can also open an order by clicking its row or pressing Enter.',
      ],
    },
  },
  {
    versiyon: '0.3.3',
    tarih:    '2026-10-23',
    baslik: {
      tr: 'Sipariş detayı tek sayfada',
      en: 'Order details on one page',
    },
    maddeler: {
      tr: [
        'Sipariş Detayı’nda Genel, Kalemler ve Sipariş Geçmişi artık alt alta, tek sayfada; üstteki butona tıklayınca ilgili bölüme kayar.',
        'Durum etiketleri ve Excel/PDF butonları pencerenin üstünde sabit kalıyor, artık yarım görünmüyor.',
        'Pencere sabit boyutta açılıyor, arayüz ölçeğiyle birlikte büyüyüp küçülüyor; sağdaki kaydırma çubuğuyla gezinebilirsin.',
        'Muhasebe, Fabrika ve Lojistik ekranlarındaki yan detay paneli de aynı düzende.',
      ],
      en: [
        'In Order Detail, General, Items and Order History are now on one page, one below the other; the buttons at the top scroll to each section.',
        'Status labels and the Excel/PDF buttons stay fixed at the top of the window and are no longer cut off.',
        'The window opens at a fixed size and follows the interface scale; use the scrollbar on the right to move through it.',
        'The side detail panel on the Accounting, Factory and Logistics screens uses the same layout.',
      ],
    },
  },
  {
    versiyon: '0.3.2',
    tarih:    '2026-10-23',
    baslik: {
      tr: 'Siparişlerim: sipariş detayı pencerede açılıyor',
      en: 'My Orders: order details open in a window',
    },
    maddeler: {
      tr: [
        'Siparişlerim’de "Siparişi Aç" artık Sipariş Detayı penceresini doğrudan açıyor; sağdaki detay paneli kaldırıldı, liste tam genişlikte.',
        'Satıra çift tıklayarak veya Enter ile de siparişi açabilirsin.',
      ],
      en: [
        'In My Orders, "Open Order" now opens the Order Detail window directly; the side panel is gone and the list uses the full width.',
        'You can also open an order by double-clicking its row or pressing Enter.',
      ],
    },
  },
  {
    // Hazır bekleyen not: package.json 0.3.1'e geçince gösterilir (≤ güncel sürüm kuralı).
    versiyon: '0.3.1',
    tarih:    '2026-10-23',
    baslik: {
      tr: 'Tablolar ekrana sığıyor, metinler sadeleşti',
      en: 'Tables fit the screen, simpler wording',
    },
    maddeler: {
      tr: [
        'Listeler ekranı dolduruyor: sayfa kaymıyor, tablo başlığı ve araç çubuğu yerinde kalıyor; Sipariş Kontrolü’nde 2–3 yerine 8–15 satır görünüyor.',
        'Üstteki panel sürüklenip katlanabiliyor (F7) ve yeri hatırlanıyor; filtreler tek satıra sığıyor.',
        'Masaüstü uygulamasında arayüz ölçeği: ekrana göre otomatik, Ctrl+ / Ctrl- / Ctrl+0 ve Tercihlerim’den ayarlanabilir; pencere boyutu hatırlanıyor.',
        'Toplamlar her döviz için ayrı satırda; İşlem kolonu sağda, Sipariş No solda sabit; uzun müşteri adları kısaltılıyor.',
        'Pencerelerde Kaydet/Onayla butonları kısa ekranda da görünüyor.',
        'Metinler sadeleşti: "Belge Akışı" artık "Sipariş Geçmişi", "Kalite Kontrol" artık "Sipariş Kontrolü"; Kapora/Kaparo yerine her yerde "Peşinat".',
        'Hata mesajlarında teknik kodlar (correlationId) artık görünmüyor.',
      ],
      en: [
        'Lists fill the screen: the page no longer scrolls, and the table header and toolbar stay in place; Order Review shows 8–15 rows instead of 2–3.',
        'The top panel can be dragged and collapsed (F7) and remembers its size; filters fit on one line.',
        'Interface scale in the desktop app: automatic by screen, adjustable with Ctrl+ / Ctrl- / Ctrl+0 and in Preferences; the window size is remembered.',
        'Totals are shown per currency on separate lines; the Actions column stays on the right and Order No on the left; long customer names are shortened.',
        'Save/Approve buttons in dialogs stay visible on short screens.',
        'Simpler wording: "Document Flow" is now "Order History", "Quality Control" is now "Order Review"; "Down payment" is used everywhere.',
        'Error messages no longer show technical codes (correlationId).',
      ],
    },
  },
  {
    versiyon: '0.3.0',
    tarih:    '2026-10-22',
    baslik: {
      tr: 'Arayüz yenilendi: daha hızlı giriş, daha az hata, iç denetim',
      en: 'Redesigned interface: faster entry, fewer errors, internal control',
    },
    maddeler: {
      tr: [
        'Hatalar düzeltildi: “1.234,56” gibi tutarlar artık doğru kaydediliyor, tarih/saat yerel saatle geliyor, boş sipariş kaydedilemiyor.',
        'Yeni sipariş formu: sağda canlı toplam ve eksik listesi, otomatik taslak, kaydetmeden ayrılma uyarısı; Ctrl+S önce özeti gösterir, sonra kaydeder.',
        'Listeler: detay listenin yanında açılır; kolon seçimi, kayıtlı görünümler, sağ tık menüsü, toplu işlem, Excel’e aktarma ve döviz bazında toplam.',
        'Klavye: Ctrl+K Hızlı Erişim (YS, KK, FB, SP <no>…), Enter ile sonraki alan, F4 ile liste, F1 ile kısayollar.',
        'Bekleyen İşler: sana düşen tüm işler tek ekranda, kaç gündür beklediğiyle.',
        'Yeni ekranlar: Sipariş Geçmişi (siparişin tüm adımları), Cari Hesap Ekstresi, Tercihlerim.',
        'Her departman ekranında “Önceki adımda bekleyenler”: siparişin neden henüz sana gelmediği yazar (ör. “Muhasebenin lojistik onayı bekleniyor (2. peşinat)”).',
        'Sıra korunur: muhasebenin lojistik onayı olmadan sevkiyat açılmaz; yalnız Planlama’daki sipariş üretime alınır.',
        'Durum renkleri her ekranda aynı: yeşil tamam, sarı bekliyor, mavi süreçte, mor üretimde, kırmızı red/iptal.',
        'Üst çubukta Kılavuz butonu (Shift+F1): bulunduğun ekranın kısa anlatımı.',
      ],
      en: [
        'Fixes: amounts like “1.234,56” are now saved correctly, dates/times use local time, empty orders cannot be saved.',
        'New order form: live total and missing-fields list on the right, automatic draft, leave-without-saving warning; Ctrl+S shows the summary, then saves.',
        'Lists: details open beside the list; column chooser, saved views, right-click menu, bulk actions, Excel export and per-currency totals.',
        'Keyboard: Ctrl+K Quick Open (YS, KK, FB, SP <no>…), Enter moves to the next field, F4 opens lists, F1 shows shortcuts.',
        'Pending Tasks: all work waiting for your role on one screen, with how many days it has waited.',
        'New screens: Order History (every step of an order), Account Statement, Preferences.',
        'Each department screen shows “Waiting at the previous step”: why an order hasn’t reached you yet (e.g. “Waiting for accounting’s logistics approval (2nd down payment)”).',
        'Steps can’t be skipped: no shipment without accounting’s logistics approval, and only orders in Planning can start production.',
        'Status colours are the same everywhere: green done, yellow waiting, blue in progress, purple in production, red rejected/cancelled.',
        'Guide button in the top bar (Shift+F1): a short how-to for the screen you are on.',
      ],
    },
  },
  {
    versiyon: '0.2.47',
    tarih:    '2026-10-21',
    baslik: { tr: 'Onay ekranında kuyruk dışı siparişe peşinat', en: 'Down payment for out-of-queue orders on the approval screen' },
    maddeler: {
      tr: ['Muhasebe Onay ekranında kuyrukta olmayan (Tamamlandı) siparişe de peşinat girilebiliyor.'],
      en: ['On the Accounting Approval screen a down payment can also be entered for orders outside the queues (Completed).'],
    },
  },
  {
    versiyon: '0.2.46',
    tarih:    '2026-10-21',
    baslik: { tr: 'Tahsilat iptali ve fazla tahsilat uyarısı', en: 'Payment cancellation and overpayment warning' },
    maddeler: {
      tr: ['Tahsilat satırı kırmızı X ile iptal edilebiliyor.', 'Sipariş tutarını aşan tahsilatta uyarı gösteriliyor.'],
      en: ['A payment row can be cancelled with the red X.', 'A warning is shown when a payment exceeds the order total.'],
    },
  },
  {
    versiyon: '0.2.45',
    tarih:    '2026-10-20',
    baslik: { tr: 'Talep Detayları’nda Muhasebe Geçmişi', en: 'Accounting History in Request Details' },
    maddeler: {
      tr: ['Talep Detayları’nda siparişin tahsilat bakiyeleri (Muhasebe Geçmişi) görünüyor.'],
      en: ['Request Details now show the order’s payment balances (Accounting History).'],
    },
  },
  {
    versiyon: '0.2.44',
    tarih:    '2026-10-19',
    baslik: { tr: 'Excel reçeteleri ve kur çevirici', en: 'Excel recipes and currency converter' },
    maddeler: {
      tr: ['4 kort tipi için Excel reçeteleri eklendi.', 'Cari Bilgi’ye kur çevirici eklendi.'],
      en: ['Excel recipes added for 4 court types.', 'Currency converter added to Account Info.'],
    },
  },
  {
    versiyon: '0.2.43',
    tarih:    '2026-10-07',
    baslik: { tr: 'Panoramic Padel Court çelik profil fiyatları', en: 'Panoramic Padel Court steel profile prices' },
    maddeler: {
      tr: ['Panoramic Padel Court çelik profil fiyatları Excel R02 listesine göre güncellendi.'],
      en: ['Panoramic Padel Court steel profile prices updated from the Excel R02 list.'],
    },
  },
]

/**
 * Faz 7 öncesi geliştirme fazları (eski "2.x = Faz x" numaralandırması; yayın
 * sürümleriyle ilgisi yok). Yalnız geçmiş sayfasında gösterilir.
 * WinForms karşılığı: `Yenilik.cs` (sabit metin).
 */
export const LEGACY_CHANGELOG: ChangelogEntry[] = [
  {
    versiyon: '2.7.0',
    tarih:    '2026-05-18',
    baslik:   'Faz 7 — Dashboard, Global Arama ve Yenilik',
    maddeler: [
      'Ana panele KPI kartları ve rol bazlı widget\'lar eklendi (son 30 gün sipariş/ciro, bekleyen kontrol, üretim, sevkiyat, ödeme, satın alma).',
      'Recharts ile 3 yeni grafik: aylık sipariş trendi, aşama dağılımı, top müşteri (Yönetici/Muhasebe).',
      'Topbar\'a global arama eklendi (Ctrl/Cmd+K). Sipariş, Müşteri, Bileşen, Kategori, Kullanıcı ve Satın Alma Talep kategorilerinde tek input ile arama.',
      '"Neler Yeni" modalı ilk login sonrası bir kez gösteriliyor; geçmiş tüm sürümlere "Neler Yeni" sayfasından erişilebilir.',
    ],
  },
  {
    versiyon: '2.6.0',
    tarih:    '2026-05-10',
    baslik:   'Faz 6 — 3 aşamalı Satın Alma onayı',
    maddeler: [
      'Satın alma talepleri: ön onay (omur.caliskan) → muhasebe ödeme detayı → nihai onay (elshan.rasulov) akışı.',
      'Tüm talepler ekranı + departman bazlı filtreler.',
      'Muhasebe tipi taleplerde 17 ödeme/önizleme alanı.',
    ],
  },
  {
    versiyon: '2.5.0',
    tarih:    '2026-05-01',
    baslik:   'Faz 5 — Muhasebe modülü',
    maddeler: [
      'Sipariş ödeme takibi, ek dosya yükleme, kalan bakiye hesaplama.',
      'Muhasebe Excel özet dışa aktarma.',
      'Müşteri bakiye sayfası.',
    ],
  },
  {
    versiyon: '2.4.0',
    tarih:    '2026-04-20',
    baslik:   'Faz 4 — Lojistik modülü',
    maddeler: [
      'Hazır siparişleri lojistik aşamasına alma, sevkiyat planı oluşturma.',
      'Lojistik geçmişi + nakliyeci yönetimi.',
    ],
  },
  {
    versiyon: '2.3.0',
    tarih:    '2026-04-10',
    baslik:   'Faz 3 — Fabrika ve sipariş yaşam döngüsü',
    maddeler: [
      'Sipariş aşama yönetimi: Teklif → Sipariş → Üretim → Hazır → Lojistik → Tamamlandı.',
      'Stok hareketleri ve maliyet takibi.',
    ],
  },
  {
    versiyon: '2.2.0',
    tarih:    '2026-04-01',
    baslik:   'Faz 2 — Kalite Kontrol',
    maddeler: [
      'Yönetici kontrol akışı: Onay / Reddet.',
      'Kontrol notu ve red sebebi alanları.',
    ],
  },
  {
    versiyon: '2.1.0',
    tarih:    '2026-03-15',
    baslik:   'Faz 1 — Sipariş + Müşteri + Ürün Kataloğu + Kullanıcı',
    maddeler: [
      'Teklif/Sipariş oluşturma formu, müşteri yönetimi.',
      'Kategori + bileşen + öznitelik tabanlı reçete.',
      'Rol bazlı kullanıcı yönetimi (6 rol).',
    ],
  },
  {
    versiyon: '2.0.0',
    tarih:    '2026-03-01',
    baslik:   'Faz 0 — Modern .NET 8 + React migration başlangıcı',
    maddeler: [
      'WinForms uygulamasından .NET 8 Web API + React/Vite/Tailwind frontend\'e geçiş.',
      'JWT tabanlı kimlik doğrulama, EF Core/Pomelo MySQL, Recharts.',
    ],
  },
]
