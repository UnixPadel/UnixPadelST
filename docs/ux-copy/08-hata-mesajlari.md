# Modül 8 — Sunucudan gelen hata mesajları (TR + EN)

Önceden sunucu mesajları yalnız Türkçeydi ve bazıları İngilizce kalmıştı (ör. "'Order' with key 'X' was not found.", "FabrikaNot cannot be empty."). Artık her mesajın bir kodu var; uygulama kodu kullanıcının dilinde gösteriyor, sunucunun Türkçe metni yalnız yedek. Teknik satırlar (correlationId) bildirimde görünmüyor.

## 1. Ekran / Konum: Hata bildirimleri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Bunu yapmaya yetkin yok. · {{entity}} bulunamadı ({{key}}). · Bazı alanlar hatalı. · Oturumun geçersiz. Tekrar giriş yap. · Dosya boş. · Dosya 25 MB'tan büyük. · Bu dosya türü yüklenemez. · Ek dosya yok. …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: You don't have permission to do this. · {{entity}} not found ({{key}}). · Some fields need fixing. · Your session isn't valid. Sign in again. · The file is empty. · The file is larger than 25 MB. · This file type isn't supported. · No attachment found. …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `apiErrors.unauthorized` | — | Bunu yapmaya yetkin yok. | — | You don't have permission to do this. |
| `apiErrors.notFound` | — | {{entity}} bulunamadı ({{key}}). | — | {{entity}} not found ({{key}}). |
| `apiErrors.validationFailed` | — | Bazı alanlar hatalı. | — | Some fields need fixing. |
| `apiErrors.sessionInvalid` | — | Oturumun geçersiz. Tekrar giriş yap. | — | Your session isn't valid. Sign in again. |
| `apiErrors.fileEmpty` | — | Dosya boş. | — | The file is empty. |
| `apiErrors.fileTooLarge` | — | Dosya 25 MB'tan büyük. | — | The file is larger than 25 MB. |
| `apiErrors.unsupportedFileType` | — | Bu dosya türü yüklenemez. | — | This file type isn't supported. |
| `apiErrors.attachmentNotFound` | — | Ek dosya yok. | — | No attachment found. |
| `apiErrors.cancelReasonTooLong` | — | İptal sebebi en fazla 500 karakter olabilir. | — | The reason can be at most 500 characters. |
| `apiErrors.paymentAlreadyVoided` | — | Bu tahsilat zaten iptal edilmiş. | — | This payment is already void. |
| `apiErrors.amountMustBePositive` | — | Tutar 0'dan büyük olmalı. | — | The amount must be more than 0. |
| `apiErrors.costNegative` | — | Maliyet 0'dan küçük olamaz. | — | Cost can't be below 0. |
| `apiErrors.downPaymentNegative` | — | Peşinat eksi olamaz. | — | The down payment can't be negative. |
| `apiErrors.reviewNotApproved` | — | Sipariş henüz Sipariş Kontrolü'nden onay almadı. | — | This order hasn't been approved in Order Review yet. |
| `apiErrors.accountApprovalWrongStage` | — | Sipariş şu an {{stage}} aşamasında. Cari onay yalnız Sipariş aşamasında verilebilir. | — | The order is at the {{stage}} stage. Account approval is only for orders at the Order stage. |
| `apiErrors.logisticsApprovalWrongStage` | — | Sipariş şu an {{stage}} aşamasında. Lojistik onayı yalnız Hazır aşamasında verilebilir. | — | The order is at the {{stage}} stage. Logistics approval is only for Ready orders. |
| `apiErrors.finalCostNegative` | — | Son maliyet 0'dan küçük olamaz. | — | The final cost can't be below 0. |
| `apiErrors.closeWrongStage` | — | Sipariş şu an {{stage}} aşamasında. Yalnız kapanış bekleyen sipariş kapatılabilir. | — | The order is at the {{stage}} stage. Only orders waiting to close can be closed. |
| `apiErrors.closeNotPending` | — | {{no}} kapanış beklemiyor, kapatılamaz. | — | {{no}} isn't waiting to close, so it can't be closed. |
| `apiErrors.extraCostLockedAdd` | — | Bu aşamada ek maliyet eklenemez (yalnız cari ya da lojistik onayı sırasında). | — | Extra costs can't be added at this stage (only during account or logistics approval). |
| `apiErrors.descriptionRequired` | — | Açıklama gerekli. | — | A description is needed. |
| `apiErrors.extraCostLockedDelete` | — | Bu aşamada ek maliyet silinemez (yalnız cari ya da lojistik onayı sırasında). | — | Extra costs can't be deleted at this stage (only during account or logistics approval). |
| `apiErrors.invalidCredentials` | — | Kullanıcı adı veya şifre hatalı. | — | Wrong username or password. |
| `apiErrors.accountInactive` | — | Hesabın pasif. Yöneticine sor. | — | Your account is inactive. Ask your manager. |
| `apiErrors.userNotFound` | — | Kullanıcı bulunamadı. | — | User not found. |
| `apiErrors.factoryNoteRequired` | — | Fabrika notu gerekli. | — | A factory note is needed. |
| `apiErrors.notInPlanning` | — | {{no}} Planlama aşamasında değil ({{stage}}), üretime alınamaz. | — | {{no}} isn't in Planning ({{stage}}), so production can't start. |
| `apiErrors.notInProduction` | — | {{no}} Üretim aşamasında değil, Hazır yapılamaz. | — | {{no}} isn't in Production, so it can't be marked Ready. |
| `apiErrors.notReadyToShip` | — | {{no}} Hazır aşamasında değil, sevkiyat oluşturulamaz. | — | {{no}} isn't Ready, so it can't be shipped. |
| `apiErrors.waitingLogisticsApproval` | — | {{no}} için muhasebenin lojistik onayı (2. peşinat) bekleniyor, sevkiyat oluşturulamaz. | — | {{no}} is waiting for accounting's logistics approval (2nd down payment), so it can't be shipped yet. |
| `apiErrors.notReadyToShipDetail` | — | {{no}} sevkiyata hazır değil (kontrol: {{kontrol}}, lojistik onayı: {{lojistik}}). | — | {{no}} isn't ready to ship (review: {{kontrol}}, logistics approval: {{lojistik}}). |
| `apiErrors.shipmentStateChanged` | — | {{no}} bu sırada değişti, sevkiyat oluşturulamadı. Listeyi yenile. | — | {{no}} changed in the meantime, so the shipment wasn't created. Refresh the list. |
| `apiErrors.shipmentNotInLogistics` | — | {{no}} Lojistik aşamasında değil, tamamlanamaz. | — | {{no}} isn't in Logistics, so it can't be completed. |
| `apiErrors.cancelReasonRequired` | — | İptal sebebi gerekli. | — | A reason for cancelling is needed. |
| `apiErrors.carrierRequired` | — | Nakliye firması gerekli. | — | A carrier is needed. |
| `apiErrors.transportModeRequired` | — | Taşıma türü gerekli. | — | A transport mode is needed. |
| `apiErrors.notInShippingQuoteStage` | — | {{no}} nakliye teklifi aşamasında değil ({{stage}}). | — | {{no}} isn't at the shipping quote stage ({{stage}}). |
| `apiErrors.quoteNotApproved` | — | Teklif onaylı değil; geri alınacak onay yok. | — | The quote isn't approved, so there's nothing to undo. |
| `apiErrors.rejectReasonRequired` | — | Red sebebi gerekli. | — | A reason for rejecting is needed. |
| `apiErrors.customerExists` | — | Bu müşteri adı zaten var. | — | A customer with this name already exists. |
| `apiErrors.customerHasOrders` | — | Bu müşterinin sipariş ya da teklifleri var, silinemez. | — | This customer has orders or quotes, so it can't be deleted. |
| `apiErrors.countryExists` | — | Bu ülke zaten var. | — | This country already exists. |
| `apiErrors.orderAlreadyDeleted` | — | Bu sipariş zaten silinmiş. | — | This order is already deleted. |
| `apiErrors.approvedOrderLocked` | — | Onaylanan sipariş düzenlenemez ya da silinemez. | — | Approved orders can't be edited or deleted. |
| `apiErrors.editReasonRequired` | — | Değişiklik sebebi gerekli. | — | A reason for the change is needed. |
| `apiErrors.deleteReasonRequired` | — | Silme sebebi gerekli. | — | A reason for deleting is needed. |
| `apiErrors.onlyQuotesConvert` | — | Yalnız teklifler siparişe çevrilebilir. Şu anki aşama: {{stage}}. | — | Only quotes can become orders. Current stage: {{stage}}. |
| `apiErrors.approveNotAllowed` | — | Sipariş bulunamadı ya da zaten onaylı. | — | The order wasn't found or is already approved. |
| `apiErrors.rejectNotAllowed` | — | Reddedilemedi. Sipariş zaten onaylı olabilir ya da teklif/sipariş değil. | — | Couldn't reject. The order may already be approved, or it isn't a quote or order. |
| `apiErrors.invalidPaidAmount` | — | Geçerli bir ödenen tutar gir. | — | Enter a valid paid amount. |
| `apiErrors.stageRequired` | — | Aşama boş olamaz. | — | A stage is needed. |
| `apiErrors.qtyMin1` | — | Adet en az 1 olmalı. | — | Quantity must be at least 1. |
| `apiErrors.invalidAttachmentType` | — | Geçersiz ek türü: {{type}}. | — | Invalid attachment type: {{type}}. |
| `apiErrors.paymentDetailsExist` | — | #{{id}} talebinin ödeme bilgisi zaten girilmiş. | — | Payment details for request #{{id}} are already entered. |
| `apiErrors.invalidPaymentType` | — | Geçersiz ödeme türü: {{type}}. | — | Invalid payment type: {{type}}. |
| `apiErrors.negativeAmount` | — | Tutar eksi olamaz. | — | The amount can't be negative. |
| `apiErrors.paymentDetailsRequired` | — | Satın alma talepleri için önce muhasebenin ödeme bilgisini girmesi gerekiyor. | — | For purchase requests, accounting needs to enter the payment details first. |
| `apiErrors.rejectedCannotOverride` | — | Reddedilen talep doğrudan onaylanamaz; talep sahibi tekrar göndermeli. | — | A rejected request can't be approved directly; the requester needs to send it again. |
| `apiErrors.requestNotPendingApprove` | — | #{{id}} talebi onay beklemiyor, onaylanamaz. | — | Request #{{id}} isn't waiting for approval, so it can't be approved. |
| `apiErrors.requestNotPendingReject` | — | #{{id}} talebi onay beklemiyor, reddedilemez. | — | Request #{{id}} isn't waiting for approval, so it can't be rejected. |
| `apiErrors.requestWrongStatus` | — | #{{id}} talebi bu aşamada işlenemez (şu anki durum: {{status}}). | — | Request #{{id}} can't be handled at this step (current status: {{status}}). |
| `apiErrors.usernameExists` | — | Bu kullanıcı adı zaten var: {{username}}. | — | This username is already taken: {{username}}. |
| `apiErrors.unknownScreen` | — | Bilinmeyen ekran: {{screen}}. | — | Unknown screen: {{screen}}. |

