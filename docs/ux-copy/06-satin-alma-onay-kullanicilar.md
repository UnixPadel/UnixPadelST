# Modül 6 — Satın Alma, Onay ekranları, Kullanıcılar

## 1. Ekran / Konum: Satın Alma · yeni talep ve listeler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Satın Alma · Yeni Talep · Satın Alma · Taleplerim · Satın Alma · Tüm Talepler
- İçerik / Açıklama: Ürün adı · Ürün türü · Nereden alındı · Rolüne göre otomatik seçilir. · Döviz · Tüm kalemler bu dövizle hesaplanır. · Talebi Gönder · Gönderiliyor… …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Purchasing · New Request · Purchasing · My Requests · Purchasing · All Requests
- Content / Description: Product name · Product type · Bought from · Set automatically from your role. · Currency · All lines are calculated in this currency. · Send Request · Sending… …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.newTitle` | Satın Alma · Yeni Talep | Satın Alma · Yeni Talep | Purchase · New Request | Purchasing · New Request |
| `purchase.mineTitle` | Satın Alma · Taleplerim | Satın Alma · Taleplerim | Purchase · My Requests | Purchasing · My Requests |
| `purchase.allTitle` | Satın Alma · Tüm Talepler | Satın Alma · Tüm Talepler | Purchase · All Requests | Purchasing · All Requests |
| `purchase.urunAdi` | Ürün Adı | Ürün adı | Product Name | Product name |
| `purchase.urunTuru` | Ürün Türü | Ürün türü | Product Type | Product type |
| `purchase.alinanYer` | Alınan Yer | Nereden alındı | Source | Bought from |
| `purchase.departmanHint` | Rolünüzden otomatik atanır. | Rolüne göre otomatik seçilir. | Auto-assigned from your role. | Set automatically from your role. |
| `purchase.paraBirimi` | Para Birimi | Döviz | Currency | Currency |
| `purchase.paraBirimiHint` | Tüm kalemler bu para biriminde hesaplanır. | Tüm kalemler bu dövizle hesaplanır. | All line items are calculated in this currency. | All lines are calculated in this currency. |
| `purchase.create` | Talep Oluştur | Talebi Gönder | Create Request | Send Request |
| `purchase.creating` | Gönderiliyor... | Gönderiliyor… | Submitting... | Sending… |
| `purchase.createSuccess` | Talep oluşturuldu | Talep gönderildi. | Request created | Request sent. |
| `purchase.createError` | Hata | Talep gönderilemedi. | Error | Couldn't send the request. |
| `purchase.approvalFlowNote` | Talep "Bekliyor" durumunda kaydedilir, ön onay için omur.caliskan'a düşer. | Talep Bekliyor olarak kaydedilir ve onaya gider. | — | The request is saved as Waiting and goes for approval. |
| `purchase.overrideSuccess` | Talep onaylandı (tüm aşamalar atlandı). | Talep onaylandı (tüm adımlar atlandı). | Request approved (all stages skipped). | Request approved (all steps skipped). |
| `purchase.pager` | Toplam: {{total}} • Sayfa {{page}} | Toplam {{total}} · Sayfa {{page}} | Total: {{total}} • Page {{page}} | {{total}} total · Page {{page}} |
| `purchase.overrideConfirm` | Talep doğrudan onaylansın mı? | Talep adımları atlanarak doğrudan onaylansın mı? | Approve this request directly? | Approve this request directly, skipping the steps? |

</details>

## 2. Ekran / Konum: Satın Alma · dosya eki

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Ek dosya
- İçerik / Açıklama: Yükleniyor… · İşlem yapılamadı. Tekrar dene. · Dosya yok. · Dosya 25 MB'tan büyük. · Bu dosya türü yüklenemez. · Talep gönderildi ama dosya yüklenemedi. · Yükleyebileceklerin: png, jpg, jpeg, pdf, word, txt, excel, zip… (en fazla 25 MB) · Listeye dön

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Attachment
- Content / Description: Uploading… · That didn't work. Try again. · File not found. · The file is larger than 25 MB. · This file type isn't supported. · Request sent, but the file couldn't be uploaded. · You can upload: png, jpg, jpeg, pdf, word, txt, excel, zip… (up to 25 MB) · Back to list

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.attachment.title` | Ek Dosya | Ek dosya | Attachment | Attachment |
| `purchase.attachment.uploading` | Yükleniyor... | Yükleniyor… | Uploading... | Uploading… |
| `purchase.attachment.error` | İşlem başarısız. | İşlem yapılamadı. Tekrar dene. | Operation failed. | That didn't work. Try again. |
| `purchase.attachment.notFound` | Dosya bulunamadı. | Dosya yok. | File not found. | File not found. |
| `purchase.attachment.tooBig` | Dosya 25 MB sınırını aşıyor. | Dosya 25 MB'tan büyük. | File exceeds the 25 MB limit. | The file is larger than 25 MB. |
| `purchase.attachment.badType` | Desteklenmeyen dosya türü. | Bu dosya türü yüklenemez. | Unsupported file type. | This file type isn't supported. |
| `purchase.attachment.createButUploadFailed` | Talep oluşturuldu ama dosya yüklenemedi. | Talep gönderildi ama dosya yüklenemedi. | Request created but the file could not be uploaded. | Request sent, but the file couldn't be uploaded. |
| `purchase.attachment.hint` | İzin verilen: png, jpg, jpeg, pdf, word, txt, excel, zip… (≤25 MB) | Yükleyebileceklerin: png, jpg, jpeg, pdf, word, txt, excel, zip… (en fazla 25 MB) | Allowed: png, jpg, jpeg, pdf, word, txt, excel, zip… (≤25 MB) | You can upload: png, jpg, jpeg, pdf, word, txt, excel, zip… (up to 25 MB) |
| `purchase.attachment.done` | Listeye Dön | Listeye dön | Back to List | Back to list |

