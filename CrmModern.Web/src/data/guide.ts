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
      L('Güne “Bekleyen İşler” ile başla: sana düşen tüm işler, kaç gündür beklediğiyle burada. “Aç” ilgili ekranı o kayıt seçili açar.',
        'Start the day with “Pending Tasks”: everything waiting for you, with how long it has waited. “Open” takes you to the screen with that record selected.'),
      L('Ctrl+K ile Hızlı Erişim’i aç: ekran kodu (YS Yeni Sipariş, KK Sipariş Kontrolü, FB Fabrika, LH Lojistik, TH Tahsilat, BI Bekleyen İşler, KL Kılavuz) ya da “SP <sipariş no>” yaz, Enter’a bas.',
        'Press Ctrl+K for Quick Open: type a screen code (YS New Order, KK Order Review, FB Factory, LH Logistics, TH Payments, BI Pending Tasks, KL Guide) or “SP <order no>” and press Enter.'),
      L('Tercihlerim’de varsayılan şirketi, dövizi, peşinat yüzdesini, tablo yoğunluğunu ve açılış sayfasını seç. Yeni formlar bu değerlerle açılır.',
        'In Preferences, choose your default company, currency, down payment %, table density and start page. New forms open with these values.'),
      L('Tablolarda az satır görüyorsan (küçük ekran ya da Windows %125/%150 ölçek) Tercihlerim → Arayüz ölçeği’ni değiştir. Ctrl+ / Ctrl- ile büyütüp küçültebilir, Ctrl+0 ile otomatiğe dönebilirsin. Listenin üstündeki bölmeyi sürükleyerek ya da katlayarak tabloya yer açabilirsin.',
        'If tables show too few rows (small screen or Windows 125%/150% scaling), change Preferences → Interface scale. Ctrl+ / Ctrl- zoom and Ctrl+0 returns to automatic. Drag or collapse the panel above a list to give the table more room.'),
    ],
    tips: [
      L('Bir sipariş numarasına tıklayınca sipariş (Sipariş Geçmişi dahil) bulunduğun ekrandan çıkmadan açılır.',
        'Click any order number to open the order (including Order History) without leaving the screen.'),
      L('Alttaki durum çubuğu ekranın kısayollarını ve son mesajları gösterir. Kaçırdığın bir bildirimi oradan tekrar okuyabilirsin.',
        'The status bar at the bottom shows the screen’s shortcuts and recent messages. You can re-read a missed notification there.'),
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
      L('Ctrl+S önce özeti gösterir. Kontrol et, sonra Teklif ya da Sipariş olarak kaydet. Kaydedince sipariş Sipariş Kontrolü’ne gider.',
        'Ctrl+S shows the summary first. Check it, then save as a Quote or Order. After saving, the order goes to Order Review.'),
    ],
    tips: [
      L('Parça ve ek kalem tutarları bilgi içindir, toplama girmez. Toplam: setler + montaj + teslimat + ek maliyetler.',
        'Part and extra item amounts are for reference and aren’t in the total. The total is sets + installation + delivery + extra costs.'),
      L('Form kendiliğinden taslak olarak saklanır. Uygulama kapansa bile “Taslağı aç” ile kaldığın yerden devam edersin.',
        'The form is saved as a draft automatically. Even if the app closes, “Open draft” picks up where you left off.'),
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
      L('Reddedilen bir siparişte “Red Sebebi”ni oku, “Revize Et” ile düzeltip tekrar gönder.',
        'For a rejected order, read “Why Rejected”, fix it with “Revise” and send it again.'),
      L('Benzer bir sipariş için satır menüsünden “Kopyalayıp yeni oluştur”u kullan.',
        'For a similar order, use “Copy to new” from the row menu.'),
    ],
  },
  {
    id: 'qc',
    title: L('Sipariş Kontrolü', 'Order Review'),
    routes: ['/quality-control'], access: ['/quality-control'], navPath: '/quality-control',
    intro: L(
      'Kontrol bekleyen teklif ve siparişler alttaki listede. Seçtiğin kaydın ayrıntıları üstteki sekmelerde ve sağdaki kartta.',
      'Quotes and orders waiting for review are in the list below. The details of the one you pick are in the tabs above and the card on the right.',
    ),
    steps: [
      L('↑ ↓ ile satırlar arasında gez; ayrıntılar kendiliğinden değişir.',
        'Move between rows with ↑ ↓; the details update on their own.'),
      L('O ile onayla; sıradaki bekleyen sipariş açılır.',
        'Approve with O; the next waiting order opens.'),
      L('R ile reddet. Sebep yazman gerekir; satış temsilcisine gider.',
        'Reject with R. You need to give a reason; it goes to the sales rep.'),
    ],
    tips: [
      L('Başlıktaki “Önceki adım” butonu, reddedilip satış temsilcisinin düzeltmesini bekleyen siparişleri gösterir.',
        'The “Previous step” button in the header shows orders that were rejected and are waiting for the sales rep to fix them.'),
    ],
  },
  {
    id: 'accApproval',
    title: L('Muhasebe · Onaylar', 'Accounting · Approvals'),
    routes: ['/accounting/approval'], access: ['/accounting/approval'], navPath: '/accounting/approval',
    intro: L(
      'Üç sıra var; listenin üstündeki butonlarla geçersin. Her sırada “Önceki adım” butonu o sıraya henüz gelmemiş siparişleri gösterir.',
      'There are three queues; switch with the buttons above the list. In each one, the “Previous step” button shows orders that haven’t reached it yet.',
    ),
    steps: [
      L('Cari onay: Sipariş Kontrolü’nden geçen sipariş için 1. peşinatı gir ve onayla. Sipariş Fabrika’da Planlama’ya geçer.',
        'Account approval: for an order that passed Order Review, enter the 1st down payment and approve. The order moves to Planning at the Factory.'),
      L('Lojistik onayı: fabrikada “Hazır” olan sipariş için 2. peşinatı gir ve onayla. Sipariş Sevkiyata Hazır’a düşer.',
        'Logistics approval: for an order marked “Ready” at the factory, enter the 2nd down payment and approve. The order lands in Ready to Ship.'),
      L('Kapanış: teslim edilen siparişte son maliyeti ve 3. peşinatı gir, siparişi kapat.',
        'Closing: for a delivered order, enter the final cost and the 3rd down payment, then close it.'),
    ],
    tips: [
      L('Onayladıktan sonra sıradaki sipariş açılır; siparişleri sırayla bitirebilirsin.',
        'After you approve, the next order opens, so you can work through the queue in order.'),
    ],
  },
  {
    id: 'accounting',
    title: L('Tahsilat ve muhasebe listeleri', 'Payments and accounting lists'),
    routes: ['/accounting'], access: ['/accounting', '/accounting/orders', '/accounting/history'], navPath: '/accounting',
    intro: L(
      'Tahsilat ekranında bir sipariş seçip tahsilat girersin. Teklif ve Siparişler ile Tahsilat Geçmişi raporlama içindir.',
      'On the Payments screen you pick an order and record a payment. Quotes & Orders and Payment History are for reporting.',
    ),
    steps: [
      L('Siparişi seç, tutarı Türkçe biçimde gir (ör. 1.234,56) ve kaydet. Alandan çıkınca biçim kendiliğinden düzelir.',
        'Pick the order, enter the amount in Turkish format (e.g. 1.234,56) and save. The format tidies itself when you leave the field.'),
      L('Yanlış bir tahsilatı kırmızı X ile, sebep yazarak iptal et.',
        'Void a wrong payment with the red X and give a reason.'),
    ],
    tips: [
      L('Tahsilat kalan bakiyeyi aşarsa bir uyarı iki tutarı yan yana gösterir.',
        'If a payment is more than the balance due, a warning shows both amounts side by side.'),
      L('Toplamlar hep döviz başına ayrı gösterilir; farklı dövizler tek toplamda birleşmez.',
        'Totals are always shown per currency; different currencies are never added together.'),
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
      'Planlama ve Üretim aşamasındaki siparişler. Bir satıra tıklayınca ayrıntılar sağda açılır.',
      'Orders in Planning and Production. Click a row to see the details on the right.',
    ),
    steps: [
      L('Planlama’daki siparişi “Üretime Al” ile başlat. Üretim tarihi ve fabrika notu gerekir.',
        'Start an order in Planning with “Start Production”. A production date and factory note are needed.'),
      L('Biten siparişi “Hazır” yap; sipariş muhasebenin lojistik onayına gider.',
        'Mark a finished order “Ready”; it goes to accounting for logistics approval.'),
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
      L('Sevkiyata Hazır’da siparişi seç, “Sevkiyat Oluştur” ile nakliye firmasını, taşıma türünü/Incoterm’i ve ücreti gir.',
        'On Ready to Ship, pick the order and use “Create Shipment” to enter the carrier, transport mode/Incoterm and price.'),
      L('Nakliye Teklifleri’nde üretimdeki siparişler için firma tekliflerini topla ve birini onayla.',
        'On Shipping Quotes, collect carrier quotes for orders in production and approve one.'),
      L('Sevkiyat Geçmişi’nde teslim edilen sevkiyatı “Tamamla” ile kapat. İptal etmek için sebep gerekir.',
        'On Shipment History, close a delivered shipment with “Complete”. Cancelling needs a reason.'),
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
