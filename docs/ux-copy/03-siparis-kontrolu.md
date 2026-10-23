# Modül 3 — Sipariş Kontrolü (eski adıyla Kalite Kontrol / Kontrol)

Bu ekranın alan ve kolon metinleri Muhasebe · Onaylar ekranında da kullanılıyor; değişiklik ikisinde birden görünür.

## 1. Ekran / Konum: Sipariş Kontrolü · başlık ve bildirimler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sipariş Kontrolü
- İçerik / Açıklama: {{count}} sipariş bekliyor · Yalnız onaylananlar · Onaylandı. · Onaylanamadı. Sipariş bulunamadı ya da zaten onaylı. · Reddedildi. · Reddedilemedi. Sipariş zaten onaylı olabilir ya da teklif/sipariş değil. · Red sebebi · Neden reddettiğini yaz… …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Order Review
- Content / Description: {{count}} orders waiting · Approved only · Approved. · Couldn't approve. The order wasn't found or is already approved. · Rejected. · Couldn't reject. The order may already be approved, or it isn't a quote or order. · Reason for rejection · Say why you're rejecting it… …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.title` | Kontrol | Sipariş Kontrolü | Control | Order Review |
| `qc.pendingCount` | {{count}} bekleyen sipariş | {{count}} sipariş bekliyor | {{count}} pending orders | {{count}} orders waiting |
| `qc.onlyApproved` | Sadece onaylı siparişler | Yalnız onaylananlar | Approved orders only | Approved only |
| `qc.approved` | Başarıyla onaylandı! | Onaylandı. | Approved successfully! | Approved. |
| `qc.approveFailed` | Kayıt bulunamadı veya zaten Onay durumunda. | Onaylanamadı. Sipariş bulunamadı ya da zaten onaylı. | Record not found or already in Approved status. | Couldn't approve. The order wasn't found or is already approved. |
| `qc.rejected` | Reddedildi | Reddedildi. | Rejected | Rejected. |
| `qc.rejectFailed` | İşlem yapılamadı! Sipariş zaten Onay durumunda olabilir veya Teklif/Sipariş değil. | Reddedilemedi. Sipariş zaten onaylı olabilir ya da teklif/sipariş değil. | Operation failed! The order may already be Approved or is not a Quote/Order. | Couldn't reject. The order may already be approved, or it isn't a quote or order. |
| `qc.rejectNote` | Red nedeni | Red sebebi | Rejection reason | Reason for rejection |
| `qc.rejectPlaceholder` | Red nedenini yazın... | Neden reddettiğini yaz… | Write the reason for rejection... | Say why you're rejecting it… |
| `qc.noResults` | Hiçbir sonuç bulunamadı. | Sonuç yok. | No results found. | No results. |
| `qc.selectFirst` | Lütfen sipariş seçiniz. | Önce bir sipariş seç. | Please select an order. | Choose an order first. |
| `qc.emptyHint` | Detayları görmek için yukarıdaki tablodan bir sipariş seçin. | Ayrıntıları görmek için tablodan bir sipariş seç. | Select an order from the table above to see its details. | Choose an order in the table to see its details. |
| `qc.cariUpdated` | Cari güncellendi. | Cari güncellendi. | Balance updated. | Account updated. |
| `qc.invalidPaidAmount` | Geçerli bir ödenen bakiye girin. | Geçerli bir ödenen tutar gir. | Enter a valid paid amount. | Enter a valid paid amount. |
| `qc.attachmentNotFound` | Ek dosya bulunamadı. | Ek dosya yok. | Attachment not found. | No attachment found. |
| `qc.capped` | İlk 200 sonuç gösteriliyor — filtreyi daraltın | İlk 200 sonuç görünüyor; filtreyi daralt | Showing first 200 results — narrow the filter | Showing the first 200 results; narrow your filter |
| `qc.nextHint` | Karardan sonra sıradaki bekleyen sipariş seçilir. | Karar verince sıradaki bekleyen sipariş açılır. | After a decision the next pending order is selected. | After you decide, the next waiting order opens. |
| `qc.noPending` | Kontrol bekleyen sipariş yok. | Kontrol bekleyen sipariş yok. | No orders awaiting control. | No orders waiting for review. |
| `qc.splitter` | Üst panel yüksekliği (↑/↓) | Üst panelin yüksekliği (↑/↓) | Top panel height (↑/↓) | Top panel height (↑/↓) |

</details>

