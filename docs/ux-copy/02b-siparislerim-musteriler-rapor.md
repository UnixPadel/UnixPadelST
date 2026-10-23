# Modül 2b — Siparişlerim, Müşteriler, Sipariş Ara, Satış Temsilcisi raporu

## 1. Ekran / Konum: Müşteriler · liste ve form

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Müşteriyi Düzenle
- İçerik / Açıklama: Ad, telefon, e-posta, vergi no, ülke… · "{{name}}" silinsin mi? Bu geri alınamaz.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Edit Customer
- Content / Description: Name, phone, email, VAT, country… · Delete "{{name}}"? This can't be undone.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `customers.editTitle` | Müşteri Düzenle | Müşteriyi Düzenle | Edit Customer | Edit Customer |
| `customers.searchPlaceholder` | Ad, telefon, e-posta, VAT, ülke... | Ad, telefon, e-posta, vergi no, ülke… | Name, phone, email, VAT, country... | Name, phone, email, VAT, country… |
| `customers.deleteConfirm` | "{{name}}" silinsin mi? Bu işlem geri alınamaz. | "{{name}}" silinsin mi? Bu geri alınamaz. | Delete "{{name}}"? This cannot be undone. | Delete "{{name}}"? This can't be undone. |

</details>

## 2. Ekran / Konum: Müşteriler · form alanları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Müşteri adı · Posta kodu · E-posta · Vergi No · Ülke adı · Telefon kodu

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Customer name · ZIP code · Email · VAT No · Country name · Dialing code

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `customers.fields.musteriAd` | Müşteri Adı | Müşteri adı | Customer Name | Customer name |
| `customers.fields.zipKod` | Posta Kodu | Posta kodu | ZIP Code | ZIP code |
| `customers.fields.email` | E-Posta | E-posta | Email | Email |
| `customers.fields.vat` | VAT Numarası | Vergi No | VAT Number | VAT No |
| `customers.fields.ulkeAdi` | Ülke Adı | Ülke adı | Country Name | Country name |
| `customers.fields.numaraBirimi` | Numara Birimi | Telefon kodu | Dialing Code | Dialing code |

</details>

## 3. Ekran / Konum: Müşteriler · bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Kaydedilemedi. Tekrar dene. · Ülke eklenemedi. · Müşteri silinemedi.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Couldn't save. Try again. · Couldn't add the country. · Couldn't delete the customer.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `customers.toast.saveFailed` | Kayıt başarısız. | Kaydedilemedi. Tekrar dene. | Save failed. | Couldn't save. Try again. |
| `customers.toast.ulkeFailed` | Ülke eklenemedi. | Ülke eklenemedi. | Could not add country. | Couldn't add the country. |
| `customers.toast.deleteFailed` | Müşteri silinemedi. | Müşteri silinemedi. | Could not delete customer. | Couldn't delete the customer. |

</details>

## 4. Ekran / Konum: Siparişlerim

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Red sebebi · Teklif siparişe çevrilsin mi?
- İçerik / Açıklama: Tümü · Kontrol durumu · Ödeme durumu · Neden siliyorsun? * · Siparişi düzenliyorsun (kaydetmek için sebep yazman gerek) · Neden değiştiriyorsun? * · Red sebebi yazılmamış. · Yeni Sipariş / Teklif

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Why it was rejected · Turn this quote into an order?
- Content / Description: All · Review status · Payment status · Why are you deleting it? * · You're editing the order (a reason is needed to save) · Why are you changing it? * · No reason was given. · New Order / Quote

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `myOrders.filter.all` | — Tümü — | Tümü | — All — | All |
| `myOrders.filter.kontrol` | Kontrol Durumu | Kontrol durumu | Control Status | Review status |
| `myOrders.filter.odeme` | Ödeme Durumu | Ödeme durumu | Payment Status | Payment status |
| `myOrders.delete.reason` | Silme gerekçesi * | Neden siliyorsun? * | Reason for deletion * | Why are you deleting it? * |
| `myOrders.amend.banner` | Sipariş düzenleniyor (kaydetmek için gerekçe zorunlu) | Siparişi düzenliyorsun (kaydetmek için sebep yazman gerek) | Editing order (a reason is required to save) | You're editing the order (a reason is needed to save) |
| `myOrders.amend.reason` | Değişiklik gerekçesi * | Neden değiştiriyorsun? * | Reason for change * | Why are you changing it? * |
| `myOrders.redNote.title` | Red Notu | Red sebebi | Rejection Note | Why it was rejected |
| `myOrders.redNote.empty` | Red notu bulunamadı. | Red sebebi yazılmamış. | No rejection note found. | No reason was given. |
| `myOrders.convertConfirm.title` | Teklif siparişe çevrilsin mi? | Teklif siparişe çevrilsin mi? | Convert quote to order? | Turn this quote into an order? |
| `myOrders.newOrder` | Yeni sipariş/teklif | Yeni Sipariş / Teklif | New order/quote | New Order / Quote |

