# Modül 5 — Fabrika ve Lojistik

Terim kararları: Taşıyıcı → Nakliye firması (Carrier), Sevk → Sevkiyat (Shipment), Lojistik teklif → Nakliye teklifi (Shipping quote).

## 1. Ekran / Konum: Fabrika / Üretim

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Üretime Al — {{siparisNo}} · {{count}} sipariş üretime alınacak · {{count}} sipariş üretime alınacak
- İçerik / Açıklama: Satış Temsilcisi · Filtreleri temizle · İndiriliyor… · İndirildi. · İndirilemedi. · Üretime Al · Üretim tarihi · Fabrika notu …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Start Production — {{siparisNo}} · Start production for {{count}} order · Start production for {{count}} orders
- Content / Description: Sales Rep · Clear filters · Downloading… · Downloaded. · Couldn't download. · Start Production · Production date · Factory note …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `factory.temsilci` | Temsilci | Satış Temsilcisi | Representative | Sales Rep |
| `factory.filterReset` | Filtreleri Temizle | Filtreleri temizle | Clear Filters | Clear filters |
| `factory.excelDownloading` | İndiriliyor... | İndiriliyor… | Downloading... | Downloading… |
| `factory.excelDownloaded` | İndirildi | İndirildi. | Downloaded | Downloaded. |
| `factory.excelFailed` | İndirme başarısız | İndirilemedi. | Download failed | Couldn't download. |
| `factory.moveToProduction` | Üretime Al | Üretime Al | Move to Production | Start Production |
| `factory.moveToProductionTitle` | Üretime Al — {{siparisNo}} | Üretime Al — {{siparisNo}} | Move to Production — {{siparisNo}} | Start Production — {{siparisNo}} |
| `factory.uretimTarihi` | Üretim Tarihi | Üretim tarihi | Production Date | Production date |
| `factory.fabrikaNot` | Fabrika Notu | Fabrika notu | Factory Note | Factory note |
| `factory.fabrikaNotPlaceholder` | Fabrika notu girin... | Fabrika notunu yaz… | Enter factory note... | Write a note for the factory… |
| `factory.cariOnayTarih` | Cari Onay Tarihi | Cari onay tarihi | Account Approval Date | Account approval date |
| `factory.bulkProductionTitle_one` | {{count}} siparişi üretime al | {{count}} sipariş üretime alınacak | Start production for {{count}} order | Start production for {{count}} order |
| `factory.bulkProductionTitle_other` | {{count}} siparişi üretime al | {{count}} sipariş üretime alınacak | Start production for {{count}} orders | Start production for {{count}} orders |
| `factory.description` | Planlamadaki siparişleri üretime alın, biten üretimleri Hazır yapın. Birden çok satırı seçip toplu işlem yapabilirsiniz. | Planlamadaki siparişleri üretime al, bitenleri Hazır yap. Birden çok satır seçip hepsine birden uygulayabilirsin. | Move planned orders into production and mark finished ones Ready. Select several rows for bulk actions. | Start production for planned orders and mark finished ones Ready. Select several rows to do them all at once. |
| `factory.uretimTarihiHint` | Yerel saat; varsayılan şimdi. | Yerel saat; boş bırakırsan şimdiki zaman. | Local time; defaults to now. | Local time; leave empty for now. |

</details>

## 2. Ekran / Konum: Fabrika / Üretim · bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Hazır yapıldı. · Üretime alınamadı. · Üretime alındı. · Hazır yapılamadı.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Marked as ready. · Couldn't start production. · Production started. · Couldn't mark as ready.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `factory.toast.markedReady` | Hazır olarak işaretlendi | Hazır yapıldı. | Marked as ready | Marked as ready. |
| `factory.toast.moveFailed` | Üretime alınamadı | Üretime alınamadı. | Could not start production | Couldn't start production. |
| `factory.toast.movedToProduction` | Üretime alındı | Üretime alındı. | Moved to production | Production started. |
| `factory.toast.readyFailed` | Hazır yapılamadı | Hazır yapılamadı. | Could not mark as ready | Couldn't mark as ready. |