</details>

## 3. Ekran / Konum: Satın Alma · kalem tablosu

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Kalemler
- İçerik / Açıklama: Ürün adı · Diğer (yaz) · Fiyat girişi · Birim fiyat · İndirim türü · Ara toplam · Satır toplamı · Genel toplam …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Items
- Content / Description: Product name · Other (type it) · How to price · Unit price · Discount type · Subtotal · Line total · Grand total …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.lines.title` | Kalemler | Kalemler | Line Items | Items |
| `purchase.lines.urunAdi` | Ürün Adı | Ürün adı | Product Name | Product name |
| `purchase.lines.birimOther` | Diğer (yazınız) | Diğer (yaz) | Other (type) | Other (type it) |
| `purchase.lines.fiyatModu` | Fiyat Modu | Fiyat girişi | Pricing Mode | How to price |
| `purchase.lines.birimFiyat` | Birim Fiyat | Birim fiyat | Unit Price | Unit price |
| `purchase.lines.indirimTipi` | İndirim Tipi | İndirim türü | Discount Type | Discount type |
| `purchase.lines.araToplam` | Ara Toplam | Ara toplam | Subtotal | Subtotal |
| `purchase.lines.satirToplam` | Satır Toplamı | Satır toplamı | Line Total | Line total |
| `purchase.lines.genelToplam` | Genel Toplam | Genel toplam | Grand Total | Grand total |
| `purchase.lines.ekle` | Satır Ekle | Satır ekle | Add Row | Add row |
| `purchase.lines.enAzBir` | En az bir geçerli kalem girilmeli. | En az bir kalemi eksiksiz gir. | At least one valid line item is required. | Fill in at least one item completely. |

</details>

## 4. Ekran / Konum: Satın Alma · liste kolonları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: No · Nereden alındı · Talep eden · Tür
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: No. · Bought from · Requested by · Type
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.cols.id` | ID | No | ID | No. |
| `purchase.cols.alinanYer` | Alınan Yer | Nereden alındı | Source | Bought from |
| `purchase.cols.talepEden` | Talep Eden | Talep eden | Requested By | Requested by |
| `purchase.cols.tip` | Tip | Tür | Type | Type |

</details>

## 5. Ekran / Konum: Satın Alma · talep tipleri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Satın Alma
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Purchasing
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.tipLabel.SatinAlma` | Satın Alma | Satın Alma | Purchase | Purchasing |

</details>

## 6. Ekran / Konum: Satın Alma · aşamalar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Fabrika ön incelemesi · Son Onay
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Factory review · Final Approval
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.asamaLabel.fabrikaOnIzleme` | Fabrika / Ön İzleme | Fabrika ön incelemesi | Factory / Pre-Review | Factory review |
| `purchase.asamaLabel.nihaiOnay` | Nihai Onay | Son Onay | Final Approval | Final Approval |

</details>

## 7. Ekran / Konum: Satın Alma · Tüm Talepler filtresi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Talep eden · Tür · Başlangıç tarihi · Bitiş tarihi

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Requested by · Type · From · To

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.filter.talepEden` | Talep Eden | Talep eden | Requested By | Requested by |
| `purchase.filter.tip` | Tip | Tür | Type | Type |
| `purchase.filter.baslangic` | Başlangıç | Başlangıç tarihi | Start | From |
| `purchase.filter.bitis` | Bitiş | Bitiş tarihi | End | To |

</details>

## 8. Ekran / Konum: Satın Alma · red penceresi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Red sebebi *

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Reason for rejection *

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.reject.note` | Red Notu * | Red sebebi * | Rejection Note * | Reason for rejection * |

</details>