</details>

## 2. Ekran / Konum: Hata bildirimleri · kayıt adları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Sipariş · Teklif · Kullanıcı · Müşteri · Tahsilat · Ek maliyet · Kategori · Parça …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Order · Quote · User · Customer · Payment · Extra cost · Category · Part …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `apiErrors.entities.order` | — | Sipariş | — | Order |
| `apiErrors.entities.quote` | — | Teklif | — | Quote |
| `apiErrors.entities.user` | — | Kullanıcı | — | User |
| `apiErrors.entities.customer` | — | Müşteri | — | Customer |
| `apiErrors.entities.payment` | — | Tahsilat | — | Payment |
| `apiErrors.entities.extraCost` | — | Ek maliyet | — | Extra cost |
| `apiErrors.entities.category` | — | Kategori | — | Category |
| `apiErrors.entities.part` | — | Parça | — | Part |
| `apiErrors.entities.option` | — | Özellik | — | Option |
| `apiErrors.entities.shipment` | — | Sevkiyat | — | Shipment |
| `apiErrors.entities.shippingQuote` | — | Nakliye teklifi | — | Shipping quote |
| `apiErrors.entities.purchaseRequest` | — | Satın alma talebi | — | Purchase request |
| `apiErrors.entities.record` | — | Kayıt | — | Record |

</details>

## Ek: Bağlantı hatası

| Anahtar | Yeni TR | Yeni EN |
|---|---|---|
| `apiErrors.network` | Sunucuya ulaşılamıyor. İnternet bağlantını kontrol et. | Can't reach the server. Check your internet connection. |