</details>

## 3. Ekran / Konum: Lojistik · Sevkiyata Hazır ve ortak alanlar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Lojistik · Sevkiyata Hazır · Lojistik · Sevkiyat Geçmişi · Lojistik · Nakliye Firmaları · Nakliye firması *
- İçerik / Açıklama: Taşıma türü * · Anlaşılan nakliye ücreti · Sevkiyat tarihi · Lojistik notu · Sevkiyatı Başlat · Onaylanan teklif · Sevkiyatlarda kullanılan nakliye firmaları ve taşıma türleri. · Nakliye firmaları …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Logistics · Ready to Ship · Logistics · Shipment History · Logistics · Carriers · Carrier *
- Content / Description: Transport mode * · Agreed shipping price · Ship date · Logistics note · Ship · Approved quote · Carriers and transport modes used in shipments. · Carriers …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logistics.readyTitle` | Lojistik · Hazır | Lojistik · Sevkiyata Hazır | Logistics · Ready | Logistics · Ready to Ship |
| `logistics.historyTitle` | Lojistik · Geçmiş | Lojistik · Sevkiyat Geçmişi | Logistics · History | Logistics · Shipment History |
| `logistics.carriersTitle` | Lojistik · Taşıyıcılar | Lojistik · Nakliye Firmaları | Logistics · Carriers | Logistics · Carriers |
| `logistics.carrierLabel` | Taşıyıcı / Firma * | Nakliye firması * | Carrier / Firm * | Carrier * |
| `logistics.transportType` | Taşıma Türü * | Taşıma türü * | Transport Type * | Transport mode * |
| `logistics.agreedAmount` | Anlaşılan Tutar (taşıyıcı) | Anlaşılan nakliye ücreti | Agreed Amount (carrier) | Agreed shipping price |
| `logistics.shipDate` | Sevkiyat Tarihi | Sevkiyat tarihi | Shipment Date | Ship date |
| `logistics.note` | Lojistik Notu | Lojistik notu | Logistics Note | Logistics note |
| `logistics.ship` | Sevk et | Sevkiyatı Başlat | Ship | Ship |
| `logistics.approvedOffer` | Onaylı teklif | Onaylanan teklif | Approved offer | Approved quote |
| `logistics.carriersDescription` | Sevk kayıtlarında geçen taşıyıcılar ve taşıma türleri. | Sevkiyatlarda kullanılan nakliye firmaları ve taşıma türleri. | Carriers and transport types used in shipments. | Carriers and transport modes used in shipments. |
| `logistics.carriersList` | Taşıyıcılar | Nakliye firmaları | Carriers | Carriers |
| `logistics.prefilledFromOffer` | Form onaylı lojistik teklifinden dolduruldu; gerekirse değiştirin. | Form onaylanan nakliye teklifiyle dolduruldu; gerekirse değiştir. | Prefilled from the approved logistics offer; change if needed. | Filled in from the approved shipping quote; change it if needed. |
| `logistics.preparingHint` | Sipariş üretimde; Hazır olunca sevk talebi açılabilir. | Sipariş üretimde; Hazır olunca sevkiyat talebi açabilirsin. | Order is in production; a shipment can be requested once it is Ready. | The order is in production; you can request shipment once it's Ready. |
| `logistics.readyDescription` | Sevke hazır siparişler üstte. Sevkiyat oluşturulunca sipariş yola çıkmış sayılır. | Sevkiyata hazır siparişler en üstte. Sevkiyatı oluşturunca sipariş yolda sayılır. | Orders ready to ship are on top. Once a shipment is created, the order counts as in transit. | Orders ready to ship are on top. Once you create the shipment, the order counts as on its way. |
| `logistics.zeroPriceHint` | Anlaşma tutarı 0 — doğru mu? | Nakliye ücreti 0, doğru mu? | Agreed amount is 0 — is that correct? | Shipping price is 0. Is that right? |

</details>

## 4. Ekran / Konum: Lojistik · ödeme kolonu

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Peşin · Vadeli (%{{pesinYuzde}} peşinat)

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Paid in advance · Pay later ({{pesinYuzde}}% down)

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logistics.payment.pesin` | Peşin | Peşin | Upfront | Paid in advance |
| `logistics.payment.vadeli` | Vadeli (%{{pesinYuzde}} peşin) | Vadeli (%{{pesinYuzde}} peşinat) | Installments ({{pesinYuzde}}% upfront) | Pay later ({{pesinYuzde}}% down) |