## 9. Ekran / Konum: Satın Alma · ön onay

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Ön Onay — #{{id}}
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Pre-approval — #{{id}}
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.pre.reviewTitle` | Ön Onay İnceleme — #{{id}} | Ön Onay — #{{id}} | Pre-Approval Review — #{{id}} | Pre-approval — #{{id}} |

</details>

## 10. Ekran / Konum: Onay · Ödeme Bilgileri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Ödeme Bilgileri (Muhasebe) · Ödeme Bilgileri — Talep #{{id}}
- İçerik / Açıklama: Ödeme Bilgisi Gir · Ödeme bilgileri · Ödeme türü * · Ödeme tarihi * · Ödeme bilgisi kaydedildi; talep son onaya geçti. · Seç · Ödeme türünü seç

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Payment Details (Accounting) · Payment Details — Request #{{id}}
- Content / Description: Enter Payment Details · Payment details · Payment type * · Payment date * · Payment details saved; the request moved to final approval. · Choose · Choose a payment type

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.payment.pageTitle` | Ödeme Detayı (Muhasebe) | Ödeme Bilgileri (Muhasebe) | Payment Details (Accounting) | Payment Details (Accounting) |
| `purchase.payment.dialogTitle` | Ödeme Detayı — Talep #{{id}} | Ödeme Bilgileri — Talep #{{id}} | Payment Details — Request #{{id}} | Payment Details — Request #{{id}} |
| `purchase.payment.enter` | Ödeme Detayı Gir | Ödeme Bilgisi Gir | Enter Payment Details | Enter Payment Details |
| `purchase.payment.heading` | Ödeme Detayı | Ödeme bilgileri | Payment Details | Payment details |
| `purchase.payment.odemeTuru` | Ödeme Türü * | Ödeme türü * | Payment Type * | Payment type * |
| `purchase.payment.islemTarihi` | İşlem Tarihi * | Ödeme tarihi * | Transaction Date * | Payment date * |
| `purchase.payment.saved` | Ödeme detayı kaydedildi (Muhasebe Tamamlandı) | Ödeme bilgisi kaydedildi; talep son onaya geçti. | Payment details saved (Accounting Done) | Payment details saved; the request moved to final approval. |
| `purchase.payment.selectPlaceholder` | Seçin | Seç | Select | Choose |
| `purchase.payment.typeRequired` | Ödeme türü seçin | Ödeme türünü seç | Select a payment type | Choose a payment type |

</details>

## 11. Ekran / Konum: Onay · Son Onay

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Talep — #{{id}}
- İçerik / Açıklama: İncele ve Onayla · Muhasebenin girdiği ödeme bilgileri (yalnız görüntüleme) · ⚠ Ödeme bilgisi henüz girilmedi. Satın alma talepleri için önce muhasebenin girmesi gerekiyor. · Onaylanamadı. · Önce ödeme bilgisi girilmeli · Ödeme bilgisi bekliyor

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Request — #{{id}}
- Content / Description: Review and Approve · Payment details from accounting (view only) · ⚠ Payment details aren't entered yet. For purchase requests, accounting needs to enter them first. · Couldn't approve. · Payment details are needed first · Waiting for payment details

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.final.reviewApprove` | İncele / Onayla | İncele ve Onayla | Review / Approve | Review and Approve |
| `purchase.final.reviewTitle` | Talep İnceleme — #{{id}} | Talep — #{{id}} | Request Review — #{{id}} | Request — #{{id}} |
| `purchase.final.muhasebeReadonly` | Muhasebe Ödeme Detayı (salt okunur) | Muhasebenin girdiği ödeme bilgileri (yalnız görüntüleme) | Accounting Payment Details (read-only) | Payment details from accounting (view only) |
| `purchase.final.noPayment` | ⚠ Ödeme detayı henüz girilmemiş (RULE 4: SatinAlma tipi için zorunlu). | ⚠ Ödeme bilgisi henüz girilmedi. Satın alma talepleri için önce muhasebenin girmesi gerekiyor. | ⚠ Payment details not entered yet (RULE 4: required for Purchase type). | ⚠ Payment details aren't entered yet. For purchase requests, accounting needs to enter them first. |
| `purchase.final.approveFailed` | Onay başarısız | Onaylanamadı. | Approval failed | Couldn't approve. |
| `purchase.final.ruleBlocked` | RULE 4: Ödeme detayı eksik | Önce ödeme bilgisi girilmeli | RULE 4: Payment details missing | Payment details are needed first |
| `purchase.final.needsPayment` | Ödeme bekleniyor | Ödeme bilgisi bekliyor | Awaiting payment | Waiting for payment details |

</details>

## 12. Ekran / Konum: Onay · Son Onay · talep ayrıntıları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Nereden alındı · Talep eden · Ön onay · Ödeme türü · Ödenen tutar · Ödeme tutarı · Vade · Vadeli tutar …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Bought from · Requested by · Pre-approval · Payment type · Amount paid · Payment amount · Payment term · Amount due later …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.final.fields.alinanYer` | Alınan Yer | Nereden alındı | Source | Bought from |
| `purchase.final.fields.talepEden` | Talep Eden | Talep eden | Requested By | Requested by |
| `purchase.final.fields.onOnay` | Ön Onay | Ön onay | Pre-Approval | Pre-approval |
| `purchase.final.fields.odemeTuru` | Ödeme Türü | Ödeme türü | Payment Type | Payment type |
| `purchase.final.fields.odenenTutar` | Ödenen Tutar | Ödenen tutar | Paid Amount | Amount paid |
| `purchase.final.fields.odemeTutari` | Ödeme Tutarı | Ödeme tutarı | Payment Amount | Payment amount |
| `purchase.final.fields.vadeSuresi` | Vade Süresi | Vade | Term Length | Payment term |
| `purchase.final.fields.vadeTutari` | Vade Tutarı | Vadeli tutar | Term Amount | Amount due later |
| `purchase.final.fields.vadeTarihi` | Vade Tarihi | Vade tarihi | Term Date | Due date |
| `purchase.final.fields.belgeNo` | Belge No | Belge no | Document No | Document no |
| `purchase.final.fields.bankaAdi` | Banka Adı | Banka | Bank Name | Bank |
| `purchase.final.fields.islemTarihi` | İşlem Tarihi | Ödeme tarihi | Transaction Date | Payment date |
| `purchase.final.fields.kartTipi` | Kart Tipi | Kart türü | Card Type | Card type |
| `purchase.final.fields.muhasebeYapan` | Muhasebe Yapan | Muhasebede giren | Processed By | Entered by (accounting) |
| `purchase.final.fields.muhasebeTarihi` | Muhasebe Tarihi | Muhasebe giriş tarihi | Processing Date | Entered on |

