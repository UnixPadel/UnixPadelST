import type { Localized } from '@/types'

/**
 * Kullanım Kılavuzu içeriği (TR + EN). GuideDialog bulunulan ekranın bölümünü
 * `routes` önek eşleşmesiyle (en uzun) seçer; `access` verilen bölümler yalnız
 * o ekranlardan en az birine erişimi olan kullanıcıya gösterilir (menü kuralı).
 * `special`: içerik koddan üretilir (kısayol tablosu, güncel sürüm notu).
 * Terimler docs/ux-copy/00-sozluk.md ile aynı olmalı (ör. Sipariş Geçmişi, Peşinat).
 */
export interface GuideSection {
  id: string
  title: Localized
  routes?: string[]
  access?: string[]
  navPath?: string
  intro: Localized
  steps?: Localized[]
  tips?: Localized[]
  special?: 'shortcuts' | 'whatsNew'
}

const L = (tr: string, en: string): Localized => ({ tr, en })

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'start',
    title: L('Başlarken', 'Getting started'),
    routes: ['/dashboard', '/inbox', '/search', '/preferences'],
    intro: L(
      'Sol menü bölümlere ayrılır (Satış, Operasyon, Lojistik, Muhasebe, Satın Alma, Yönetim). Yalnız rolünün açabildiği ekranları görürsün. Menüdeki sayılar o ekranda bekleyen iş sayısıdır.',
      'The left menu is grouped (Sales, Operations, Logistics, Accounting, Purchasing, Admin). You only see the screens your role can open. The numbers show how much work is waiting on each screen.',
    ),
    steps: [
      L('Ana Sayfa’nın en üstündeki “Sıradaki işlerin” sana düşen kuyrukları, kaç iş olduğunu ve en eskisinin kaç gündür beklediğini gösterir. Satıra tıklayınca o işin ekranı açılır; uyarı işareti gecikmiş işi gösterir.',
        '“Your next tasks” at the top of Home lists your queues, how many items each has and how long the oldest has waited. Click a row to open that screen; the warning sign marks overdue work.'),
      L('Tek tek kayıtlar için “Bekleyen İşler”e geç (menüdeki sayı toplam iş sayısıdır). “Aç” ilgili ekranı o kayıt seçili açar.',
        'For individual records, go to “Pending Tasks” (the number in the menu is your total). “Open” takes you to the screen with that record selected.'),
      L('Ctrl+K ile Hızlı Erişim’i aç: ekran kodu (YS Yeni Sipariş, KK Sipariş Kontrolü, FB Fabrika, LH Lojistik, TH Tahsilat, BI Bekleyen İşler, KL Kılavuz) ya da “SP <sipariş no>” yaz, Enter’a bas.',
        'Press Ctrl+K for Quick Open: type a screen code (YS New Order, KK Order Review, FB Factory, LH Logistics, TH Payments, BI Pending Tasks, KL Guide) or “SP <order no>” and press Enter.'),
      L('Tercihlerim’de varsayılan şirketi, dövizi, peşinat yüzdesini, görünümü ve açılış sayfasını seç. Yeni formlar bu değerlerle açılır.',
        'In Preferences, choose your default company, currency, down payment %, view and start page. New forms open with these values.'),
      L('Üst çubuktaki “Görünüm: Rahat | Standart” ile yazı ve buton boyutunu seç. Rahat büyük yazı ve geniş satır gösterir; Standart aynı ekrana daha çok satır sığdırır. Ctrl+ / Ctrl- ile yakınlaştırıp uzaklaştırabilir, Ctrl+0 ile %100’e dönebilirsin.',
        'Use “View: Comfortable | Standard” in the top bar to choose text and button size. Comfortable shows larger text and taller rows; Standard fits more rows on the screen. Ctrl+ / Ctrl- zoom, Ctrl+0 returns to 100%.'),
      L('Listede bir satıra tıkla: o kayıtla yapabileceğin işlemler tablonun üstündeki “Seçili kayıt” çubuğunda yazılı butonlar olarak çıkar. Sağ tık yalnız kısayoldur.',
        'Click a row in a list: everything you can do with that record appears as labelled buttons in the “Selected record” bar above the table. Right-click is only a shortcut.'),
      L('Onay pencereleri butona basmadan önce “Ne olacak?” ve “Sonraki adım” bilgisini gösterir. Sildiğin bir kaydı hemen ardından çıkan “Geri al” ile geri alabilirsin.',
        'Confirmation windows show “What happens next?” and the “Next step” before you press the button. Right after deleting a record you can take it back with “Undo”.'),
    ],
    tips: [
      L('Bir sipariş numarasına tıklayınca sipariş (Sipariş Geçmişi dahil) bulunduğun ekrandan çıkmadan açılır.',
        'Click any order number to open the order (including Order History) without leaving the screen.'),
      L('“Kaydedildi” gibi mesajlar köşede açılan pencere yerine alttaki durum çubuğunda yazar ve birkaç saniye yeşil yanar. Kaçırdığın bir mesajı oradan tekrar okuyabilirsin. Hata mesajları sen kapatana kadar ekranda kalır.',
        'Messages like “Saved” appear in the status bar at the bottom and light up green for a few seconds instead of popping up in a corner. You can re-read a missed message there. Error messages stay on screen until you close them.'),
    ],
  },
  {
    id: 'workflow',
    title: L('Sipariş adımları', 'Order steps'),
    intro: L(
      'Bir sipariş departmanlar arasında bu sırayla ilerler. Her ekran, bir siparişin neden henüz oraya gelmediğini “Önceki adımda bekleyenler”de gösterir (yalnız bir önceki adımı).',
      'An order moves between departments in this order. Each screen shows why an order isn’t there yet under “Waiting at the previous step” (only the step right before).',
    ),
    steps: [
      L('Satış temsilcisi teklif ya da sipariş girer → Sipariş Kontrolü onaylar. Reddedilirse satış temsilcisi düzeltip tekrar gönderir.',
        'The sales rep enters a quote or order → Order Review approves it. If it’s rejected, the sales rep fixes it and sends it again.'),
      L('Muhasebe 1. peşinatı girip cari onayı verir → sipariş Fabrika’da Planlama’ya düşer.',
        'Accounting enters the 1st down payment and approves the account → the order lands in Planning at the Factory.'),
      L('Fabrika “Üretime Al” ile başlar, bitince “Hazır” yapar.',
        'The Factory starts with “Start Production” and marks it “Ready” when done.'),
      L('Muhasebe 2. peşinatı girip lojistik onayı verir → sipariş Sevkiyata Hazır’a düşer.',
        'Accounting enters the 2nd down payment and approves logistics → the order lands in Ready to Ship.'),
      L('Lojistik sevkiyatı oluşturur; teslim edilince tamamlar.',
        'Logistics creates the shipment and completes it once delivered.'),
      L('Muhasebe son maliyeti ve 3. peşinatı girip siparişi kapatır → sipariş Tamamlandı.',
        'Accounting enters the final cost and the 3rd down payment and closes the order → the order is Completed.'),
    ],
    tips: [
      L('Bir siparişi aradığın ekranda bulamazsan numarasını filtreye yaz. Liste boşsa “bu ekranda değil: …” mesajı siparişin şu an neyi beklediğini söyler.',
        'Can’t find an order on a screen? Type its number into the filter. If the list is empty, the “not on this screen: …” message tells you what the order is waiting for.'),
      L('Sipariş Geçmişi sekmesinin üstündeki “Şu an bekleniyor” satırı, siparişin hangi departmanda ve kaç gündür beklediğini gösterir.',
        'The “Now waiting for” line at the top of the Order History tab shows which department has the order and for how many days.'),
      L('Bu sıra atlanamaz: muhasebenin lojistik onayı olmadan sevkiyat açılmaz, yalnız Planlama’daki sipariş üretime alınır.',
        'This order can’t be skipped: no shipment without accounting’s logistics approval, and only orders in Planning can start production.'),
    ],
  },
  {
    id: 'orderNew',
    title: L('Yeni Sipariş / Teklif', 'New Order / Quote'),
    routes: ['/orders/new'], access: ['/orders/new'], navPath: '/orders/new',
    intro: L(
      'Form bölümlere ayrılır (Müşteri, Setler, Teslimat, Cari, Şartlar). Üstteki bölüm çubuğuyla aralarında geçebilirsin. Sağdaki özet toplamı ve eksikleri hep gösterir.',
      'The form is split into sections (Customer, Sets, Delivery, Account, Terms). Use the bar at the top to jump between them. The summary on the right always shows the total and what’s missing.',
    ),
    steps: [
      L('Müşteriyi yazarak ara ya da F4 ile tam listeyi aç. Müşterinin açık bakiyesi hemen görünür.',
        'Search for the customer by typing, or press F4 for the full list. The customer’s open balance shows right away.'),
      L('Set sekmelerinde ana ürünü seç; ana ürünü seçili her set siparişe girer. Bir seti çıkarmak için “Seti kaldır”a bas.',
        'Choose a main product on the set tabs; every set with a main product is included. To drop one, use “Remove set”.'),
      L('Teslimat, Cari ve Şartlar bölümlerini doldur. Özetteki “Eksikler” listesinden bir maddeye tıklarsan o alana gidersin.',
        'Fill in Delivery, Account and Terms. Click an item in the summary’s “Missing” list to jump to that field.'),
      L('“Teklif olarak kaydet…” ya da “Sipariş olarak kaydet…” (ve Ctrl+S) önce özeti ve “Ne olacak?” bölümünü açar. Kontrol et, asıl kaydı bu pencerede yap. Kaydedince sipariş Sipariş Kontrolü’ne gider.',
        '“Save as quote…” or “Save as order…” (and Ctrl+S) first open the summary with “What happens next?”. Check it and save from that window. After saving, the order goes to Order Review.'),
    ],
    tips: [
      L('Parça ve ek kalem tutarları bilgi içindir, toplama girmez. Toplam: setler + montaj + teslimat + ek maliyetler.',
        'Part and extra item amounts are for reference and aren’t in the total. The total is sets + installation + delivery + extra costs.'),
      L('Form kendiliğinden taslak olarak saklanır; başlıkta “Taslak kaydedildi · saat” yazar. Uygulama kapansa bile “Taslağı aç” ile kaldığın yerden devam edersin.',
        'The form is saved as a draft automatically; the header shows “Draft saved · time”. Even if the app closes, “Open draft” picks up where you left off.'),
      L('Formda Enter sonraki alana, Shift+Enter önceki alana geçer.',
        'In the form, Enter moves to the next field and Shift+Enter goes back.'),
    ],
  },
  {
    id: 'myOrders',
    title: L('Siparişlerim', 'My Orders'),
    routes: ['/orders/mine'], access: ['/orders/mine'], navPath: '/orders/mine',
    intro: L(
      'Girdiğin teklif ve siparişler. Aşama ve kontrol durumu renkli etiketlerle görünür.',
      'The quotes and orders you entered. Stage and review status show as coloured badges.',
    ),
    steps: [
      L('Liste solda, seçili sipariş sağdaki panelde; ilk kayıt kendiliğinden seçilir. Yapılacak iş panelin altında tek buton olarak durur (ör. “Siparişe Çevir”). Revize, Düzenle ve Sil panelin “Diğer işlemler” menüsünde.',
        'The list is on the left and the selected order in the panel on the right; the first record is selected for you. The next thing to do sits at the bottom of the panel as a single button (e.g. “Turn into Order”). Revise, Edit and Delete are in the panel’s “More actions” menu.'),
      L('Reddedilen siparişi seçince red sebebi panelin altında görünür; “Revize Et” ile düzeltip tekrar gönder.',
        'Select a rejected order and the reason shows at the bottom of the panel; fix it with “Revise” and send it again.'),
      L('Benzer bir sipariş için “Diğer işlemler” menüsünden “Kopyalayıp yeni oluştur”u kullan.',
        'For a similar order, use “Copy to new” from the “More actions” menu.'),
    ],
  },
  {
    id: 'qc',
    title: L('Sipariş Kontrolü', 'Order Review'),
    routes: ['/quality-control'], access: ['/quality-control'], navPath: '/quality-control',
    intro: L(
      'Üstte üç sekme var: Kontrol bekleyen, Onaylanan ve Tüm siparişlerde ara. Liste solda; seçtiğin sipariş (kalemler, şartlar, geçmiş) sağdaki panelde, karar butonları panelin altında.',
      'There are three tabs at the top: Waiting for review, Approved and Search all orders. The list is on the left; the order you pick (items, terms, history) is in the panel on the right, with the decision buttons at the bottom of the panel.',
    ),
    steps: [
      L('↑ ↓ ile satırlar arasında gez; sağdaki sipariş kendiliğinden değişir.',
        'Move between rows with ↑ ↓; the order on the right updates on its own.'),
      L('“Onayla” (ya da O) önce ne olacağını ve sonraki adımı gösterir. Onayladıktan sonra sıradaki bekleyen sipariş açılır. Not yazmak istersen önce “Onay notu ekle”ye tıkla.',
        '“Approve” (or O) first shows what happens and the next step. After you approve, the next waiting order opens. To leave a note, click “Add approval note” first.'),
      L('R ile reddet. Sebep yazman gerekir; satış temsilcisine gider.',
        'Reject with R. You need to give a reason; it goes to the sales rep.'),
    ],
    tips: [
      L('“Revize Et”, “Ödenen tutarı güncelle” ve proforma indirme sipariş panelindeki “Diğer işlemler” menüsünde; hemen yanında Muhasebe Klasörü var.',
        '“Revise”, “Update paid amount” and the proforma downloads are in the order panel’s “More actions” menu, right next to the Accounting Folder.'),
      L('Başlıktaki “Önceki adım” butonu, reddedilip satış temsilcisinin düzeltmesini bekleyen siparişleri gösterir.',
        'The “Previous step” button in the header shows orders that were rejected and are waiting for the sales rep to fix them.'),
    ],
  },
  {
    id: 'accApproval',
    title: L('Muhasebe · Onaylar', 'Accounting · Approvals'),
    routes: ['/accounting/approval'], access: ['/accounting/approval'], navPath: '/accounting/approval',
    intro: L(
      'Üstte üç iş sırası var: Cari onay, Lojistik onayı, Kapanış; sayılar bekleyen iş sayısıdır. Liste solda, karar paneli sağda. Sıraya girince ilk sipariş kendiliğinden seçilir.',
      'There are three work queues at the top: Account approval, Logistics approval, Closing; the numbers show how much is waiting. The list is on the left and the decision panel on the right. The first order is selected when you enter a queue.',
    ),
    steps: [
      L('Sağdaki panelde Ödeme özeti’ne bak: sipariş tutarı, peşinat, ödenen ve kalan bakiye tek listede. Altında tahsilatlar var; yanlış gireni “Tahsilatı iptal et” ile iptal edersin.',
        'Check the Payment summary in the panel on the right: order amount, down payment, paid and balance due in one list. The payments are below it; void a wrong one with “Void payment”.'),
      L('Cari onay: Sipariş Kontrolü’nden geçen sipariş için 1. peşinatı gir ve onayla. Sipariş Fabrika’da Planlama’ya geçer.',
        'Account approval: for an order that passed Order Review, enter the 1st down payment and approve. The order moves to Planning at the Factory.'),
      L('Lojistik onayı: fabrikada “Hazır” olan sipariş için 2. peşinatı gir ve onayla. Sipariş Sevkiyata Hazır’a düşer.',
        'Logistics approval: for an order marked “Ready” at the factory, enter the 2nd down payment and approve. The order lands in Ready to Ship.'),
      L('Kapanış: teslim edilen siparişte son maliyeti ve 3. peşinatı gir, siparişi kapat.',
        'Closing: for a delivered order, enter the final cost and the 3rd down payment, then close it.'),
    ],
    tips: [
      L('Onay butonu önce ne olacağını ve sonraki adımı gösterir. Onayladıktan sonra sıradaki sipariş açılır; siparişleri sırayla bitirebilirsin.',
        'The approve button first shows what happens and the next step. After you approve, the next order opens, so you can work through the queue in order.'),
      L('Proforma (Excel/PDF) ve Satıcı Ek “Muhasebe Klasörü”nün içinde. Müşteri, teslimat ve kalem ayrıntıları için panel başlığındaki “Siparişi Aç”a bas.',
        'The proforma (Excel/PDF) and the Seller File are inside the “Accounting Folder”. For customer, delivery and item details, use “Open Order” in the panel header.'),
      L('“Tüm siparişler” sekmesi sırada olmayan siparişleri gösterir; ödeme durumu ve tarihe göre süzebilir, sonradan tahsilat ekleyebilirsin. Başlıktaki “Önceki adım” butonu o sıraya henüz gelmemiş siparişleri gösterir.',
        'The “All orders” tab shows orders that aren’t in a queue; filter by payment status and date, and add a later payment. The “Previous step” button in the header shows orders that haven’t reached the queue yet.'),
    ],
  },
  {
    id: 'accounting',
    title: L('Tahsilat ve muhasebe listeleri', 'Payments and accounting lists'),
    routes: ['/accounting'], access: ['/accounting', '/accounting/orders', '/accounting/history'], navPath: '/accounting',
    intro: L(
      'Tahsilat ekranında liste solda, tahsilat paneli sağda: seçtiğin siparişin ödeme özeti ve tahsilatları panelde, yeni tahsilat panelin altında. Tahsilat Geçmişi raporlama içindir; belgeler Klasörler ekranında.',
      'On the Payments screen the list is on the left and the payment panel on the right: the selected order’s payment summary and payments are in the panel, and a new payment is entered at the bottom. Payment History is for reporting; documents live on the Folders screen.',
    ),
    steps: [
      L('Siparişi seç (Enter tutar alanına geçer), tutarı Türkçe biçimde gir (ör. 1.234,56) ve “Tahsilatı kaydet”e bas. “Kalan bakiyeyi yaz” tutarı tek tıkla doldurur.',
        'Pick the order (Enter jumps to the amount field), enter the amount in Turkish format (e.g. 1.234,56) and press “Save payment”. “Fill in remaining balance” fills the amount in one click.'),
      L('Yanlış bir tahsilatı paneldeki listeden “Tahsilatı iptal et” ile, sebep yazarak iptal et (Muhasebe Onay yetkisi gerekir).',
        'Void a wrong payment from the list in the panel with “Void payment” and give a reason (needs Accounting Approval rights).'),
      L('Maliyet ve Ek Maliyet panelde kapalı gelen iki bölümdür; başlığına tıklayınca açılır.',
        'Cost and Extra Cost are two sections in the panel that start closed; click the heading to open one.'),
    ],
    tips: [
      L('Tahsilat kalan bakiyeyi aşarsa bir uyarı iki tutarı yan yana gösterir.',
        'If a payment is more than the balance due, a warning shows both amounts side by side.'),
      L('Toplamlar hep döviz başına ayrı gösterilir; farklı dövizler tek toplamda birleşmez.',
        'Totals are always shown per currency; different currencies are never added together.'),
      L('Müşteri, teslimat ve kalem ayrıntıları için panel başlığındaki “Siparişi Aç”a bas. Listede az sütun açık gelir; diğerlerini “Kolonlar”dan açarsın.',
        'For customer, delivery and item details, use “Open Order” in the panel header. The list starts with few columns; turn on the rest from “Columns”.'),
    ],
  },
  {
    id: 'accountingFolder',
    title: L('Muhasebe Klasörü', 'Accounting Folder'),
    routes: ['/accounting/orders'], access: ['/accounting/orders'], navPath: '/accounting/orders',
    intro: L(
      'Her siparişin bir Muhasebe Klasörü var: proforma (Excel/PDF), muhasebe ekleri ve Satıcı Ek tek yerde. Siparişi açtığın her ekranda başlıktaki “Muhasebe Klasörü” düğmesiyle açılır; düğmedeki sayı ek sayısıdır.',
      'Every order has an Accounting Folder: the proforma (Excel/PDF), accounting files and the Seller File in one place. Open it from the “Accounting Folder” button in the order header on any screen; the number on the button is the file count.',
    ),
    steps: [
      L('Dosya eklemek için klasörde dosyaları sürükleyip bırak ya da “Dosya seç”e bas. Birden çok dosya seçebilirsin; eklenen dosya öncekilerin yerini almaz.',
        'To add files, drag them into the folder or press “Choose files”. You can pick several; a new file never replaces earlier ones.'),
      L('PDF ve görselleri “Görüntüle” ile uygulamadan çıkmadan aç; diğer dosyaları “İndir” ile kaydet.',
        'Open PDFs and images with “View” without leaving the app; save other files with “Download”.'),
      L('Klasörler ekranında “Klasör: Dosyası olmayan” filtresiyle belgesi eksik siparişleri bul; siparişi seç, sağ panelin altındaki “Dosya ekle” ile dosyayı hemen ekle.',
        'On the Folders screen, filter “Folder: No files” to find orders missing documents; select the order and add the file with “Add file” at the bottom of the right panel.'),
    ],
    tips: [
      L('Dosya ekleyip silmek Muhasebe ve Yönetici içindir; diğer kullanıcılar klasörü yalnız görüntüler.',
        'Adding and deleting files is for Accounting and Managers; other users can only view the folder.'),
      L('Dosya başına en çok 25 MB; PDF, Excel, Word, görsel, ZIP ve RAR yüklenebilir.',
        'Up to 25 MB per file; PDF, Excel, Word, image, ZIP and RAR files are accepted.'),
    ],
  },
  {
    id: 'balance',
    title: L('Müşteri Bakiyesi (Cari Hesap Ekstresi)', 'Customer Balance (Account Statement)'),
    routes: ['/accounting/balance'], access: ['/accounting/balance'], navPath: '/accounting/balance',
    intro: L(
      'Bir müşterinin siparişlerini (borç), tahsilatlarını (alacak) ve güncel bakiyesini döviz başına gösterir.',
      'Shows a customer’s orders (debit), payments (credit) and running balance per currency.',
    ),
    steps: [
      L('Müşteriyi seç (yaz ya da F4) ve tarih aralığını belirle.',
        'Choose the customer (type or F4) and set the date range.'),
      L('Satırdaki sipariş numarasına tıklayıp siparişi aç. Ekstreyi Excel olarak indirebilirsin.',
        'Click the order number in a row to open the order. You can download the statement as Excel.'),
    ],
  },
  {
    id: 'factory',
    title: L('Fabrika / Üretim', 'Factory / Production'),
    routes: ['/factory'], access: ['/factory'], navPath: '/factory',
    intro: L(
      'Planlama ve Üretim aşamasındaki siparişler. Liste solda; seçili siparişin ayrıntıları sağda, yapılacak iş panelin altında tek buton.',
      'Orders in Planning and Production. The list is on the left; the selected order’s details are on the right, with the one thing to do as a single button at the bottom of the panel.',
    ),
    steps: [
      L('Planlama’daki siparişi seç, panelin altındaki “Üretime Al” ile başlat. Üretim tarihi ve fabrika notu gerekir.',
        'Select an order in Planning and start it with “Start Production” at the bottom of the panel. A production date and factory note are needed.'),
      L('Biten siparişte “Hazır olarak işaretle”ye bas; sipariş muhasebenin lojistik onayına gider.',
        'For a finished order press “Mark as ready”; it goes to accounting for logistics approval.'),
      L('Birden çok satır seçip hepsini birden “Üretime Al” ya da “Hazır” yapabilirsin. Sonuçta kaçının tamam, kaçının hatalı olduğu yazar.',
        'Select several rows to start production or mark them Ready all at once. The result shows how many worked and how many failed.'),
    ],
    tips: [
      L('Başlıktaki “Önceki adım” butonu, muhasebenin cari onayını (1. peşinat) bekleyen siparişleri gösterir.',
        'The “Previous step” button in the header shows orders waiting for accounting’s account approval (1st down payment).'),
    ],
  },
  {
    id: 'logistics',
    title: L('Lojistik', 'Logistics'),
    routes: ['/logistics'], access: ['/logistics/ready', '/logistics/offers', '/logistics/history'], navPath: '/logistics/ready',
    intro: L(
      'Sevkiyata Hazır: gönderilecek siparişler. Nakliye Teklifleri: üretimdeki siparişler için firma teklifleri. Sevkiyat Geçmişi: oluşturulan sevkiyatlar.',
      'Ready to Ship: orders to send. Shipping Quotes: carrier quotes for orders in production. Shipment History: shipments you created.',
    ),
    steps: [
      L('Sevkiyata Hazır’da siparişi seç, sağ panelin altındaki “Sevkiyat Oluştur” ile nakliye firmasını, taşıma türünü/Incoterm’i ve ücreti gir.',
        'On Ready to Ship, pick the order and use “Create Shipment” at the bottom of the right panel to enter the carrier, transport mode/Incoterm and price.'),
      L('Nakliye Teklifleri’nde üretimdeki siparişler için firma tekliflerini topla ve birini onayla.',
        'On Shipping Quotes, collect carrier quotes for orders in production and approve one.'),
      L('Sevkiyat Geçmişi’nde teslim edilen sevkiyatı seç, sağ panelin altındaki “Sevkiyatı tamamla” ile kapat. İptal etmek için panelin başındaki “Diğer işlemler” menüsünü kullan; sebep gerekir.',
        'On Shipment History, select a delivered shipment and close it with “Complete shipment” at the bottom of the right panel. To cancel, use the “More actions” menu at the top of the panel; a reason is required.'),
    ],
    tips: [
      L('Sevkiyata Hazır’da üretimdeki siparişler en altta “Hazırlanıyor” olarak, bilgi için görünür; bunlar için sevkiyat açılamaz.',
        'On Ready to Ship, orders still in production show at the bottom as “Preparing” for reference; they can’t be shipped yet.'),
      L('“Önceki adım”: Sevkiyata Hazır’da muhasebenin lojistik onayını (2. peşinat), Nakliye Teklifleri’nde üretime alınmayı bekleyenler.',
        '“Previous step”: on Ready to Ship, orders waiting for accounting’s logistics approval (2nd down payment); on Shipping Quotes, orders waiting to start production.'),
    ],
  },
  {
    id: 'purchase',
    title: L('Satın Alma', 'Purchasing'),
    routes: ['/purchase', '/approval'], access: ['/purchase/new', '/purchase/mine', '/purchase/all', '/approval/payment', '/approval/final'], navPath: '/purchase/mine',
    intro: L(
      'Satın alma talepleri adım adım onaylanır: talep → ön onay → ödeme bilgileri (muhasebe) → son onay.',
      'Purchase requests are approved step by step: request → pre-approval → payment details (accounting) → final approval.',
    ),
    steps: [
      L('“Satın Alma · Yeni Talep”te ürünü, maliyeti ve dövizi girip talebi gönder; durumunu “Taleplerim”de takip et.',
        'On “Purchasing · New Request”, enter the product, cost and currency and send it; follow it in “My Requests”.'),
      L('Muhasebe “Ödeme Bilgileri”nde ödeme türünü girer; yönetici “Son Onay”da onaylar ya da reddeder.',
        'Accounting enters the payment type on “Payment Details”; a manager approves or rejects it on “Final Approval”.'),
    ],
    tips: [
      L('Son Onay’daki “Önceki adım” butonu, muhasebe kapanışını (3. peşinat) bekleyen siparişleri gösterir; kapanışta oluşan maliyet talebi buraya gelir.',
        'The “Previous step” button on Final Approval shows orders waiting for accounting to close them (3rd down payment); the cost request created at closing lands here.'),
    ],
  },
  {
    id: 'shortcuts',
    title: L('Klavye kısayolları', 'Keyboard shortcuts'),
    intro: L('F1 bu listeyi her ekranda açar; Shift+F1 bu kılavuzu açar.', 'F1 opens this list on any screen; Shift+F1 opens this guide.'),
    special: 'shortcuts',
  },
  {
    id: 'whatsNew',
    title: L('Neler değişti', 'What’s new'),
    routes: ['/updates'],
    intro: L('Bu sürümdeki değişiklikler. Tüm sürümler için “Neler Yeni” sayfasına bak.', 'Changes in this version. See the “What’s New” page for all versions.'),
    navPath: '/updates',
    special: 'whatsNew',
  },
]