</details>

## 5. Ekran / Konum: Lojistik · nakliye firması seçimi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Nakliye firması seç · Firma adını yaz · Kayıtlı firmayı seç ya da yeni ad yaz

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Choose a carrier · Type the carrier name · Choose a saved carrier or type a new name

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logistics.carrier.select` | Firma seç | Nakliye firması seç | Select carrier | Choose a carrier |
| `logistics.carrier.otherPlaceholder` | Firma adı yazın | Firma adını yaz | Type carrier name | Type the carrier name |
| `logistics.carrier.pickOrType` | Kayıtlı firmayı seçin veya yeni ad yazın | Kayıtlı firmayı seç ya da yeni ad yaz | Pick a saved carrier or type a new name | Choose a saved carrier or type a new name |

</details>

## 6. Ekran / Konum: Lojistik · taşıma türü seçimi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Taşıma türü seç

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Choose transport mode

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logistics.cesit.select` | Taşıma türü seç | Taşıma türü seç | Select transport type | Choose transport mode |

</details>

## 7. Ekran / Konum: Lojistik · nakliye anlaşması

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Nakliye anlaşması
- İçerik / Açıklama: Nakliye firması · Taşıma türü · Anlaşılan ücret · Anlaşma notu

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Shipping agreement
- Content / Description: Carrier · Transport mode · Agreed price · Agreement note

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logistics.agreement.title` | Taşıyıcı Anlaşması | Nakliye anlaşması | Carrier Agreement | Shipping agreement |
| `logistics.agreement.firm` | Taşıyıcı | Nakliye firması | Carrier | Carrier |
| `logistics.agreement.type` | Taşıma Türü | Taşıma türü | Transport Type | Transport mode |
| `logistics.agreement.amount` | Anlaşılan Tutar | Anlaşılan ücret | Agreed Amount | Agreed price |
| `logistics.agreement.note` | Anlaşma Notu | Anlaşma notu | Agreement Note | Agreement note |

</details>

## 8. Ekran / Konum: Lojistik · bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Sevkiyat oluşturuldu, sipariş yolda. · İşlem yapılamadı. Tekrar dene. · Sevkiyat tamamlandı. · Sevkiyat iptal edildi.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Shipment created. The order is on its way. · That didn't work. Try again. · Shipment completed. · Shipment cancelled.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logistics.toast.created` | Sevkiyat oluşturuldu — sipariş yolda. | Sevkiyat oluşturuldu, sipariş yolda. | Shipment created — the order is in transit. | Shipment created. The order is on its way. |
| `logistics.toast.error` | İşlem başarısız | İşlem yapılamadı. Tekrar dene. | Operation failed | That didn't work. Try again. |
| `logistics.toast.completed` | Sevkiyat tamamlandı | Sevkiyat tamamlandı. | Shipment completed | Shipment completed. |
| `logistics.toast.cancelled` | Sevkiyat iptal edildi | Sevkiyat iptal edildi. | Shipment cancelled | Shipment cancelled. |

</details>

