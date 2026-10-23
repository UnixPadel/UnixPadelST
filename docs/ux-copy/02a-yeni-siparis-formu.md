# Modül 2a — Yeni Sipariş / Teklif formu

Terim kararları: Bileşen → Parça (Part), Öznitelik → Özellik (Option), Serbest/Özel kalem → Ek kalem (Extra item), Reçete → Parça listesi (Parts list), Kapora → Peşinat (Down payment), Para Tipi → Döviz (Currency), Montaj → Montaj (Installation).

## 1. Ekran / Konum: Yeni Sipariş / Teklif · başlık ve uyarılar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Yeni Sipariş / Teklif · Revize Et · Müşteriyi, ürünleri, teslimatı ve cari bilgileri doldur. Ctrl+S ile kontrol edip kaydet.
- İçerik / Açıklama: Revize ediyorsun · Kaydedince sipariş seçtiğin satış temsilcisine geçer. · Kaydedildi ama satış temsilcisi değiştirilemedi. · Excel indirildi. · Kaydedilmedi

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: New Order / Quote · Revise · Fill in the customer, products, delivery and account details. Press Ctrl+S to review and save.
- Content / Description: You're revising · When you save, the order moves to the sales rep you chose. · Saved, but the sales rep couldn't be changed. · Excel downloaded. · Not saved

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.newOrderTitle` | Sipariş/Teklif Oluştur | Yeni Sipariş / Teklif | Create Order / Quote | New Order / Quote |
| `orders.reviseTitle` | Revize | Revize Et | Revise | Revise |
| `orders.reviseBanner` | Revize ediliyor | Revize ediyorsun | Editing revision | You're revising |
| `orders.repReassignHint` | Güncellenince sipariş seçilen temsilciye atanır. | Kaydedince sipariş seçtiğin satış temsilcisine geçer. | On save the order is assigned to the selected representative. | When you save, the order moves to the sales rep you chose. |
| `orders.repReassignFailed` | Kayıt güncellendi ancak temsilci devri başarısız oldu. | Kaydedildi ama satış temsilcisi değiştirilemedi. | Saved, but representative reassignment failed. | Saved, but the sales rep couldn't be changed. |
| `orders.excelDownloaded` | Excel indirildi | Excel indirildi. | Excel downloaded | Excel downloaded. |
| `orders.subtitle` | Müşteri, ürün setleri, teslimat ve cari bilgilerini doldurun; Ctrl+S ile gözden geçirip kaydedin. | Müşteriyi, ürünleri, teslimatı ve cari bilgileri doldur. Ctrl+S ile kontrol edip kaydet. | Fill in customer, product sets, delivery and account details; press Ctrl+S to review and save. | Fill in the customer, products, delivery and account details. Press Ctrl+S to review and save. |
| `orders.unsavedBadge` | Kaydedilmedi | Kaydedilmedi | Unsaved | Not saved |

</details>

## 2. Ekran / Konum: Yeni Sipariş / Teklif · form alanları ve butonlar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Toplam fiyat · Parça adı · Ek kalem silinsin mi?
- İçerik / Açıklama: Müşteri adı · Vergi No · Posta kodu · Döviz · Peşinat % · Ödeme şekli · Sipariş notu · Parça listesinden ekle …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Total price · Part name · Delete extra item?
- Content / Description: Customer name · VAT No · ZIP code · Currency · Down payment % · Payment method · Order note · Add from parts list …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.form.musteriAd` | Müşteri Adı | Müşteri adı | Customer Name | Customer name |
| `orders.form.vat` | VAT | Vergi No | VAT | VAT No |
| `orders.form.zipCode` | Posta Kodu | Posta kodu | ZIP Code | ZIP code |
| `orders.form.paraTipi` | Para Tipi | Döviz | Currency | Currency |
| `orders.form.pesin` | Peşin % | Peşinat % | Deposit % | Down payment % |
| `orders.form.odemeSekli` | Ödeme Şekli | Ödeme şekli | Payment Method | Payment method |
| `orders.form.siparisNotu` | Sipariş Notu | Sipariş notu | Order Note | Order note |
| `orders.form.receteAc` | Reçeteden Aç | Parça listesinden ekle | Open from Recipe | Add from parts list |
| `orders.form.detailsHint` | Her satır ayrı bir not olarak kaydedilir. | Her satır ayrı not olarak kaydedilir. | Each line is saved as a separate note. | Each line is saved as its own note. |
| `orders.form.saveFirstHint` | Ek yüklemek için önce teklifi/siparişi kaydedin. | Ek yüklemek için önce kaydet. | Save the quote/order first to upload an attachment. | Save first to upload an attachment. |
| `orders.form.expandOrderHint` | Kalemleri sipariş kaydedildikten sonra "Reçeteden Aç" ile kategoriye dayalı olarak ekleyebilirsiniz. | Kaydettikten sonra "Parça listesinden ekle" ile kategoriye göre kalem ekleyebilirsin. | After saving the order, use "Open from Recipe" to add items based on category. | After saving, use "Add from parts list" to add items by category. |
| `orders.form.teslimAlanAdi` | Teslim Alan Adı | Teslim alan | Recipient Name | Recipient |
| `orders.form.ilgiliKisi` | İlgili Kişi | Yetkili kişi | Contact Person | Contact person |
| `orders.form.teslimatVar` | Teslimat Var? | Teslimat var mı? | Delivery? | Delivery? |
| `orders.form.teslimatFiyat` | Teslimat Fiyat | Teslimat fiyatı | Delivery Price | Delivery price |
| `orders.form.teslimatAdet` | Teslimat Adet | Teslimat adedi | Delivery Qty | Delivery qty |
| `orders.form.ekYuklendi` | Ek yüklendi | Ek yüklendi. | Attachment uploaded | Attachment uploaded. |
| `orders.form.ekYuklemeFailed` | Yükleme başarısız | Yüklenemedi. Tekrar dene. | Upload failed | Couldn't upload. Try again. |
| `orders.form.reviseMode` | Revize modu | Revize | Revise mode | Revision |
| `orders.form.saveFirst` | Önce sipariş/teklif kaydedin. | Önce kaydet. | Save the order/quote first. | Save first. |
| `orders.form.approvalHint` | kaydedildi. Onay akışı için "Siparişlerim" sayfasından "Onaya Gönder" butonu kullanılır. | kaydedildi. Onaya göndermek için Siparişlerim'de "Onaya Gönder"e bas. | saved. Use "Submit for Approval" from "My Orders" for the approval flow. | saved. To send it for approval, use "Send for Approval" in My Orders. |
| `orders.form.tab1` | 1. Üst Bilgi | 1. Genel bilgiler | 1. Header | 1. General |
| `orders.form.tab3` | 3. Teslimat Adresleri | 3. Teslimat adresleri | 3. Delivery Addresses | 3. Delivery addresses |
| `orders.form.tab4` | 4. Ek Dosyalar | 4. Ekler | 4. Attachments | 4. Attachments |
| `orders.form.multiAddressHint` | Birden fazla teslimat adresi yazılır; ilk adres üst-tabloya snapshot edilir. | Birden çok teslimat adresi girebilirsin; ilk adres siparişin adresi olur. | Multiple delivery addresses are stored; the first is snapshotted to the parent table. | You can add several delivery addresses; the first one becomes the order's address. |
| `orders.form.siparisOlusturuldu` | Sipariş oluşturuldu | Sipariş oluşturuldu. | Order created | Order created. |
| `orders.form.teklifOlusturuldu` | Teklif oluşturuldu | Teklif oluşturuldu. | Quote created | Quote created. |
| `orders.form.receteAcildi` | Reçete açıldı | Parça listesi eklendi. | Recipe expanded | Parts list added. |
| `orders.form.temsilciIsmi` | Temsilci İsmi | Satış temsilcisi | Representative Name | Sales rep |
| `orders.form.ekHint` | Ek'i yalnızca ZIP veya RAR formatında ekleyiniz | Yalnız ZIP ya da RAR dosyası ekleyebilirsin. | Attach only in ZIP or RAR format | You can only attach ZIP or RAR files. |
| `orders.form.standardTerms` | Standart Şartlar | Standart şartlar | Standard Terms | Standard terms |
| `orders.form.autoTerms` | Otomatik şartlar (teslimat / ödeme / montaj) | Otomatik şartlar (teslimat, ödeme, montaj) | Automatic terms (delivery / payment / installation) | Automatic terms (delivery, payment, installation) |
| `orders.form.toplamFiyatLabel` | Toplam Fiyat | Toplam fiyat | Total Price | Total price |
| `orders.form.kaporaMiktari` | Kapora Miktarı | Peşinat tutarı | Deposit Amount | Down payment |
| `orders.form.montaj` | Montaj | Montaj | Assembly | Installation |
| `orders.form.montajFiyat` | Montaj Fiyat | Montaj fiyatı | Assembly Price | Installation price |
| `orders.form.carp` | Çarp | Hesapla | Multiply | Calculate |
| `orders.form.ekstraMaliyet` | Ekstra Maliyet | Ek maliyet | Extra Cost | Extra cost |
| `orders.form.anaUrun` | Ana Ürün | Ana ürün | Main Product | Main product |
| `orders.form.tekilFiyatAdet` | Tekil Fiyat | Birim fiyat | Unit Price | Unit price |
| `orders.form.setFiyati` | Set Fiyatı | Set fiyatı | Set Price | Set price |
| `orders.form.bilesenlerYukleniyor` | Bileşenler yükleniyor… | Parçalar yükleniyor… | Loading components… | Loading parts… |
| `orders.form.anaUrunSecHint` | Ana ürün seçince bileşen listesi burada görünür. | Ana ürünü seçince parçaları burada görürsün. | Select a main product to see its components here. | Choose a main product to see its parts here. |
| `orders.form.oznitelik` | Öznitelik | Özellik | Attribute | Option |
| `orders.form.bilesenAdiLabel` | Bileşen Adı | Parça adı | Component Name | Part name |
| `orders.form.birimFiyat` | Birim Fiyat | Birim fiyat | Unit Price | Unit price |
| `orders.form.listedenSecin` | Listeden bileşen işaretleyin. | Listeden parça işaretle. | Check components from the list. | Tick parts in the list. |
| `orders.form.onceAnaUrun` | Önce Ana Ürün seçin. | Önce ana ürünü seç. | Select a main product first. | Choose a main product first. |
| `orders.form.iliskilendir` | İlişkilendir | Müşteri bilgilerini kopyala | Associate | Copy customer details |
| `orders.form.cesidi` | Çeşidi | Teslim şekli | Type | Delivery terms |
| `orders.form.altTelefon` | Alternatif Telefon | İkinci telefon | Alternate Phone | Other phone |
| `orders.form.formuGetir` | Referanstan Oluştur | Başka siparişten kopyala | Create from Reference | Copy from another order |
| `orders.form.teklifiHazirla` | Teklifi Hazırla | Teklif Olarak Kaydet | Prepare Quote | Save as Quote |
| `orders.form.siparisiHazirla` | Siparişi Hazırla | Sipariş Olarak Kaydet | Prepare Order | Save as Order |
| `orders.form.getirSearch` | Teklif No / Sipariş No / Müşteri adı ara… | Teklif no, sipariş no ya da müşteri ara… | Search quote no / order no / customer… | Search quote no, order no or customer… |
| `orders.form.onizlemeBaslik` | Sipariş Özeti | Sipariş özeti | Order Summary | Order summary |
| `orders.form.onizlemeAciklama` | Kaydetmeden önce siparişin nasıl oluştuğunu kontrol edin. | Kaydetmeden önce son bir kez kontrol et. | Review how the order looks before saving. | Take a last look before saving. |
| `orders.form.previewMusteri` | Müşteri Bilgileri | Müşteri | Customer Info | Customer |
| `orders.form.previewBosUrun` | Henüz ürün eklenmedi. | Henüz ürün yok. | No products added yet. | No products yet. |
| `orders.form.previewMontajTeslimat` | Montaj / Teslimat | Montaj ve teslimat | Assembly / Delivery | Installation and delivery |
| `orders.form.previewFiyat` | Fiyatlandırma | Fiyat | Pricing | Price |
| `orders.form.previewBrut` | Brüt Toplam | Ara toplam | Gross Total | Subtotal |
| `orders.form.ozelKalemEkle` | Özel Kalem Ekle | Ek Kalem Ekle | Add Custom Item | Add Extra Item |
| `orders.form.ozelKalemBaslik` | Serbest Metin Kalem | Ek kalem | Custom Line Item | Extra item |
| `orders.form.bilesenAdiPlaceholder` | Ürün/Hizmet adını girin | Ürün ya da hizmet adı | Enter product/service name | Product or service name |
| `orders.form.oznitelikPlaceholder` | Özellik (opsiyonel) | Özellik (isteğe bağlı) | Attribute (optional) | Option (optional) |
| `orders.form.birimSecin` | Birim seçin | Birim seç | Select unit | Choose unit |
| `orders.form.musteriHint` | Yazarak arayın; F4 ile detaylı liste. | Aramak için yaz; tam liste için F4. | Type to search; F4 for the full list. | Type to search; F4 for the full list. |
| `orders.form.ekSec` | Ek dosya seç (ZIP/RAR) | Dosya seç (ZIP/RAR) | Choose attachment (ZIP/RAR) | Choose file (ZIP/RAR) |
| `orders.form.formuGetirHint` | Seçtiğiniz kaydın içeriği YENİ bir teklif/sipariş olarak forma yüklenir. | Seçtiğin kaydın bilgileri YENİ bir teklif ya da sipariş olarak forma gelir. | The selected record is loaded into the form as a NEW quote/order. | The record you pick is copied into the form as a NEW quote or order. |
| `orders.form.setIncludedHint` | Ana ürünü seçili her set siparişe dahildir. | Ana ürünü seçili her set siparişe girer. | Every set with a main product is included in the order. | Every set with a main product is included in the order. |
| `orders.form.bilesenAra` | Bileşen ara… | Parça ara… | Search components… | Search parts… |
| `orders.form.infoOnlyHint` | Bileşen ve serbest kalem tutarları bilgi amaçlıdır; toplam fiyata set fiyatı × adet girer. | Parça ve ek kalem tutarları bilgi içindir; toplam fiyat set fiyatı × adetten hesaplanır. | Component and free item amounts are informational; the total uses set price × quantity. | Part and extra item amounts are for reference; the total is set price × quantity. |
| `orders.form.freeItemRemoveTitle` | Serbest kalem silinsin mi? | Ek kalem silinsin mi? | Delete free item? | Delete extra item? |
| `orders.form.extraCount_one` | {{count}} ekstra maliyet | {{count}} ek maliyet | {{count}} extra cost | {{count}} extra cost |
| `orders.form.extraCount_other` | {{count}} ekstra maliyet | {{count}} ek maliyet | {{count}} extra costs | {{count}} extra costs |
| `orders.form.carpHint` | Fiyat × miktar sonucu fiyat alanına yazılır, miktar 1'e döner. | Fiyat × miktarı fiyat alanına yazar, miktarı 1 yapar. | Writes price × quantity into the price field and resets quantity to 1. | Puts price × quantity into the price field and sets quantity to 1. |
| `orders.form.iliskilendirHint` | Müşteri bölümündeki adres ve iletişim bilgilerini teslimat alanlarına kopyalar. | Müşterinin adres ve iletişim bilgilerini teslimat alanlarına kopyalar. | Copies the customer's address and contact details into the delivery fields. | Copies the customer's address and contact details into the delivery fields. |
| `orders.form.freeNotePlaceholder` | Not yazıp Enter'a basın | Not yaz, Enter'a bas | Type a note and press Enter | Type a note and press Enter |