</details>

## 5. Ekran / Konum: Siparişlerim · kolonlar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: No · Müşteri · Satış Temsilcisi · İşlem
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: No. · Customer · Sales Rep · Actions
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `myOrders.cols.numara` | Numara | No | Number | No. |
| `myOrders.cols.musteriAd` | Müşteri Adı | Müşteri | Customer Name | Customer |
| `myOrders.cols.temsilci` | Temsilci | Satış Temsilcisi | Representative | Sales Rep |
| `myOrders.cols.actions` | İşlemler | İşlem | Actions | Actions |

</details>

## 6. Ekran / Konum: Siparişlerim · satır butonları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Siparişi Aç · Siparişe Çevir · Red Sebebi · Revize Et
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Open Order · Turn into Order · Why Rejected · Revise
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `myOrders.actions.formGoster` | Form Göster | Siparişi Aç | Show Form | Open Order |
| `myOrders.actions.sipariseCevir` | Siparişe Çevir | Siparişe Çevir | Convert to Order | Turn into Order |
| `myOrders.actions.redNotu` | Red Notu | Red Sebebi | Rejection Note | Why Rejected |
| `myOrders.actions.revize` | Revize | Revize Et | Revise | Revise |

</details>

## 7. Ekran / Konum: Siparişlerim · pasif buton açıklamaları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Yalnız reddedilmemiş teklifler siparişe çevrilebilir. · Bu sipariş reddedilmedi, red sebebi yok. · Onaylanan kayıt revize edilemez. · Onaylanan sipariş artık düzenlenemez ya da silinemez.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Only quotes that weren't rejected can become orders. · This order wasn't rejected, so there's no reason to show. · Approved records can't be revised. · Approved orders can't be edited or deleted.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `myOrders.disabled.convert` | Yalnızca reddedilmemiş teklifler siparişe çevrilebilir. | Yalnız reddedilmemiş teklifler siparişe çevrilebilir. | Only non-rejected quotes can be converted to orders. | Only quotes that weren't rejected can become orders. |
| `myOrders.disabled.redNote` | Bu sipariş reddedilmediği için not gösterilemez. | Bu sipariş reddedilmedi, red sebebi yok. | This order was not rejected so no note is available. | This order wasn't rejected, so there's no reason to show. |
| `myOrders.disabled.revise` | Onaylı kayıtlar revize edilemez. | Onaylanan kayıt revize edilemez. | Approved records cannot be revised. | Approved records can't be revised. |
| `myOrders.disabled.editDelete` | Onaylanmış sipariş artık düzenlenemez veya silinemez. | Onaylanan sipariş artık düzenlenemez ya da silinemez. | Approved orders can no longer be edited or deleted. | Approved orders can't be edited or deleted. |

</details>

## 8. Ekran / Konum: Siparişlerim · bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Teklif siparişe çevrildi. · Siparişe çevrilemedi. · Silinemedi.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Quote turned into an order. · Couldn't turn it into an order. · Couldn't delete.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `myOrders.toast.converted` | Teklif siparişe çevrildi. | Teklif siparişe çevrildi. | Quote converted to order. | Quote turned into an order. |
| `myOrders.toast.convertFailed` | Çevirme başarısız. | Siparişe çevrilemedi. | Conversion failed. | Couldn't turn it into an order. |
| `myOrders.toast.deleteFailed` | Silme başarısız. | Silinemedi. | Delete failed. | Couldn't delete. |

</details>