## 9. Ekran / Konum: Lojistik · Sevkiyat Geçmişi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Nakliye firması · Giren · Neden iptal ediyorsun? · Firma adı · Sevkiyat No

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Carrier · Entered by · Why are you cancelling it? · Carrier name · Shipment No

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logistics.history.firma` | Firma | Nakliye firması | Carrier | Carrier |
| `logistics.history.operator` | Operatör | Giren | Operator | Entered by |
| `logistics.history.cancelPrompt` | İptal gerekçesi: | Neden iptal ediyorsun? | Cancellation reason: | Why are you cancelling it? |
| `logistics.history.firmaPlaceholder` | Firma Adı | Firma adı | Carrier name | Carrier name |
| `logistics.history.shipmentId` | Sevk No | Sevkiyat No | Shipment No | Shipment No |

</details>

## 10. Ekran / Konum: Lojistik · Nakliye Teklifleri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Lojistik · Nakliye Teklifleri · Yeni nakliye teklifi · Onaylanan nakliye teklifi · Teklifi Reddet
- İçerik / Açıklama: Nakliye teklifi bekleyen sipariş yok. · Onaylanan teklif yok · {{n}} teklif · Teklif Gönder · Nakliye firması · Taşıma türü · Döviz · Onayı Geri Al …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Logistics · Shipping Quotes · New shipping quote · Approved shipping quote · Reject Quote
- Content / Description: No orders waiting for a shipping quote. · No approved quote · {{n}} quotes · Send Quote · Carrier · Transport mode · Currency · Undo Approval …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logisticsOffer.title` | Lojistik · Teklif | Lojistik · Nakliye Teklifleri | Logistics · Offers | Logistics · Shipping Quotes |
| `logisticsOffer.queueEmpty` | Teklif bekleyen sipariş yok. | Nakliye teklifi bekleyen sipariş yok. | No orders awaiting offers. | No orders waiting for a shipping quote. |
| `logisticsOffer.noApproved` | Onaylı teklif yok | Onaylanan teklif yok | No approved offer | No approved quote |
| `logisticsOffer.count` | {{n}} teklif | {{n}} teklif | {{n}} offers | {{n}} quotes |
| `logisticsOffer.addTitle` | Yeni Teklif | Yeni nakliye teklifi | New Offer | New shipping quote |
| `logisticsOffer.approvedTitle` | Onaylı Lojistik Teklif | Onaylanan nakliye teklifi | Approved Logistics Offer | Approved shipping quote |
| `logisticsOffer.sendOffer` | Teklif Gönder | Teklif Gönder | Send Offer | Send Quote |
| `logisticsOffer.firma` | Firma | Nakliye firması | Carrier | Carrier |
| `logisticsOffer.cesit` | Taşıma Türü | Taşıma türü | Transport Type | Transport mode |
| `logisticsOffer.paraBirimi` | Para Birimi | Döviz | Currency | Currency |
| `logisticsOffer.revoke` | Onayı İptal Et | Onayı Geri Al | Revoke Approval | Undo Approval |
| `logisticsOffer.rejectTitle` | Teklifi Reddet | Teklifi Reddet | Reject Offer | Reject Quote |
| `logisticsOffer.rejectReason` | Red Açıklaması | Red sebebi | Rejection Reason | Reason for rejection |
| `logisticsOffer.rejectedReason` | Red açıklaması | Red sebebi | Rejection reason | Reason for rejection |
| `logisticsOffer.approved` | Onaylı | Onaylandı | Approved | Approved |
| `logisticsOffer.empty` | Henüz teklif girilmedi. | Henüz teklif yok. | No offers entered yet. | No quotes yet. |
| `logisticsOffer.revokeConfirm` | Teklif onayı geri alınsın mı? | Teklifin onayı geri alınsın mı? | Revoke the offer approval? | Undo the approval for this quote? |

</details>