</details>

## 3. Ekran / Konum: Yeni Sipariş / Teklif · bölüm başlıkları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Satış Temsilcisi · Cari Bilgiler · Teslimat ve Montaj

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Sales Rep · Account Details · Delivery and Installation

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.sections.temsilci` | Temsilci | Satış Temsilcisi | Representative | Sales Rep |
| `orders.sections.cariBilgi` | Cari Bilgi | Cari Bilgiler | Account Info | Account Details |
| `orders.sections.teslimatMontaj` | Teslimat / Montaj | Teslimat ve Montaj | Delivery / Assembly | Delivery and Installation |

</details>

## 4. Ekran / Konum: Yeni Sipariş / Teklif · bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Sipariş oluşturuldu. · Teklif oluşturuldu. · Revize kaydedildi. · Form dolduruldu. · {{no}} kopyalandı; yeni kayıt olarak düzenleyebilirsin. · Form doldurulamadı. · Yüklenemedi. Tekrar dene. · Geçerli bir sayı gir. …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Order created. · Quote created. · Revision saved. · Form filled in. · {{no}} copied; edit it as a new record. · Couldn't fill in the form. · Couldn't upload. Try again. · Enter a valid number. …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.toast.created` | Sipariş oluşturuldu | Sipariş oluşturuldu. | Order created | Order created. |
| `orders.toast.quoteCreated` | Teklif oluşturuldu | Teklif oluşturuldu. | Quote created | Quote created. |
| `orders.toast.revised` | Revize edildi | Revize kaydedildi. | Revision saved | Revision saved. |
| `orders.toast.formLoaded` | Form yüklendi | Form dolduruldu. | Form loaded | Form filled in. |
| `orders.toast.formLoadedDesc` | {{no}} → yeni kayıt olarak düzenlenebilir | {{no}} kopyalandı; yeni kayıt olarak düzenleyebilirsin. | {{no}} → editable as a new record | {{no}} copied; edit it as a new record. |
| `orders.toast.formLoadFailed` | Form yüklenemedi | Form doldurulamadı. | Could not load form | Couldn't fill in the form. |
| `orders.toast.uploadFailed` | Yükleme başarısız | Yüklenemedi. Tekrar dene. | Upload failed | Couldn't upload. Try again. |
| `orders.toast.invalidNumber` | Lütfen geçerli bir sayı giriniz. | Geçerli bir sayı gir. | Please enter a valid number. | Enter a valid number. |
| `orders.toast.noFabrikaOption` | Fabrika seçeneği mevcut değil. | Fabrika seçeneği yok. | The 'Factory' option is not available. | There's no Factory option. |
| `orders.toast.amended` | Sipariş güncellendi | Sipariş güncellendi. | Order updated | Order updated. |
| `orders.toast.bilesenLoadFailed` | Bileşenler yüklenemedi | Parçalar yüklenemedi. | Could not load components | Couldn't load parts. |
| `orders.toast.exwApplied` | EXW: Fabrika teslimat adresi uygulandı, teslimat fiyatı 0 yapıldı. | EXW seçildi: teslimat adresi fabrika oldu, teslimat fiyatı 0. | EXW: factory delivery address applied, delivery price set to 0. | EXW chosen: delivery address set to the factory, delivery price 0. |