## 9. Ekran / Konum: Sipariş Ara

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sipariş Ara · Sipariş ve teklifleri bul
- İçerik / Açıklama: Sipariş no, müşteri, ülke… · Sonuç yok

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Search Orders · Find orders and quotes
- Content / Description: Order no, customer, country… · No results

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `search.title` | Ara | Sipariş Ara | Search | Search Orders |
| `search.subtitle` | Sipariş ve teklif arama | Sipariş ve teklifleri bul | Order and quote search | Find orders and quotes |
| `search.placeholder` | Sipariş no, müşteri, ülke... | Sipariş no, müşteri, ülke… | Order no, customer, country... | Order no, customer, country… |
| `search.noResults` | Sonuç bulunamadı | Sonuç yok | No results found | No results |

</details>

## 10. Ekran / Konum: Rapor · Satış Temsilcileri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Satış Temsilcisi Performansı · Seçtiğin dönemde her satış temsilcisinin sayıları · Siparişe dönüşen %
- İçerik / Açıklama: Bu hafta · Bu ay · Bu dönemde veri yok.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Sales Rep Performance · Numbers for each sales rep in the period you pick · Conversion %
- Content / Description: This week · This month · No data for this period.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `reporting.repTitle` | Temsilci Performansı | Satış Temsilcisi Performansı | Representative Performance | Sales Rep Performance |
| `reporting.repSubtitle` | Seçili dönem için temsilci bazlı metrikler | Seçtiğin dönemde her satış temsilcisinin sayıları | Per-representative metrics for the selected period | Numbers for each sales rep in the period you pick |
| `reporting.period.week` | Bu Hafta | Bu hafta | This Week | This week |
| `reporting.period.month` | Bu Ay | Bu ay | This Month | This month |
| `reporting.cols.donusum` | Dönüşüm % | Siparişe dönüşen % | Conversion % | Conversion % |
| `reporting.empty` | Bu dönem için veri yok. | Bu dönemde veri yok. | No data for this period. | No data for this period. |

</details>

## 11. Ekran / Konum: Rapor · seçili satış temsilcisinin analizi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Ayrıntılar · Satış temsilcisi seç… · Ayrıntıları görmek için yukarıdan bir satış temsilcisi seç. · Teklifler · Satılan adet · Ülke sayısı · Siparişe dönüşen · Ortalama sipariş tutarı …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Details · Choose a sales rep… · Choose a sales rep above to see the details. · Quotes · Units sold · Countries · Conversion · Average order value …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `reporting.detail.analytics` | Analiz Panosu | Ayrıntılar | Analytics Dashboard | Details |
| `reporting.detail.selectRep` | Temsilci seçin… | Satış temsilcisi seç… | Select a representative… | Choose a sales rep… |
| `reporting.detail.selectHint` | Detaylı analiz için yukarıdan bir temsilci seçin. | Ayrıntıları görmek için yukarıdan bir satış temsilcisi seç. | Select a representative above to view detailed analytics. | Choose a sales rep above to see the details. |
| `reporting.detail.quotations` | Teklifler | Teklifler | Quotations | Quotes |
| `reporting.detail.quantity` | Satılan Adet | Satılan adet | Quantity Sold | Units sold |
| `reporting.detail.countries` | Ülke Sayısı | Ülke sayısı | Countries | Countries |
| `reporting.detail.conversion` | Dönüşüm | Siparişe dönüşen | Conversion | Conversion |
| `reporting.detail.aov` | Ort. Sipariş Değeri | Ortalama sipariş tutarı | Avg. Order Value | Average order value |
| `reporting.detail.totalRevenue` | Toplam Ciro | Toplam ciro | Total Revenue | Total revenue |
| `reporting.detail.monthlyRevenue` | Aylık Ciro Trendi | Aylık ciro | Monthly Revenue Trend | Revenue per month |
| `reporting.detail.topCountries` | En Çok Satış Yapılan Ülkeler | En çok satış yapılan ülkeler | Top Countries | Top countries |
| `reporting.detail.topProducts` | En Çok Satan Ürünler | En çok satan ürünler | Top Products | Top products |
| `reporting.detail.export` | Excel'e Aktar | Excel İndir | Export Excel | Download Excel |
| `reporting.detail.exporting` | Aktarılıyor… | İndiriliyor… | Exporting… | Downloading… |
| `reporting.detail.loadError` | Analiz yüklenemedi. | Ayrıntılar yüklenemedi. | Could not load analytics. | Couldn't load the details. |

</details>