## 2. Ekran / Konum: Sipariş Kontrolü · filtre çubuğu

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Müşteri · Satış Temsilcisi · Kontrol durumu · Ödeme durumu · Başlangıç · Bitiş · Sıfırla · Tarih aralığı

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Customer · Sales Rep · Review status · Payment status · From · To · Reset · Date range

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.filter.musteriAdi` | Müşteri Adı | Müşteri | Customer Name | Customer |
| `qc.filter.temsilci` | Temsilci Adı | Satış Temsilcisi | Representative | Sales Rep |
| `qc.filter.kontrolDurumu` | Kontrol Durumu | Kontrol durumu | Control Status | Review status |
| `qc.filter.odemeDurumu` | Ödeme Durumu | Ödeme durumu | Payment Status | Payment status |
| `qc.filter.bas` | Baş | Başlangıç | From | From |
| `qc.filter.son` | Son | Bitiş | To | To |
| `qc.filter.reset` | Reset | Sıfırla | Reset | Reset |
| `qc.filter.tarihAraligi` | Tarih Aralığı | Tarih aralığı | Date Range | Date range |

</details>

## 3. Ekran / Konum: Sipariş Kontrolü · üst panel sekmeleri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Tahsilatlar · Satış Temsilcisi · Detaylar
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Payments · Sales Rep · Details
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.tabs.muhasebeGecmisi` | Muhasebe Geçmişi | Tahsilatlar | Accounting History | Payments |
| `qc.tabs.satisTemsilcisi` | Satış Temsilcisi | Satış Temsilcisi | Sales Representative | Sales Rep |
| `qc.tabs.detay` | Detay | Detaylar | Details | Details |

</details>

## 4. Ekran / Konum: Sipariş Kontrolü · sipariş listesi kolonları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Sipariş No · Müşteri · Sipariş tutarı · Kalan peşinat · Kalan bakiye · Peşinat % · Teslim şekli · Döviz …
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Order No · Customer · Order total · Down payment due · Balance due · Down payment % · Delivery terms · Currency …
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.grid.siparisNo` | Sipariş Numarası | Sipariş No | Order Number | Order No |
| `qc.grid.musteriAd` | Müşteri Adı | Müşteri | Customer Name | Customer |
| `qc.grid.toplamSiparis` | Toplam Sipariş | Sipariş tutarı | Order Total | Order total |
| `qc.grid.kaparoBakiyesi` | Kaparo Bakiyesi | Kalan peşinat | Deposit Balance | Down payment due |
| `qc.grid.kalanBakiye` | Kalan Bakiye | Kalan bakiye | Remaining Balance | Balance due |
| `qc.grid.pesinYuzde` | Peşin Yüzde | Peşinat % | Advance % | Down payment % |
| `qc.grid.teslimatCesiti` | Teslimat Çeşidi | Teslim şekli | Delivery Type | Delivery terms |
| `qc.grid.paraTipi` | Para Tipi | Döviz | Currency | Currency |
| `qc.grid.odemeDurumu` | Ödeme Durumu | Ödeme durumu | Payment Status | Payment status |
| `qc.grid.kontrolDurumu` | Kontrol Durumu | Kontrol durumu | Control Status | Review status |
| `qc.grid.veriYok` | Veri Yok | Belirtilmemiş | No Data | Not set |

</details>

## 5. Ekran / Konum: Sipariş Kontrolü · panel başlıkları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Filtreler · Satış Temsilcisi · Teslimat · Detaylar · Cari Bilgiler · Kontrol durumu · Ürünler ve parçalar · Tahsilatlar

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Filters · Sales Rep · Delivery · Details · Account Details · Review status · Products and parts · Payments

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.blocks.filtreme` | Filtreme | Filtreler | Filters | Filters |
| `qc.blocks.satisTemsilcisi` | Satış Temsilcisi | Satış Temsilcisi | Sales Representative | Sales Rep |
| `qc.blocks.teslimatDetaylari` | Teslimat Detayları | Teslimat | Delivery Details | Delivery |
| `qc.blocks.detay` | Detay | Detaylar | Details | Details |
| `qc.blocks.cariBilgiler` | Cari Bilgiler | Cari Bilgiler | Account Info | Account Details |
| `qc.blocks.kontrolDurumu` | Kontrol Durumu | Kontrol durumu | Control Status | Review status |
| `qc.blocks.urunBilesen` | Ürün & Bileşen | Ürünler ve parçalar | Product & Components | Products and parts |
| `qc.blocks.muhasebeGecmisi` | Muhasebe Geçmişi | Tahsilatlar | Accounting History | Payments |

</details>

