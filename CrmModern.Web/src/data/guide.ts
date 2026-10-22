import type { Localized } from '@/types'

/**
 * Kullanım Kılavuzu içeriği (TR + EN). GuideDialog bulunulan ekranın bölümünü
 * `routes` önek eşleşmesiyle (en uzun) seçer; `access` verilen bölümler yalnız
 * o ekranlardan en az birine erişimi olan kullanıcıya gösterilir (menü kuralı).
 * `special`: içerik koddan üretilir (kısayol tablosu, güncel sürüm notu).
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
      'Sol menü bölümlere ayrılmıştır (Satış, Operasyon, Lojistik, Muhasebe, Satın Alma, Yönetim); yalnız rolünüzün açabildiği ekranlar görünür. Menü öğelerinin yanındaki sayılar o ekranda bekleyen iş sayısıdır.',
      'The left menu is grouped (Sales, Operations, Logistics, Accounting, Purchasing, Admin); only screens your role can open are shown. Numbers next to menu items are the pending work on that screen.',
    ),
    steps: [
      L('Güne “Bekleyen İşler” ile başlayın: rolünüze düşen tüm işler kuyruk kuyruk, kaç gündür beklediğiyle listelenir; “İşle” ilgili ekranı o kayıt seçili açar.',
        'Start the day with “Pending Tasks”: everything waiting for your role, queue by queue, with how long it has waited; “Process” opens the screen with that record selected.'),
      L('Ctrl+K ile komut kutusunu açın: ekran kodu (YS Yeni Sipariş, KK Kontrol, FB Fabrika, LH Lojistik, TH Tahsilat, BI Bekleyen İşler, KL Kılavuz) ya da “SP <sipariş no>” yazıp Enter’a basın.',
        'Press Ctrl+K for the command box: type a screen code (YS New Order, KK Control, FB Factory, LH Logistics, TH Collections, BI Pending Tasks, KL Guide) or “SP <order no>” and press Enter.'),
      L('Tercihlerim’de varsayılan şirket, para birimi, peşin %, tablo yoğunluğu ve açılış sayfasını belirleyin; yeni formlar bu değerlerle açılır.',
        'In Preferences set your default company, currency, down payment %, table density and start page; new forms open with these values.'),
    ],
    tips: [
      L('Herhangi bir sipariş numarasına tıklamak sipariş detayını (Belge Akışı dahil) bulunduğunuz ekrandan ayrılmadan açar.',
        'Clicking any order number opens the order details (including Document Flow) without leaving the current screen.'),
      L('Ekranın altındaki durum çubuğu o ekranın kısayollarını ve son mesajları gösterir; kaçırdığınız bir bildirimi oradan tekrar okuyabilirsiniz.',
        'The status bar at the bottom shows the screen’s shortcuts and recent messages; you can re-read a missed notification there.'),
    ],
  },
  {
    id: 'workflow',
    title: L('Sipariş akışı ve iç denetim', 'Order flow and internal control'),
    intro: L(
      'Bir sipariş departmanlar arasında şu sırayla ilerler. Her ekran, siparişin neden henüz kendisine düşmediğini “Önceki aşamada bekleyenler” bölümünde gösterir — yalnız bir önceki adımı.',
      'An order moves between departments in this order. Each screen shows why an order has not reached it yet under “Waiting at the previous step” — only the immediately previous step.',
    ),
    steps: [
      L('Temsilci teklif/sipariş girer → Kontrol onaylar (reddederse temsilci düzeltip yeniden gönderir).',
        'The sales rep enters the quote/order → Control approves (if rejected, the rep revises and resubmits).'),
      L('Muhasebe cari onayı verir (1. peşinat girilir) → sipariş Fabrika’da Planlama’ya düşer.',
        'Accounting gives account approval (1st down payment entered) → the order reaches Planning in the Factory.'),
      L('Fabrika “Üretime Al” ile üretime başlar, bitince “Hazır” yapar.',
        'The Factory starts production with “Move to Production” and marks it “Ready” when finished.'),
      L('Muhasebe lojistik onayı verir (2. peşinat) → sipariş Lojistik Hazır’a düşer.',
        'Accounting gives logistics approval (2nd down payment) → the order reaches Logistics Ready.'),
      L('Lojistik sevk talebini açar; teslim edilince sevkiyatı tamamlar.',
        'Logistics creates the shipment; once delivered it completes the shipment.'),
      L('Muhasebe kapanışı yapar (final maliyet, 3. peşinat) → sipariş Tamamlandı.',
        'Accounting closes the order (final cost, 3rd down payment) → the order is Completed.'),
    ],
    tips: [
      L('Bir siparişi aradığınız ekranda bulamazsanız sipariş numarasını filtreye yazın: liste boşsa “bu ekranda değil: …” ile siparişin şu an neyi beklediği yazar.',
        'If you cannot find an order on a screen, type its number into the filter: if the list is empty it says “not on this screen: …” with what the order is waiting for.'),
      L('Sipariş detayındaki Belge Akışı sekmesinin üstünde “Şu an bekleniyor” satırı, siparişin hangi departmanda ve kaç gündür beklediğini gösterir.',
        'At the top of the Document Flow tab in order details, the “Now waiting for” line shows which department holds the order and for how many days.'),
      L('Sistem bu sırayı korur: muhasebe lojistik onayı olmadan sevkiyat açılamaz, yalnız Planlama’daki sipariş üretime alınabilir.',
        'The system enforces this order: no shipment without accounting logistics approval, and only orders in Planning can be moved to production.'),
    ],
  },
  {
    id: 'orderNew',
    title: L('Yeni Sipariş / Teklif', 'New Order / Quote'),
    routes: ['/orders/new'], access: ['/orders/new'], navPath: '/orders/new',
    intro: L(
      'Form bölümlere ayrılmıştır (Müşteri, Setler, Teslimat, Cari, Şartlar); üstteki bölüm çubuğu ile aralarında geçebilirsiniz. Sağdaki özet toplamı ve eksik alanları her an gösterir.',
      'The form is split into sections (Customer, Sets, Delivery, Account, Terms); use the section bar at the top to jump between them. The summary on the right always shows the total and missing fields.',
    ),
    steps: [
      L('Müşteriyi yazarak arayın ya da F4 ile tam listeyi açın; müşterinin açık bakiyesi hemen görünür.',
        'Search the customer by typing or press F4 for the full list; the customer’s open balance is shown right away.'),
      L('Set sekmelerinde kategori seçin; kategorisi seçili her sekme siparişe dahil edilir. Sekmeyi kaldırmak için “Seti kaldır”ı kullanın.',
        'Choose a category on the set tabs; every tab with a category is included in the order. Use “Remove set” to drop a tab.'),
      L('Teslimat, Cari ve Şartlar bölümlerini doldurun. Özetteki “Eksikler” listesinde bir maddeye tıklamak sizi o alana götürür.',
        'Fill in Delivery, Account and Terms. Clicking an item in the summary’s “Missing” list takes you to that field.'),
      L('Ctrl+S önce özeti gösterir; kontrol edip Teklif ya da Sipariş olarak kaydedin. Kayıttan sonra sipariş Kontrol’e düşer.',
        'Ctrl+S first shows the summary; check it and save as Quote or Order. After saving, the order goes to Control.'),
    ],
    tips: [
      L('Bileşen ve serbest kalem tutarları bilgi amaçlıdır, toplama dahil değildir; toplam set + montaj + teslimat + ekstradan oluşur.',
        'Component and free-item amounts are informational and not included in the total; the total is sets + installation + delivery + extras.'),
      L('Form otomatik taslak olarak saklanır; uygulama kapansa da “Taslağı yükle” ile kaldığınız yerden sürdürürsünüz.',
        'The form is saved as a draft automatically; even if the app closes you can continue with “Restore draft”.'),
      L('Formda Enter bir sonraki alana geçer, Shift+Enter geri döner.',
        'In the form, Enter moves to the next field and Shift+Enter goes back.'),
    ],
  },
  {
    id: 'myOrders',
    title: L('Siparişlerim', 'My Orders'),
    routes: ['/orders/mine'], access: ['/orders/mine'], navPath: '/orders/mine',
    intro: L(
      'Girdiğiniz teklif ve siparişlerin listesi; aşama ve kontrol durumu renkli etiketlerle gösterilir.',
      'The list of quotes and orders you entered; stage and control status are shown with coloured badges.',
    ),
    steps: [
      L('Reddedilen bir siparişte red notunu okuyun ve “Revize” ile düzeltip yeniden gönderin.',
        'For a rejected order, read the rejection note and fix it with “Revise”, then resubmit.'),
      L('Benzer bir sipariş için satırın menüsünden “Kopyala ile yeni”yi kullanın.',
        'For a similar order use “Copy as new” from the row menu.'),
    ],
  },
  {
    id: 'qc',
    title: L('Kontrol', 'Control'),
    routes: ['/quality-control'], access: ['/quality-control'], navPath: '/quality-control',
    intro: L(
      'Kontrol bekleyen teklif ve siparişler alttaki listede; seçili kaydın detayı üstteki sekmelerde ve sağdaki Kontrol kartındadır.',
      'Quotes and orders awaiting control are in the list below; the selected record’s details are in the tabs above and the Control card on the right.',
    ),
    steps: [
      L('↑ ↓ ile satırlar arasında gezin; detay otomatik güncellenir.',
        'Move between rows with ↑ ↓; the details update automatically.'),
      L('O ile onaylayın — seçim bir sonraki bekleyen kayda geçer.',
        'Approve with O — the selection moves to the next pending record.'),
      L('R ile reddedin; gerekçe zorunludur ve temsilciye iletilir.',
        'Reject with R; a reason is required and is sent to the sales rep.'),
    ],
    tips: [
      L('Başlıktaki “Önceki aşama” butonu, reddedilip temsilci düzeltmesi bekleyen siparişleri gösterir.',
        'The “Previous step” button in the header shows orders that were rejected and are waiting for the rep’s revision.'),
    ],
  },
  {
    id: 'accApproval',
    title: L('Muhasebe Onay', 'Accounting Approval'),
    routes: ['/accounting/approval'], access: ['/accounting/approval'], navPath: '/accounting/approval',
    intro: L(
      'Üç kuyruk vardır; listenin üstündeki düğmelerle geçilir. Her kuyrukta “Önceki aşama” butonu o kuyruğa henüz gelmemiş siparişleri gösterir.',
      'There are three queues; switch with the buttons above the list. In each queue the “Previous step” button shows orders that have not reached that queue yet.',
    ),
    steps: [
      L('Cari Onay: Kontrol’den geçen sipariş için 1. peşinatı girip onaylayın; sipariş Fabrika’da Planlama’ya geçer.',
        'Account approval: for an order that passed Control, enter the 1st down payment and approve; the order moves to Planning in the Factory.'),
      L('Lojistik Onay: fabrikada “Hazır” olan sipariş için 2. peşinatı girip onaylayın; sipariş Lojistik Hazır’a düşer.',
        'Logistics approval: for an order marked “Ready” in the factory, enter the 2nd down payment and approve; the order reaches Logistics Ready.'),
      L('Tamamlanma: teslim edilen siparişte final maliyeti ve 3. peşinatı girip kapanışı yapın.',
        'Completion: for a delivered order, enter the final cost and the 3rd down payment and close it.'),
    ],
    tips: [
      L('Onaydan sonra seçim kuyruktaki bir sonraki siparişe geçer; siparişleri sırayla işleyebilirsiniz.',
        'After approval the selection moves to the next order in the queue, so you can work through them in order.'),
    ],
  },
  {
    id: 'accounting',
    title: L('Tahsilat ve muhasebe listeleri', 'Collections and accounting lists'),
    routes: ['/accounting'], access: ['/accounting', '/accounting/orders', '/accounting/history'], navPath: '/accounting',
    intro: L(
      'Tahsilat ekranında bir sipariş seçip tahsilat girersiniz; Muhasebe Siparişleri ve Muhasebe Geçmişi raporlama içindir.',
      'On the Collections screen you select an order and enter payments; Accounting Orders and Accounting History are for reporting.',
    ),
    steps: [
      L('Siparişi seçin, tutarı Türkçe biçimde girin (ör. 1.234,56) ve kaydedin; alan ayrılınca biçim kendiliğinden düzelir.',
        'Select the order, enter the amount in Turkish format (e.g. 1.234,56) and save; the format is normalised when you leave the field.'),
      L('Yanlış bir tahsilatı kırmızı X ile, gerekçe yazarak iptal edin.',
        'Cancel a wrong payment with the red X, giving a reason.'),
    ],
    tips: [
      L('Sipariş tutarını aşan tahsilatta onay penceresi tutar karşılaştırmasını gösterir.',
        'For a payment exceeding the order total, a confirmation window shows the amount comparison.'),
      L('Toplamlar her zaman döviz bazında ayrı gösterilir; farklı para birimleri tek toplamda birleşmez.',
        'Totals are always shown per currency; different currencies are never added together.'),
    ],
  },
  {
    id: 'balance',
    title: L('Cari Hesap Ekstresi', 'Customer Account Statement'),
    routes: ['/accounting/balance'], access: ['/accounting/balance'], navPath: '/accounting/balance',
    intro: L(
      'Bir müşterinin borç (sipariş), alacak (tahsilat) ve yürüyen bakiyesini döviz bazında gösterir.',
      'Shows a customer’s debit (orders), credit (payments) and running balance per currency.',
    ),
    steps: [
      L('Müşteriyi seçin (yazarak ya da F4), tarih aralığını belirleyin.',
        'Choose the customer (type or F4) and set the date range.'),
      L('Satırdaki sipariş numarasına tıklayıp belgeyi açın; ekstreyi Excel’e aktarabilirsiniz.',
        'Click the order number in a row to open the document; you can export the statement to Excel.'),
    ],
  },
  {
    id: 'factory',
    title: L('Fabrika / Üretim', 'Factory / Production'),
    routes: ['/factory'], access: ['/factory'], navPath: '/factory',
    intro: L(
      'Planlama ve Üretim aşamasındaki siparişler; satıra tıklayınca detay sağda açılır.',
      'Orders in Planning and Production; clicking a row opens the details on the right.',
    ),
    steps: [
      L('Planlama’daki siparişi “Üretime Al” ile başlatın; üretim tarihi ve fabrika notu zorunludur.',
        'Start an order in Planning with “Move to Production”; production date and factory note are required.'),
      L('Üretimi biten siparişi “Hazır” yapın; sipariş muhasebenin lojistik onayına gider.',
        'Mark a finished order “Ready”; it goes to accounting for logistics approval.'),
      L('Birden çok satırı seçip toplu “Üretime Al” ya da “Hazır” yapabilirsiniz; sonuçta başarılı/hatalı sayısı gösterilir.',
        'You can select several rows and run “Move to Production” or “Ready” in bulk; the result shows how many succeeded or failed.'),
    ],
    tips: [
      L('Listenin üstündeki “Önceki aşamada bekleyenler”, muhasebe cari onayı (1. peşinat) bekleyen siparişleri gösterir.',
        '“Waiting at the previous step” above the list shows orders waiting for accounting account approval (1st down payment).'),
    ],
  },
  {
    id: 'logistics',
    title: L('Lojistik', 'Logistics'),
    routes: ['/logistics'], access: ['/logistics/ready', '/logistics/offers', '/logistics/history'], navPath: '/logistics/ready',
    intro: L(
      'Hazır: sevke hazır siparişler. Teklif: üretimdeki siparişler için taşıyıcı teklifleri. Geçmiş: açılan sevkiyatlar.',
      'Ready: orders ready to ship. Offers: carrier offers for orders in production. History: created shipments.',
    ),
    steps: [
      L('Hazır ekranında siparişi seçip “Sevkiyat Oluştur” ile taşıyıcı, taşıma türü/Incoterm ve fiyatı girin.',
        'On the Ready screen select the order and use “Create Shipment” to enter carrier, transport type/Incoterm and price.'),
      L('Teklif ekranında üretimdeki siparişler için taşıyıcı tekliflerini toplayıp birini onaylayın.',
        'On the Offers screen collect carrier offers for orders in production and approve one.'),
      L('Geçmiş ekranında teslim edilen sevkiyatı “Tamamla” ile kapatın; iptal gerekçe ister.',
        'On the History screen close a delivered shipment with “Complete”; cancelling requires a reason.'),
    ],
    tips: [
      L('Hazır ekranında üretimdeki siparişler “Hazırlanıyor” olarak altta, bilgi amaçlı görünür; sevk açılamaz.',
        'On the Ready screen, orders still in production appear at the bottom as “Preparing” for information; they cannot be shipped.'),
      L('“Önceki aşamada bekleyenler”: Hazır’da muhasebe lojistik onayı (2. peşinat) bekleyenler, Teklif’te üretime alınmayı bekleyenler.',
        '“Waiting at the previous step”: on Ready, orders waiting for accounting logistics approval (2nd down payment); on Offers, orders waiting to start production.'),
    ],
  },
  {
    id: 'purchase',
    title: L('Satın Alma', 'Purchasing'),
    routes: ['/purchase', '/approval'], access: ['/purchase/new', '/purchase/mine', '/purchase/all', '/approval/payment', '/approval/final'], navPath: '/purchase/mine',
    intro: L(
      'Satın alma talepleri aşamalı onaydan geçer: talep → ön onay → ödeme detayı (muhasebe) → nihai onay.',
      'Purchase requests go through staged approval: request → pre-approval → payment details (accounting) → final approval.',
    ),
    steps: [
      L('“Satın Alma · Yeni” ekranında ürün, maliyet ve para birimini girip talep oluşturun; durumunu “Taleplerim”de izleyin.',
        'Create a request on “Purchase · New” (product, cost, currency) and track it in “My Requests”.'),
      L('Muhasebe “Ödeme Detayı” ekranında ödeme türünü girer; yönetici “Nihai Onay”da onaylar ya da reddeder.',
        'Accounting enters the payment type on “Payment Details”; a manager approves or rejects on “Final Approval”.'),
    ],
    tips: [
      L('Nihai Onay’daki “Önceki aşamada bekleyenler”, muhasebe kapanışı (3. peşinat) bekleyen siparişleri gösterir; kapanışta maliyet talebi buraya düşer.',
        '“Waiting at the previous step” on Final Approval shows orders waiting for accounting closing (3rd down payment); closing creates the cost request that lands here.'),
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
    intro: L('Bu sürümdeki değişiklikler. Tüm sürümler için “Neler Yeni” sayfasına bakın.', 'Changes in this version. See the “What’s New” page for all versions.'),
    navPath: '/updates',
    special: 'whatsNew',
  },
]