</details>

## 5. Ekran / Konum: Yeni Sipariş / Teklif · eksikler listesi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Müşteri adı eksik · En az bir set ya da ek kalem ekle · Peşinat % eksik · Düzenleme sebebi eksik

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Customer name is missing · Add at least one set or extra item · Down payment % is missing · Reason for the edit is missing

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.issues.musteriAd` | Müşteri adı girilmedi | Müşteri adı eksik | Customer name is missing | Customer name is missing |
| `orders.issues.lineItems` | En az bir set veya serbest kalem ekleyin | En az bir set ya da ek kalem ekle | Add at least one set or free item | Add at least one set or extra item |
| `orders.issues.pesinYuzde` | Peşin % girilmedi | Peşinat % eksik | Down payment % is missing | Down payment % is missing |
| `orders.issues.amendReason` | Düzenleme gerekçesi girilmedi | Düzenleme sebebi eksik | Edit reason is missing | Reason for the edit is missing |

</details>

## 6. Ekran / Konum: Yeni Sipariş / Teklif · sağdaki özet

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sipariş özeti
- İçerik / Açıklama: {{count}} ek kalem bilgi içindir, toplama girmez. · {{count}} ek kalem bilgi içindir, toplama girmez. · Eksikler (tıkla):

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Order summary
- Content / Description: {{count}} extra item is for reference and isn't in the total. · {{count}} extra items are for reference and aren't in the total. · Missing (click):

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.summary.title` | Sipariş Özeti | Sipariş özeti | Order Summary | Order summary |
| `orders.summary.freeItemsNote_one` | {{count}} serbest kalem bilgi amaçlıdır, toplama dahil değildir. | {{count}} ek kalem bilgi içindir, toplama girmez. | {{count}} free item is informational and not included in the total. | {{count}} extra item is for reference and isn't in the total. |
| `orders.summary.freeItemsNote_other` | {{count}} serbest kalem bilgi amaçlıdır, toplama dahil değildir. | {{count}} ek kalem bilgi içindir, toplama girmez. | {{count}} free items are informational and not included in the total. | {{count}} extra items are for reference and aren't in the total. |
| `orders.summary.missing` | Eksikler (tıklayın): | Eksikler (tıkla): | Missing (click): | Missing (click): |