## 11. Ekran / Konum: Lojistik · Nakliye Teklifleri · bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Teklif kaydedildi. · Teklif onaylandı. · Onay geri alındı. · Teklif reddedildi. · İşlem yapılamadı. Tekrar dene.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Quote saved. · Quote approved. · Approval undone. · Quote rejected. · That didn't work. Try again.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logisticsOffer.toast.submitted` | Teklif kaydedildi. | Teklif kaydedildi. | Offer saved. | Quote saved. |
| `logisticsOffer.toast.approved` | Teklif onaylandı. | Teklif onaylandı. | Offer approved. | Quote approved. |
| `logisticsOffer.toast.revoked` | Onay iptal edildi. | Onay geri alındı. | Approval revoked. | Approval undone. |
| `logisticsOffer.toast.rejected` | Teklif reddedildi. | Teklif reddedildi. | Offer rejected. | Quote rejected. |
| `logisticsOffer.toast.error` | İşlem başarısız. | İşlem yapılamadı. Tekrar dene. | Operation failed. | That didn't work. Try again. |

</details>

## 12. Ekran / Konum: Sevkiyat onayı pencereleri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sevkiyatı Onayla — #{{id}} · Sevkiyatı Reddet — #{{id}}
- İçerik / Açıklama: Sevkiyat # · Nakliye firması · Sevkiyat tarihi · Onay notu · (isteğe bağlı) · Red sebebi * · Reddedersen sevkiyat kaydı silinir, sipariş Hazır'da kalır.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Approve Shipment — #{{id}} · Reject Shipment — #{{id}}
- Content / Description: Shipment # · Carrier · Ship date · Approval note · (optional) · Reason for rejection * · If you reject it, the shipment is deleted and the order stays Ready.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logApprovals.sevkId` | Sevk # | Sevkiyat # | Shipment # | Shipment # |
| `logApprovals.tasiyici` | Taşıyıcı | Nakliye firması | Carrier | Carrier |
| `logApprovals.sevkTarihi` | Sevk Tarihi | Sevkiyat tarihi | Ship Date | Ship date |
| `logApprovals.approveTitle` | Sevki Onayla — #{{id}} | Sevkiyatı Onayla — #{{id}} | Approve Shipment — #{{id}} | Approve Shipment — #{{id}} |
| `logApprovals.rejectTitle` | Sevki Reddet — #{{id}} | Sevkiyatı Reddet — #{{id}} | Reject Shipment — #{{id}} | Reject Shipment — #{{id}} |
| `logApprovals.onayAciklama` | Onay Açıklaması | Onay notu | Approval Note | Approval note |
| `logApprovals.optional` | (opsiyonel) | (isteğe bağlı) | (optional) | (optional) |
| `logApprovals.redGerekce` | Red Gerekçesi * | Red sebebi * | Rejection Reason * | Reason for rejection * |
| `logApprovals.rejectHint` | Red sonrası LojistikTablo'daki sevk satırı silinir, sipariş "Hazır"da kalır. | Reddedersen sevkiyat kaydı silinir, sipariş Hazır'da kalır. | After rejection the shipment row is deleted and the order stays 'Ready'. | If you reject it, the shipment is deleted and the order stays Ready. |

</details>

## 13. Ekran / Konum: Sevkiyat onayı · bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Sevkiyat onaylandı. · Onaylanamadı. · Sevkiyat reddedildi. · Reddedilemedi.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Shipment approved. · Couldn't approve. · Shipment rejected. · Couldn't reject.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `logApprovals.toast.approved` | Sevk onaylandı | Sevkiyat onaylandı. | Shipment approved | Shipment approved. |
| `logApprovals.toast.approveFailed` | Onay başarısız | Onaylanamadı. | Approval failed | Couldn't approve. |
| `logApprovals.toast.rejected` | Sevk reddedildi | Sevkiyat reddedildi. | Shipment rejected | Shipment rejected. |
| `logApprovals.toast.rejectFailed` | Red başarısız | Reddedilemedi. | Rejection failed | Couldn't reject. |

</details>