</details>

## 13. Ekran / Konum: Satın Alma · talep detay paneli

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Talep eden · Ön onaylayan

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Requested by · Pre-approved by

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `purchase.detailPanel.talepEden` | Talep Eden | Talep eden | Requested By | Requested by |
| `purchase.detailPanel.onOnaylayan` | Ön Onaylayan | Ön onaylayan | Pre-Approver | Pre-approved by |

</details>

## 14. Ekran / Konum: Onay ekranları · başlıklar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Onay · Ön Onay · Onay · Ödeme Bilgileri · Onay · Son Onay
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Approval · Pre-approval · Approval · Payment Details · Approval · Final Approval
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `approval.preTitle` | Onay · Ön Onay | Onay · Ön Onay | Approval · Pre-Approval | Approval · Pre-approval |
| `approval.paymentTitle` | Onay · Ödeme Detayı | Onay · Ödeme Bilgileri | Approval · Payment Details | Approval · Payment Details |
| `approval.finalTitle` | Onay · Nihai Onay | Onay · Son Onay | Approval · Final Approval | Approval · Final Approval |

</details>

## 15. Ekran / Konum: Kullanıcılar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Kullanıcıları ekle, düzenle, şifre değiştir
- İçerik / Açıklama: Kullanıcı eklendi. · Kullanıcı güncellendi. · Kullanıcı silindi. · Şifre değiştirildi. · Bu kullanıcı silinsin mi? · Pasif kullanıcıları göster · Rol

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Add and edit users, change passwords
- Content / Description: User added. · User updated. · User deleted. · Password changed. · Delete this user? · Show inactive users · Role

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `users.subtitle` | Kullanıcı yönetimi | Kullanıcıları ekle, düzenle, şifre değiştir | User management | Add and edit users, change passwords |
| `users.createSuccess` | Kullanıcı eklendi | Kullanıcı eklendi. | User created | User added. |
| `users.updateSuccess` | Kullanıcı güncellendi | Kullanıcı güncellendi. | User updated | User updated. |
| `users.deleteSuccess` | Kullanıcı silindi | Kullanıcı silindi. | User deleted | User deleted. |
| `users.passwordChanged` | Şifre değiştirildi | Şifre değiştirildi. | Password changed | Password changed. |
| `users.deleteConfirm` | Bu kullanıcıyı silmek istediğinize emin misiniz? | Bu kullanıcı silinsin mi? | Are you sure you want to delete this user? | Delete this user? |
| `users.showPassive` | Pasif Kullanıcıları Göster | Pasif kullanıcıları göster | Show passive | Show inactive users |
| `users.yetkiTuru` | Yetki Türü | Rol | Role | Role |

</details>

## 16. Ekran / Konum: Kullanıcılar · kolonlar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Kullanıcı adı · Rol
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Username · Role
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `users.columns.kullaniciAdi` | Kullanıcı Adı | Kullanıcı adı | Username | Username |
| `users.columns.yetki` | Yetki | Rol | Role | Role |

</details>