</details>

## 7. Ekran / Konum: Yeni Sipariş / Teklif · taslak

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Kaydedilmemiş bir taslağın var ({{time}} · {{customer}}). · Taslağı aç · Taslak açıldı.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: You have an unsaved draft ({{time}} · {{customer}}). · Open draft · Draft opened.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.draft.found` | Kaydedilmemiş bir taslak var ({{time}} · {{customer}}). | Kaydedilmemiş bir taslağın var ({{time}} · {{customer}}). | An unsaved draft exists ({{time}} · {{customer}}). | You have an unsaved draft ({{time}} · {{customer}}). |
| `orders.draft.restore` | Taslağı yükle | Taslağı aç | Restore draft | Open draft |
| `orders.draft.restored` | Taslak yüklendi | Taslak açıldı. | Draft restored | Draft opened. |

</details>

## 8. Ekran / Konum: Yeni Sipariş / Teklif · kayıt sonrası

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Ek yükleyebilir, siparişi açabilir ya da yeni form başlatabilirsin.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: You can upload an attachment, open the order or start a new form.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.success.desc` | Ek yükleyebilir, detayı açabilir veya yeni bir form başlatabilirsiniz. | Ek yükleyebilir, siparişi açabilir ya da yeni form başlatabilirsin. | You can upload an attachment, open the details or start a new form. | You can upload an attachment, open the order or start a new form. |

