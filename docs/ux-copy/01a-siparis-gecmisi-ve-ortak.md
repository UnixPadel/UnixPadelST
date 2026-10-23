# Modül 1a — Sipariş Geçmişi, sipariş detayı ve ortak metinler

## 1. Ekran / Konum: Sipariş detayı · Sipariş Geçmişi sekmesi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sipariş Geçmişi
- İçerik / Açıklama: Teklif {{no}} siparişe çevrildi · Sipariş kontrolü · {{n}}. tahsilat · {{amount}} · {{n}}. tahsilat iptal edildi · Üretim bitti · Üretim bekleniyor · Nakliye teklifi: {{firma}} · Sevkiyat yola çıktı …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Order History
- Content / Description: Quote {{no}} turned into an order · Order review · Payment {{n}} · {{amount}} · Payment {{n}} voided · Production done · Waiting for production · Shipping quote: {{firma}} · Shipped …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `docFlow.title` | Belge Akışı | Sipariş Geçmişi | Document Flow | Order History |
| `docFlow.convertedFromQuote` | Teklif {{no}} siparişe çevrildi | Teklif {{no}} siparişe çevrildi | Converted from quote {{no}} | Quote {{no}} turned into an order |
| `docFlow.qc` | Kontrol | Sipariş kontrolü | Control | Order review |
| `docFlow.payment` | {{n}}. tahsilat · {{amount}} | {{n}}. tahsilat · {{amount}} | Payment #{{n}} · {{amount}} | Payment {{n}} · {{amount}} |
| `docFlow.paymentCancelled` | {{n}}. tahsilat iptal edildi | {{n}}. tahsilat iptal edildi | Payment #{{n}} cancelled | Payment {{n}} voided |
| `docFlow.productionDone` | Üretim tamamlandı | Üretim bitti | Production finished | Production done |
| `docFlow.awaitingProduction` | Üretim bekliyor | Üretim bekleniyor | Awaiting production | Waiting for production |
| `docFlow.logisticsOffer` | Lojistik teklifi: {{firma}} | Nakliye teklifi: {{firma}} | Logistics offer: {{firma}} | Shipping quote: {{firma}} |
| `docFlow.shipped` | Sevk edildi | Sevkiyat yola çıktı | Shipped | Shipped |
| `docFlow.awaitingShipment` | Sevkiyat bekliyor | Sevkiyat bekleniyor | Awaiting shipment | Waiting for shipment |

</details>

## 2. Ekran / Konum: Sipariş detayı · sekmeler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sipariş Geçmişi
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Order History
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orderDetail.tabs.flow` | Belge Akışı | Sipariş Geçmişi | Document Flow | Order History |

</details>

## 3. Ekran / Konum: Sipariş detayı (pencere ve sağ panel)

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sipariş {{no}}
- İçerik / Açıklama: Müşteri · Teslimat adresi · Fiyat · Ürünler ve parçalar · E-posta · Vergi No · Teslim alan · Yetkili kişi …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Order {{no}}
- Content / Description: Customer · Delivery address · Price · Products and parts · Email · VAT No · Recipient · Contact person …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orderDetail.title` | Sipariş Detayı — {{no}} | Sipariş {{no}} | Order Detail — {{no}} | Order {{no}} |
| `orderDetail.musteriInfo` | Müşteri Bilgileri | Müşteri | Customer Information | Customer |
| `orderDetail.teslimatAddr` | Teslimat Adresi | Teslimat adresi | Delivery Address | Delivery address |
| `orderDetail.pricing` | Fiyatlandırma | Fiyat | Pricing | Price |
| `orderDetail.products` | Ürünler / Bileşenler | Ürünler ve parçalar | Products / Components | Products and parts |
| `orderDetail.email` | E-Mail | E-posta | E-Mail | Email |
| `orderDetail.vat` | VAT No | Vergi No | VAT No | VAT No |
| `orderDetail.teslimAlan` | Teslim Alan | Teslim alan | Recipient | Recipient |
| `orderDetail.ilgiliKisi` | İlgili Kişi | Yetkili kişi | Contact Person | Contact person |
| `orderDetail.paraBirimi` | Para Birimi | Döviz | Currency | Currency |
| `orderDetail.brut` | Brüt Toplam | Ara toplam | Gross Total | Subtotal |
| `orderDetail.pesinYuzde` | Peşin Yüzde | Peşinat % | Down Payment % | Down payment % |
| `orderDetail.pesinatTutar` | Peşinat Tutarı | Peşinat tutarı | Down Payment Amount | Down payment |
| `orderDetail.oznitelik` | Öznitelik | Özellik | Attribute | Option |
| `orderDetail.bilesen` | Bileşen {{id}} | Parça {{id}} | Component {{id}} | Part {{id}} |
| `orderDetail.redNotu` | Red Notu | Red sebebi | Rejection Note | Reason for rejection |
| `orderDetail.ozelKalem` | Özel Kalem | Ek kalem | Custom Item | Extra item |
| `orderDetail.ozelBadge` | Özel | Ek | Custom | Extra |
| `orderDetail.temsilci` | Satış Temsilcisi | Satış Temsilcisi | Sales Representative | Sales Rep |
| `orderDetail.currentRep` | Mevcut temsilci | Şu anki satış temsilcisi | Current representative | Current sales rep |
| `orderDetail.selectRep` | Yeni temsilci seçin | Yeni satış temsilcisi seç | Select new representative | Choose new sales rep |
| `orderDetail.changeRep` | Temsilciyi Değiştir | Satış Temsilcisini Değiştir | Change Representative | Change Sales Rep |
| `orderDetail.repChanged` | Temsilci güncellendi | Satış temsilcisi değişti. | Representative updated | Sales rep changed. |
| `orderDetail.excelDownloaded` | Excel indirildi | Excel indirildi. | Excel downloaded | Excel downloaded. |
| `orderDetail.pdfDownloaded` | PDF indirildi | PDF indirildi. | PDF downloaded | PDF downloaded. |
| `orderDetail.loadError` | Sipariş detayı yüklenemedi. | Sipariş açılamadı. Tekrar dene. | Order details could not be loaded. | Couldn't open the order. Try again. |
| `orderDetail.copyHint` | Bu siparişin içeriğiyle yeni bir teklif/sipariş formu açar | Bu siparişin bilgileriyle yeni bir form açar | Opens a new quote/order form prefilled with this order | Opens a new form with this order's details |
| `orderDetail.copyAsNew` | Kopyala ile yeni | Kopyalayıp yeni oluştur | Copy as new | Copy to new |
| `orderDetail.legacyTimelines` | Aşama ve onay ayrıntıları | Aşamalar ve onaylar | Stage and approval details | Stages and approvals |

