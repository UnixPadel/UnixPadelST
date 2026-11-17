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
    versiyon: '1.1.1',
    tarih:    '2026-11-17',
    baslik: {
      tr: '“Tahsilatı sil” ve sığan Tahsilat Geçmişi',
      en: '“Delete payment” and a Payment History that fits',
    },
    maddeler: {
      tr: [
        'Tahsilat satırlarındaki “Tahsilatı iptal et” artık “Tahsilatı sil”: çöp kutusu simgeli küçük bir buton. Tahsilat Geçmişi, Muhasebe · Tahsilat ve Onaylar panelleri ile muhasebe satır detayında aynı. Silinen tahsilat toplamlardan ve kalan bakiyeden düşer; listede üstü çizili ve “Silindi” etiketiyle kalır.',
        'Tahsilat Geçmişi tablosu yana kaymadan sığıyor: peşinat tutarı, tarihi ve “Tahsilatı sil” alt alta ve sağa yaslı. Sipariş no ve satış temsilcisi alt satıra kırılmıyor; uzun müşteri adları iki satırda kısalır, tamamı fareyle üzerine gelince görünür.',
      ],
      en: [
        '“Cancel payment” on payment rows is now “Delete payment”: a small button with a bin icon, the same on Payment History, the Accounting · Payments and Approvals panels and the accounting row detail. A deleted payment comes off the totals and the remaining balance; it stays in the list struck through and labelled “Deleted”.',
        'Payment History fits without sideways scrolling: the down payment amount, its date and “Delete payment” stack right-aligned. Order no and sales rep no longer wrap; long customer names are cut to two lines and the full name shows on hover.',
      ],
    },
  },
  {
    versiyon: '1.1.0',
    tarih:    '2026-11-17',
    baslik: {
      tr: 'Daha rahat okunan ekranlar, geri alınabilen silmeler ve Muhasebe Klasörü',
      en: 'Easier-to-read screens, undoable deletes and the Accounting Folder',
    },
    maddeler: {
      tr: [
        'Yazılar ve butonlar büyüdü. Üst çubuktaki “Görünüm: Rahat | Standart” ile seçersin: Rahat (varsayılan) büyük yazı ve geniş satır, Standart daha çok satır gösterir. Uygulama küçük ekranlarda artık kendiliğinden küçülmez; Ctrl+0 her zaman %100’e döner.',
        'Renkler daha koyu ve okunur; soluk gri yazılar kalktı.',
        'Listede bir satıra tıklayınca o kayıtla yapabileceğin tüm işlemler tablonun üstünde yazılı butonlar olarak görünür. Simge butonlarının yanına adları yazıldı.',
        'Fabrika, Lojistik, Siparişlerim ve Muhasebe Klasörler ekranlarında liste solda, seçili sipariş sağdaki panelde açık durur. Satırlardaki butonlar kalktı: o siparişte yapılacak iş (Üretime Al, Hazır olarak işaretle, Sevkiyat Oluştur, Siparişe Çevir…) panelin altında tek buton.',
        'Onay pencereleri butona basmadan önce “Ne olacak?” ve “Sonraki adım” bilgisini gösterir. Sipariş Kontrolü’nde Onayla da artık bu pencereden geçer.',
        'Sipariş Kontrolü sadeleşti: üstte üç sekme (Kontrol bekleyen, Onaylanan, Tüm siparişlerde ara), solda liste, sağda siparişin kendisi ve altında Onayla / Reddet. Revize Et ve ödenen tutarı güncelleme “Diğer işlemler” menüsünde.',
        'Yeni siparişte “Teklif/Sipariş olarak kaydet…” önce özeti açar; kayıt o pencerede yapılır. Başlıkta taslağın ne zaman kaydedildiği yazar.',
        'Sildiğin sipariş, klasör dosyası, kullanıcı, stok kalemi, müşteri ve ek maliyet hemen ardından “Geri al” ile geri alınabilir.',
        '“Kaydedildi” mesajları köşede açılmaz; alttaki durum çubuğunda yeşil yanar. Hata mesajları sen kapatana kadar kalır.',
        'Muhasebe · Onaylar sadeleşti: üstte üç iş sırası (Cari onay, Lojistik onayı, Kapanış), solda liste, sağda karar paneli. Panelde ödeme özeti, tahsilatlar, peşinat alanı ve tek bir onay butonu var; proforma ve Satıcı Ek Muhasebe Klasörü’nün içinde.',
        'Tahsilat ekranı sadeleşti: üstteki altı sekmeli panel ve ayrı Tahsilat penceresi kalktı. Solda liste, sağda tahsilat paneli: ödeme özeti, tahsilatlar, altında tutar alanı ve “Tahsilatı kaydet”. Maliyet ve Ek Maliyet panelde kapalı gelen bölümler.',
        'Sipariş detayının başlığındaki beş buton sadeleşti: “Muhasebe Klasörü” görünür kaldı; proforma indirme, kopyalama ve Siparişi Tamamla “Diğer işlemler” menüsünde. Siparişlerim’de red sebebi ayrı pencere yerine panelin altında görünür.',
        'Kullanıcılar ekranında satırda yalnız “Düzenle” görünür; Şifre Değiştir ve Sil “Diğer işlemler” menüsünde.',
        'Küçük ekranlarda sağ paneldeki sipariş içeriği yaklaşık iki kat uzadı: üst çubuk tek satır, Sipariş Kontrolü ve Muhasebe Onaylar’da sekmeler başlığın yanında, durum rozetleri panel başlığında, onay notu “Onay notu ekle” ile açılır.',
        'Sağ panelli diğer ekranlarda da (Fabrika, Lojistik, Siparişlerim, Muhasebe Tahsilat / Klasörler / Onaylar) panel artık sayfa başlığının hemen altından başlar: filtreler ve arama listenin üstüne taşındı, sayfa açıklaması başlığın yanında, panelin alt bölümü tek satıra indi (sevkiyat iptali “Diğer işlemler”de).',
        'Filtre çubukları tek satıra indi: en çok kullanılan iki alan açık durur, kalanlar “Diğer filtreler” ile açılır. Listelerde az sütun açık gelir; diğerlerini “Kolonlar”dan açarsın.',
        'Muhasebe Onay’daki “Siparişi Tamamla” butonu çalışmıyordu, düzeltildi; artık panel başlığındaki “Diğer işlemler” menüsünde. Arama sonuçları artık açılabiliyor.',
        'Her siparişin bir Muhasebe Klasörü var: proforma (Excel/PDF), muhasebe ekleri ve Satıcı Ek tek pencerede. Sipariş detayının başlığındaki “Muhasebe Klasörü” düğmesinden açılır; düğmedeki sayı ek sayısıdır.',
        'Bir siparişe artık birden çok muhasebe eki eklenebilir; yeni dosya öncekinin yerini almaz. Dosyalar adı ve türüyle saklanır, PDF ve görseller uygulama içinde görüntülenir.',
        '“Muhasebe · Teklif ve Siparişler” ekranının adı “Muhasebe · Klasörler” oldu: Klasör sütunu, seçili sipariş için “Dosya ekle” ve “Dosyası olmayan” filtresi eklendi.',
        'Tahsilat, Muhasebe Onay ve Kontrol ekranlarındaki “Muhasebe Ek” düğmeleri aynı klasörü açar.',
      ],
      en: [
        'Text and buttons are larger. Choose with “View: Comfortable | Standard” in the top bar: Comfortable (default) shows larger text and taller rows, Standard fits more rows. The app no longer shrinks itself on small screens; Ctrl+0 always returns to 100%.',
        'Colours are darker and easier to read; faint grey text is gone.',
        'Clicking a row in a list shows every action for that record as labelled buttons above the table. Icon buttons now show their names.',
        'On Factory, Logistics, My Orders and Accounting Folders the list is on the left and the selected order stays open in a panel on the right. The buttons on each row are gone: the one thing to do with that order (Start Production, Mark as ready, Create Shipment, Turn into Order…) is a single button at the bottom of the panel.',
        'Confirmation windows show “What happens next?” and the “Next step” before you press the button. In Order Review, Approve now goes through this window too.',
        'Order Review is simpler: three tabs at the top (Waiting for review, Approved, Search all orders), the list on the left, the order itself on the right with Approve / Reject below it. Revise and updating the paid amount are in the “More actions” menu.',
        'In New Order, “Save as quote/order…” opens the summary first; you save from that window. The header shows when the draft was last saved.',
        'A deleted order, folder file, user, stock item, customer or extra cost can be taken back right away with “Undo”.',
        '“Saved” messages no longer pop up in a corner; they light up in the status bar at the bottom. Error messages stay until you close them.',
        'Accounting · Approvals is simpler: three work queues at the top (Account approval, Logistics approval, Closing), the list on the left and a decision panel on the right. The panel has the payment summary, payments, the down payment field and a single approve button; the proforma and the Seller File are inside the Accounting Folder.',
        'Payments is simpler: the six-tab panel at the top and the separate Payment window are gone. The list is on the left and a payment panel on the right: payment summary, payments, then the amount field and “Save payment” at the bottom. Cost and Extra Cost are sections in the panel that start closed.',
        'The five buttons in the order detail header are simpler: “Accounting Folder” stays visible; proforma downloads, copy and Complete Order are in the “More actions” menu. On My Orders the rejection reason shows at the bottom of the panel instead of a separate window.',
        'On Users each row shows only “Edit”; Change Password and Delete are in the “More actions” menu.',
        'On small screens the order content in the right panel is about twice as tall: the top bar is one row, Order Review and Accounting Approvals show their tabs next to the title, status badges sit in the panel header, and the approval note opens with “Add approval note”.',
        'The other screens with a right panel (Factory, Logistics, My Orders, Accounting Collections / Folders / Approvals) now start the panel right under the page title: filters and search sit above the list, the page description is next to the title, and the panel footer is down to one row (cancelling a shipment is under “More actions”).',
        'Filter bars are down to one row: the two most-used fields stay open and the rest open with “More filters”. Lists start with fewer columns; turn on the others from “Columns”.',
        'The “Complete Order” button on Accounting Approvals did nothing; fixed, and it now lives in the “More actions” menu in the panel header. Search results can now be opened.',
        'Every order has an Accounting Folder: proforma (Excel/PDF), accounting files and the Seller File in one window. Open it from the “Accounting Folder” button in the order header; the number on the button is the file count.',
        'An order can now hold several accounting files; a new file never replaces an earlier one. Files keep their name and type, and PDFs and images open inside the app.',
        '“Accounting · Quotes & Orders” is now “Accounting · Folders”, with a Folder column, “Add file” for the selected order and a “No files” filter.',
        'The “Accounting File” buttons on Payments, Accounting Approvals and Quality Control open the same folder.',
      ],
    },
  },
  {
    versiyon: '1.0.0',
    tarih:    '2026-11-17',
    baslik: {
      tr: 'Tahsilat ekranı daha hızlı açılıyor',
      en: 'The Payments screen opens faster',
    },
    maddeler: {
      tr: [
        'Muhasebe · Tahsilat listesi sipariş sayısı arttıkça yavaşlamıyor: muhasebe bilgileri her sipariş için ayrı ayrı değil, tek seferde okunuyor.',
        'Muhasebe Excel dışa aktarımı da aynı şekilde hızlandı.',
        'Bütün ekranlar sunucudan biraz daha hızlı yanıt alıyor.',
      ],
      en: [
        'The Accounting · Payments list no longer slows down as orders pile up: accounting details are read in one go instead of one order at a time.',
        'The accounting Excel export is faster in the same way.',
        'Every screen gets its answers from the server a little faster.',
      ],
    },
  },
  {
    versiyon: '0.3.10',
    tarih:    '2026-11-13',
    baslik: {
      tr: 'Ana Sayfa’da sıradaki işlerin',
      en: 'Your next tasks on Home',
    },
    maddeler: {
      tr: [
        'Ana Sayfa’nın en üstünde “Sıradaki işlerin”: sana düşen kuyruklar, kaç iş olduğu ve en eskisinin kaç gündür beklediği. Satıra tıklayınca o işin ekranı açılır; uyarı işareti gecikmiş işi gösterir.',
        'Menüdeki “Bekleyen İşler” artık toplam iş sayını gösteriyor. Panelde zaten görünen işlerin ayrı sayı kartları Ana Sayfa’dan kaldırıldı; aynı soruya tek sayı kalıyor.',
      ],
      en: [
        '“Your next tasks” at the top of Home: your queues, how many items each has and how long the oldest has waited. Click a row to open that screen; the warning sign marks overdue work.',
        '“Pending Tasks” in the menu now shows your total. Count cards that repeated what the panel already shows were removed from Home, so each question has one number.',
      ],
    },
  },
  {
    versiyon: '0.3.9',
    tarih:    '2026-11-11',
    baslik: {
      tr: 'Lojistik: Antrepo ve Depo Stokları & Gemini Beyanname Entegrasyonu',
      en: 'Logistics: Bonded & Warehouse Stock & Gemini Declaration Integration',
    },
    maddeler: {
      tr: [
        'Lojistik menüsüne "Antrepo & Depo Stokları" sekmesi eklendi. Antrepoda veya depoda bekleyen mallar tek bir listede sade ve düşük bilişsel yükle takip edilebilir.',
        'Gümrük beyannameleri (PDF, tarama veya fotoğraf) Gemini yapay zekâ entegrasyonu ile otomatik taranarak kalemler, tamamlayıcı ölçü birimleri ve kap bilgileri doğrudan plana eklenir.',
        'Her mal için tek tıkla "Tamamı çıktı" veya "Bir kısmı çıktı" seçeneğiyle araca yükleme işareti konulabilir; çıkan miktar anında stoktan düşer.',
        'Yanlış girilen çıkış işlemleri işlemi yapan kullanıcı veya Yönetici tarafından 30 gün içinde doğrudan geri alınabilir.',
        'Yönetici için "Sistem Ayarları" ekranı eklendi; Gemini API anahtarı merkezi olarak şifreli yönetilir ve tüm bilgisayarlarda anında aktifleşir.',
      ],
      en: [
        'Added "Bonded & Warehouse Stock" tab under the Logistics menu for low-cognitive-load tracking of warehouse and bonded stock in a unified view.',
        'Automatic extraction of customs declarations (PDF, scan, or photo) via Gemini AI integration, auto-populating items, supplementary units, and packages.',
        'Single-click exit logging with "All loaded" or "Partial loaded" options, immediately deducting quantities from stock.',
        'Undo capability for exit operations within 30 days by the author or managers.',
        'Added System Settings screen for administrators to manage the Gemini API key securely and centrally across all client computers.',
      ],
    },
  },
  {
    versiyon: '0.3.8',
    tarih:    '2026-11-05',
    baslik: {
      tr: 'Yetkili kullanıcılar için sipariş doğrudan tamamlama',
      en: 'Direct order completion for authorized users',
    },
    maddeler: {
      tr: [
        'Burcu, Elshan ve Admin kullanıcıları için Sipariş ve sonraki aşamalardaki siparişleri doğrudan Tamamlandı statüsüne alma yetkisi eklendi.',
        'Kritik işlem göstergesi olarak Siparişi Tamamla butonu kırmızı ve keskin köşeli yapıldı; doğrudan kapatma uyarıları ve sipariş detay bildirimleri güncellendi.',
      ],
      en: [
        'Added direct completion permission for Burcu, Elshan, and Admin users from Order and subsequent stages.',
        'Updated Complete Order action to red with sharp corners to reflect critical operation; updated direct completion warning and order summary notifications.',
      ],
    },
  },
  {
    versiyon: '0.3.7',
    tarih:    '2026-11-04',
    baslik: {
      tr: 'Sipariş detayları ve ürün bazlı şartlar',
      en: 'Order details and product-specific terms',
    },
    maddeler: {
      tr: [
        'Sipariş detayında Detaylar ve Ek Notlar açılır/kapanır alanda Sipariş Geçmişi üzerine taşındı; Full Panoramic Court detayları eklendi.',
      ],
      en: [
        'Details and Additional Notes moved above Order History in a collapsible section; Full Panoramic Court details added.',
      ],
    },
  },
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