## 6. Ekran / Konum: Sipariş Kontrolü · alan adları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Satış Temsilcisi · Faks · E-posta · Vergi No · Ad · Posta kodu · Teslim alan · Yetkili kişi …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Sales Rep · Fax · Email · VAT No · Name · ZIP code · Recipient · Contact person …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.fields.temsilciAdi` | Temsilci Adı | Satış Temsilcisi | Representative | Sales Rep |
| `qc.fields.fax` | Fax | Faks | Fax | Fax |
| `qc.fields.email` | E-Mail | E-posta | E-Mail | Email |
| `qc.fields.vat` | VAT Numarası | Vergi No | VAT Number | VAT No |
| `qc.fields.isim` | İsim | Ad | Name | Name |
| `qc.fields.zipKodu` | Zip Kodu | Posta kodu | Zip Code | ZIP code |
| `qc.fields.teslimAlanAdi` | Teslim Alan Adı | Teslim alan | Recipient Name | Recipient |
| `qc.fields.ilgiliKisi` | İlgili Kişi | Yetkili kişi | Contact Person | Contact person |
| `qc.fields.altTelefon` | Alternatif Telefon | İkinci telefon | Alternate Phone | Other phone |
| `qc.fields.montaj` | Montaj | Montaj | Assembly | Installation |
| `qc.fields.montajFiyati` | Montaj Fiyatı | Montaj fiyatı | Assembly Price | Installation price |
| `qc.fields.teslimatFiyati` | Teslimat Fiyatı | Teslimat fiyatı | Delivery Price | Delivery price |
| `qc.fields.teslimatCesidi` | Teslimat Çeşidi | Teslim şekli | Delivery Type | Delivery terms |
| `qc.fields.siparisToplam` | Sipariş Toplam | Sipariş tutarı | Order Total | Order total |
| `qc.fields.paraBirimi` | Para Birimi | Döviz | Currency | Currency |
| `qc.fields.pesinYuzde` | Peşin Yüzde | Peşinat % | Advance % | Down payment % |
| `qc.fields.indirimYuzde` | İndirim Yüzde | İndirim % | Discount % | Discount % |
| `qc.fields.kaparoBakiye` | Kaparo Bakiye | Kalan peşinat | Deposit Balance | Down payment due |
| `qc.fields.siparisBakiye` | Sipariş Bakiye | Kalan bakiye | Order Balance | Balance due |
| `qc.fields.odenenBakiye` | Ödenen Bakiye | Ödenen | Paid Balance | Paid |

</details>

## 7. Ekran / Konum: Sipariş Kontrolü · butonlar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Cariyi Güncelle · Proforma (Excel) · Siparişi Aç
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Update Account · Proforma (Excel) · Open Order
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.actions.cariGuncelle` | Cari Güncelle | Cariyi Güncelle | Update Balance | Update Account |
| `qc.actions.excelYaz` | Excel'e Yaz | Proforma (Excel) | Export Excel | Proforma (Excel) |
| `qc.actions.formGetir` | Form'u getir | Siparişi Aç | Open Form | Open Order |

</details>

## 8. Ekran / Konum: Sipariş Kontrolü · Detaylar sekmesi ürün tablosu

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Özellik · Parça

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Option · Part

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.items.oznitelik` | Öznitelik | Özellik | Attribute | Option |
| `qc.items.bilesenAdi` | Bileşen Adı | Parça | Component Name | Part |

</details>

## 9. Ekran / Konum: Tahsilatlar tablosu

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Müşteri · Satış Temsilcisi · Döviz · Ödenen

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Customer · Sales Rep · Currency · Paid

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.tx.musteriAdi` | Müşteri Adı | Müşteri | Customer Name | Customer |
| `qc.tx.temsilci` | Temsilci | Satış Temsilcisi | Representative | Sales Rep |
| `qc.tx.paraTuru` | Para Türü | Döviz | Currency | Currency |
| `qc.tx.odenenBakiye` | Ödenen Bakiye | Ödenen | Paid Balance | Paid |

</details>

## 10. Ekran / Konum: Eski kontrol listesi kolonları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Döviz · Peşinat
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Currency · Down payment
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.columns.currency` | Para | Döviz | Currency | Currency |
| `qc.columns.deposit` | Kapora | Peşinat | Deposit | Down payment |

</details>

## 11. Ekran / Konum: Sipariş Kontrolü · renk açıklaması

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Onaylandı

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Approved

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `qc.legend.approved` | Onaylı | Onaylandı | Approved | Approved |

</details>