</details>

## 4. Ekran / Konum: Sipariş detayı · Aşamalar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Aşamalar
- İçerik / Açıklama: Şu an · Üretime alındı · Hazır · Lojistiğe geçti · Planlamada · Aşama değişikliklerinin tamamı kaydedilmiyor; yalnız son işlem tarihi görünür.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Stages
- Content / Description: Now · Sent to production · Ready · Sent to logistics · In planning · Not every stage change is saved; only the last update time is shown.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orderStage.title` | Aşama Geçmişi | Aşamalar | Stage History | Stages |
| `orderStage.current` | Mevcut | Şu an | Current | Now |
| `orderStage.movedToProduction` | Üretime Alındı | Üretime alındı | Moved to Production | Sent to production |
| `orderStage.markedReady` | Hazır Olarak İşaretlendi | Hazır | Marked as Ready | Ready |
| `orderStage.movedToLogistics` | Lojistiğe Alındı | Lojistiğe geçti | Moved to Logistics | Sent to logistics |
| `orderStage.planning` | Planlamada | Planlamada | Planning | In planning |
| `orderStage.noHistoryNote` | Detaylı aşama geçiş geçmişi tutulmuyor; yalnız son işlem tarihi gösterilir. | Aşama değişikliklerinin tamamı kaydedilmiyor; yalnız son işlem tarihi görünür. | Detailed stage transitions are not stored; only the last action time is shown. | Not every stage change is saved; only the last update time is shown. |

</details>

## 5. Ekran / Konum: Sipariş detayı · Onaylar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Onaylar
- İçerik / Açıklama: Onaylar yükleniyor… · Henüz onay yok.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Approvals
- Content / Description: Loading approvals… · No approvals yet.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `approvalTimeline.title` | Onay Geçmişi | Onaylar | Approval History | Approvals |
| `approvalTimeline.loading` | Onay geçmişi yükleniyor… | Onaylar yükleniyor… | Loading approval history… | Loading approvals… |
| `approvalTimeline.empty` | Onay kaydı yok. | Henüz onay yok. | No approval records. | No approvals yet. |

</details>

## 6. Ekran / Konum: Ortak butonlar ve alan adları (tüm ekranlar)

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Vazgeç
- İçerik / Açıklama: Yükleniyor… · Kaydediliyor… · Tamam · Detaylar · Kayıt yok. · Çıkış · Tümü · Oluşturan …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Cancel
- Content / Description: Loading… · Saving… · Done · Details · Nothing here yet. · Log out · All · Created by …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `common.cancel` | İptal | Vazgeç | Cancel | Cancel |
| `common.loading` | Yükleniyor... | Yükleniyor… | Loading... | Loading… |
| `common.saving` | Kaydediliyor... | Kaydediliyor… | Saving... | Saving… |
| `common.success` | Başarılı | Tamam | Success | Done |
| `common.details` | Detay | Detaylar | Details | Details |
| `common.noData` | Kayıt bulunamadı. | Kayıt yok. | No records found. | Nothing here yet. |
| `common.logout` | Çıkış Yap | Çıkış | Log Out | Log out |
| `common.all` | — Tümü — | Tümü | — All — | All |
| `common.createdBy` | Oluşturan | Oluşturan | Created By | Created by |
| `common.control` | Kontrol | Kontrol durumu | Control | Review status |
| `common.startDate` | Başlangıç | Başlangıç tarihi | Start | From |
| `common.endDate` | Bitiş | Bitiş tarihi | End | To |
| `common.vat` | VAT | Vergi No | VAT | VAT No |
| `common.passive` | Pasif | Pasif | Passive | Inactive |
| `common.reason` | Gerekçe | Sebep | Reason | Reason |
| `common.failed` | Başarısız | Yapılamadı | Failed | Didn't work |
| `common.operationFailed` | İşlem başarısız | İşlem yapılamadı. Tekrar dene. | Operation failed | That didn't work. Try again. |
| `common.clone` | Klonla | Kopyala | Clone | Copy |
| `common.revise` | Revize | Revize Et | Revise | Revise |
| `common.submitForApproval` | Onaya Gönder | Onaya Gönder | Submit for Approval | Send for Approval |
| `common.convertToOrder` | Siparişe Çevir | Siparişe Çevir | Convert to Order | Turn into Order |
| `common.rejectReasonPrompt` | Red gerekçesi: | Neden reddediyorsun? | Rejection reason: | Why are you rejecting it? |
| `common.select` | Seçiniz | Seç | Select | Choose |
| `common.representative` | Temsilci | Satış Temsilcisi | Representative | Sales Rep |

</details>