</details>

## 9. Ekran / Konum: Yeni Sipariş / Teklif · onay pencereleri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Döviz değişsin mi? · Ek maliyet silinsin mi?
- İçerik / Açıklama: Girdiğin tüm fiyatlar güncel kurla {{from}}'dan {{to}}'ya çevrilecek. · Müşteri bölümündeki iletişim bilgileri "{{name}}" kaydıyla değişecek. · Bu sekmedeki {{count}} parça satırı ve yaptığın değişiklikler silinecek. · Bu sekmedeki {{count}} parça satırı ve yaptığın değişiklikler silinecek. · Teslimat bilgileri müşteri bilgileriyle değişecek. · Kaydetmediğin değişiklikler kaybolacak.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Change currency? · Delete extra cost?
- Content / Description: All prices you entered will be converted from {{from}} to {{to}} at today's rate. · Contact details in the customer section will be replaced with "{{name}}". · {{count}} part row and your changes on this tab will be removed. · {{count}} part rows and your changes on this tab will be removed. · Delivery details will be replaced with the customer's details. · Unsaved changes will be lost.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `orders.confirm.currencyTitle` | Para birimi değiştirilsin mi? | Döviz değişsin mi? | Change currency? | Change currency? |
| `orders.confirm.currencyDesc` | Girilen tüm fiyatlar {{from}} biriminden {{to}} birimine güncel kurla çevrilecek. | Girdiğin tüm fiyatlar güncel kurla {{from}}'dan {{to}}'ya çevrilecek. | All entered prices will be converted from {{from}} to {{to}} at the current rate. | All prices you entered will be converted from {{from}} to {{to}} at today's rate. |
| `orders.confirm.customerDesc` | Müşteri bölümündeki iletişim alanları "{{name}}" kaydıyla değiştirilecek. | Müşteri bölümündeki iletişim bilgileri "{{name}}" kaydıyla değişecek. | Contact fields in the customer section will be replaced with "{{name}}". | Contact details in the customer section will be replaced with "{{name}}". |
| `orders.confirm.categoryDesc_one` | Bu sekmedeki {{count}} bileşen satırı ve düzenlemeleri silinecek. | Bu sekmedeki {{count}} parça satırı ve yaptığın değişiklikler silinecek. | {{count}} component row and its edits on this tab will be removed. | {{count}} part row and your changes on this tab will be removed. |
| `orders.confirm.categoryDesc_other` | Bu sekmedeki {{count}} bileşen satırı ve düzenlemeleri silinecek. | Bu sekmedeki {{count}} parça satırı ve yaptığın değişiklikler silinecek. | {{count}} component rows and their edits on this tab will be removed. | {{count}} part rows and your changes on this tab will be removed. |
| `orders.confirm.deliveryDesc` | Teslimat alanları müşteri bilgileriyle değiştirilecek. | Teslimat bilgileri müşteri bilgileriyle değişecek. | Delivery fields will be replaced with the customer details. | Delivery details will be replaced with the customer's details. |
| `orders.confirm.extraRemoveTitle` | Ekstra maliyet silinsin mi? | Ek maliyet silinsin mi? | Delete extra cost? | Delete extra cost? |
| `orders.confirm.resetDesc` | Kaydedilmemiş değişiklikler kaybolacak. | Kaydetmediğin değişiklikler kaybolacak. | Unsaved changes will be lost. | Unsaved changes will be lost. |

</details>
