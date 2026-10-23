# Modül 4b — Muhasebe · Tahsilat, Tahsilat Geçmişi, Müşteri Bakiyesi, ödeme formu

## 1. Ekran / Konum: Muhasebe · ekran başlıkları

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Muhasebe · Tahsilat · Muhasebe · Tahsilat Geçmişi · Muhasebe · Müşteri Bakiyesi · Satır detayları
- İçerik / Açıklama: Tahsilat geçmişi (Excel) · Tüm tahsilat geçmişini indirir. Sadece ekrandaki listeyi almak için tablonun üstündeki Listeyi İndir'i kullan. · Tüm teklif ve siparişler (yalnız görüntüleme); proformayı Excel ya da PDF olarak açabilirsin. · Satır detayları

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Accounting · Payments · Accounting · Payment History · Accounting · Customer Balance · Row details
- Content / Description: Payment history (Excel) · Downloads the full payment history. For just the list on screen, use Download List above the table. · All quotes and orders (view only); open the proforma as Excel or PDF. · Row details

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accounting.title` | Muhasebe · Tahsilat | Muhasebe · Tahsilat | Accounting · Collections | Accounting · Payments |
| `accounting.historyTitle` | Muhasebe · İşlem | Muhasebe · Tahsilat Geçmişi | Accounting · Transactions | Accounting · Payment History |
| `accounting.balanceTitle` | Muhasebe · Bakiye | Muhasebe · Müşteri Bakiyesi | Accounting · Balance | Accounting · Customer Balance |
| `accounting.rowDetailTitle` | Talep Detayları | Satır detayları | Request Details | Row details |
| `accounting.historyExcel` | İşlem geçmişi (Excel) | Tahsilat geçmişi (Excel) | Transaction history (Excel) | Payment history (Excel) |
| `accounting.historyExcelHint` | Tüm tahsilat işlem geçmişini indirir. Ekrandaki listeyi almak için tablonun üstündeki Dışa aktar'ı kullanın. | Tüm tahsilat geçmişini indirir. Sadece ekrandaki listeyi almak için tablonun üstündeki Listeyi İndir'i kullan. | Downloads the full collection history. Use Export above the table to get the list on screen. | Downloads the full payment history. For just the list on screen, use Download List above the table. |
| `accounting.ordersViewDescription` | Tüm teklif ve siparişler (salt-okunur); proforma Excel/PDF olarak açılabilir. | Tüm teklif ve siparişler (yalnız görüntüleme); proformayı Excel ya da PDF olarak açabilirsin. | All quotes and orders (read-only); proforma can be opened as Excel/PDF. | All quotes and orders (view only); open the proforma as Excel or PDF. |
| `accounting.rowSummary` | Talep detayları | Satır detayları | Request details | Row details |

</details>

## 2. Ekran / Konum: Muhasebe · filtreler

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Listedeki toplam ödeme (döviz başına)
- İçerik / Açıklama: Tümü · Satış Temsilcisi · Ödenen tutar · Müşteri seç ya da yaz · Kayıt

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Total paid in this list (by currency)
- Content / Description: All · Sales Rep · Amount paid · Choose or type a customer · Records

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accounting.filter.all` | — Tümü — | Tümü | — All — | All |
| `accounting.filter.temsilci` | Temsilci | Satış Temsilcisi | Sales Rep | Sales Rep |
| `accounting.filter.odemeDurumu` | Ödenen Bakiye | Ödenen tutar | Paid Amount | Amount paid |
| `accounting.filter.musteriPlaceholder` | Müşteri seç veya yaz | Müşteri seç ya da yaz | Select or type a customer | Choose or type a customer |
| `accounting.filter.totalsLabel` | Filtre sonucu toplam ödeme (para birimi bazında) | Listedeki toplam ödeme (döviz başına) | Total payments in the filtered result (by currency) | Total paid in this list (by currency) |
| `accounting.filter.rowCount` | Bulunan kayıt | Kayıt | Records found | Records |

</details>

## 3. Ekran / Konum: Muhasebe · Tahsilat ekle penceresi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Tahsilat — {{no}} · Muhasebe Ek — {{no}}
- İçerik / Açıklama: Kalan · Önceki tahsilatlar: · Henüz tahsilat yok. · Dosya siparişe eklenir ve önceki muhasebe ekinin yerini alır. · Muhasebe ek yükle · Muhasebe ek yüklendi. · {{amount}} tahsilat kaydedildi.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Payment — {{no}} · Accounting Attachment — {{no}}
- Content / Description: Due · Earlier payments: · No payments yet. · The file is added to the order and replaces the previous accounting attachment. · Upload accounting attachment · Accounting attachment uploaded. · Payment of {{amount}} saved.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accounting.tahsilat.title` | Tahsilat — {{no}} | Tahsilat — {{no}} | Collection — {{no}} | Payment — {{no}} |
| `accounting.tahsilat.kalan` | Kalan | Kalan | Remaining | Due |
| `accounting.tahsilat.previous` | Önceki tahsilatlar: | Önceki tahsilatlar: | Previous collections: | Earlier payments: |
| `accounting.tahsilat.none` | Henüz tahsilat yok. | Henüz tahsilat yok. | No collections yet. | No payments yet. |
| `accounting.tahsilat.ekTitle` | Muhasebe Eki — {{no}} | Muhasebe Ek — {{no}} | Accounting Attachment — {{no}} | Accounting Attachment — {{no}} |
| `accounting.tahsilat.ekHint` | Muhasebe eki siparişe dosya olarak eklenir; aynı ada sahip önceki ekin yerini alır. | Dosya siparişe eklenir ve önceki muhasebe ekinin yerini alır. | The accounting attachment is stored on the order and replaces the previous one. | The file is added to the order and replaces the previous accounting attachment. |
| `accounting.tahsilat.ekUpload` | Muhasebe eki yükle | Muhasebe ek yükle | Upload accounting attachment | Upload accounting attachment |
| `accounting.tahsilat.ekUploaded` | Muhasebe eki yüklendi | Muhasebe ek yüklendi. | Accounting attachment uploaded | Accounting attachment uploaded. |
| `accounting.tahsilat.saved` | {{amount}} tahsilat kaydedildi | {{amount}} tahsilat kaydedildi. | Payment of {{amount}} saved | Payment of {{amount}} saved. |

</details>

## 4. Ekran / Konum: Muhasebe · Tahsilat Geçmişi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Filtrelere göre tahsilat geçmişini Excel olarak indirir · Tahsilat No

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Downloads the payment history for your filters as Excel · Payment No

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accounting.history.excelHint` | Seçili filtrelere göre işlem geçmişini Excel olarak indirir | Filtrelere göre tahsilat geçmişini Excel olarak indirir | Downloads the transaction history for the current filters as Excel | Downloads the payment history for your filters as Excel |
| `accounting.history.txId` | İşlem No | Tahsilat No | Transaction No | Payment No |

</details>

## 5. Ekran / Konum: Muhasebe · Tahsilat Geçmişi · tablo

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Maliyet tablosu · Kayıt yok.

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Cost sheet · Nothing here yet.

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accountingHistory.maliyetRecetesi` | Maliyet Reçetesi | Maliyet tablosu | Cost Sheet | Cost sheet |
| `accountingHistory.empty` | Kayıt yok. | Kayıt yok. | No records. | Nothing here yet. |

</details>

## 6. Ekran / Konum: Muhasebe · Tahsilat Geçmişi · kolonlar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Satış Temsilcisi · Döviz · {{n}}. peşinat · Toplam tahsilat
- İçerik / Açıklama: —

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Sales Rep · Currency · Down payment {{n}} · Total paid
- Content / Description: —

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accountingHistory.cols.temsilci` | Temsilci | Satış Temsilcisi | Representative | Sales Rep |
| `accountingHistory.cols.paraTipi` | Para Tipi | Döviz | Currency | Currency |
| `accountingHistory.cols.pesinat` | {{n}}. Peşinat | {{n}}. peşinat | Installment {{n}} | Down payment {{n}} |
| `accountingHistory.cols.toplamTahsilat` | Toplam Tahsilat | Toplam tahsilat | Total Collected | Total paid |

</details>

## 7. Ekran / Konum: Maliyet tablosu penceresi

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Maliyet tablosu — {{no}}
- İçerik / Açıklama: Toplam fiyat · Ödenen · Peşinat % · Döviz · Maliyet (değiştirilebilir) · Maliyeti Kaydet · Detaylar · Brüt kâr …

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Cost sheet — {{no}}
- Content / Description: Total price · Paid · Down payment % · Currency · Cost (editable) · Save Cost · Details · Gross profit …

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accountingHistory.dialog.title` | Maliyet Reçetesi — {{no}} | Maliyet tablosu — {{no}} | Cost Sheet — {{no}} | Cost sheet — {{no}} |
| `accountingHistory.dialog.toplamFiyat` | Toplam Fiyat | Toplam fiyat | Total Price | Total price |
| `accountingHistory.dialog.odenenMiktar` | Ödenen Miktar | Ödenen | Paid Amount | Paid |
| `accountingHistory.dialog.pesin` | Peşin % | Peşinat % | Down Payment % | Down payment % |
| `accountingHistory.dialog.paraTipi` | Para Tipi | Döviz | Currency | Currency |
| `accountingHistory.dialog.maliyetEdit` | Maliyet (editlenebilir) | Maliyet (değiştirilebilir) | Cost (editable) | Cost (editable) |
| `accountingHistory.dialog.maliyetKaydet` | Maliyet Kaydet | Maliyeti Kaydet | Save Cost | Save Cost |
| `accountingHistory.dialog.detay` | Detay | Detaylar | Detail | Details |
| `accountingHistory.dialog.brutKar` | Brüt Kar | Brüt kâr | Gross Profit | Gross profit |
| `accountingHistory.dialog.netKar` | Net Kar | Net kâr | Net Profit | Net profit |
| `accountingHistory.dialog.marj` | Marj % | Kâr oranı % | Margin % | Margin % |
| `accountingHistory.dialog.tahsilat` | Tahsilat % | Tahsil edilen % | Collection % | Collected % |
| `accountingHistory.dialog.saved` | Maliyet kaydedildi | Maliyet kaydedildi. | Cost saved | Cost saved. |
| `accountingHistory.dialog.saveFailed` | Maliyet kaydedilemedi | Maliyet kaydedilemedi. | Could not save cost | Couldn't save the cost. |

</details>

## 8. Ekran / Konum: Diğer

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Kâr
- İçerik / Açıklama: Kâr (otomatik)

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Profit
- Content / Description: Profit (auto)

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `accountingFull.cols.kar` | Kar | Kâr | Profit | Profit |
| `accountingFull.maliyet.kar` | Kar (otomatik) | Kâr (otomatik) | Profit (auto) | Profit (auto) |

</details>

## 9. Ekran / Konum: Ödeme bilgisi formu

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Seç

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Choose

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `payment.select` | Seçin | Seç | Select | Choose |

</details>

## 10. Ekran / Konum: Ödeme bilgisi formu · ödeme türleri

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Peşin · Vadeli · Teslimatta ödeme · Çek / Senet · Kredi / Banka kartı

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Paid in advance · Pay later · Pay on delivery · Cheque / Promissory note · Credit / Debit card

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `payment.types.pesin` | Peşin | Peşin | Cash in advance | Paid in advance |
| `payment.types.vadeli` | Vadeli | Vadeli | Deferred | Pay later |
| `payment.types.malMukabili` | Mal Mukabili | Teslimatta ödeme | Cash on goods | Pay on delivery |
| `payment.types.cekSenet` | Çek / Senet | Çek / Senet | Cheque / Note | Cheque / Promissory note |
| `payment.types.kart` | Kredi Kartı / Banka Kartı | Kredi / Banka kartı | Credit / Debit card | Credit / Debit card |

</details>

## 11. Ekran / Konum: Ödeme bilgisi formu · alanlar

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: —
- İçerik / Açıklama: Ödeme tarihi · Vade · Ör. 30 gün · Vadeli tutar · Kart türü

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: —
- Content / Description: Payment date · Payment term · e.g. 30 days · Amount due later · Card type

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `payment.fields.islemTarihi` | İşlem tarihi | Ödeme tarihi | Transaction date | Payment date |
| `payment.fields.vadeSuresi` | Vade süresi | Vade | Term | Payment term |
| `payment.fields.vadeSuresiHint` | Örn. 30 gün | Ör. 30 gün | e.g. 30 days | e.g. 30 days |
| `payment.fields.vadeTutari` | Vade tutarı | Vadeli tutar | Term amount | Amount due later |
| `payment.fields.kartTipi` | Kart tipi | Kart türü | Card type | Card type |

</details>

## 12. Ekran / Konum: Muhasebe · Müşteri Bakiyesi (Cari Hesap Ekstresi)

**Türkçe (TR) Yenilenmiş Metin**
- Başlık / Menü: Cari Hesap Ekstresi
- İçerik / Açıklama: Müşterinin siparişleri (borç) ve tahsilatları (alacak), döviz başına güncel bakiyeyle. · Bir müşteri seç (yaz ya da F4). · Bu müşterinin bakiyesi yok. · Bu tarihlerde hareket yok. · {{n}}. tahsilat

**İngilizce (EN) Yenilenmiş Metin**
- Title / Menu: Account Statement
- Content / Description: The customer's orders (debit) and payments (credit), with a running balance per currency. · Choose a customer (type or press F4). · This customer has no balance. · No activity in this date range. · Payment {{n}}

<details><summary>Eski → yeni (tüm metinler)</summary>

| Anahtar | Eski TR | Yeni TR | Eski EN | Yeni EN |
|---|---|---|---|---|
| `statement.title` | Cari Hesap Ekstresi | Cari Hesap Ekstresi | Customer Account Statement | Account Statement |
| `statement.description_page` | Müşterinin borç (sipariş) ve alacak (tahsilat) hareketleri, döviz başına yürüyen bakiyeyle. | Müşterinin siparişleri (borç) ve tahsilatları (alacak), döviz başına güncel bakiyeyle. | Customer debit (orders) and credit (payments) movements with a running balance per currency. | The customer's orders (debit) and payments (credit), with a running balance per currency. |
| `statement.pickCustomer` | Ekstre için müşteri seçin (yazarak veya F4). | Bir müşteri seç (yaz ya da F4). | Select a customer (type or press F4). | Choose a customer (type or press F4). |
| `statement.noBalance` | Bu müşteri için bakiye kaydı yok. | Bu müşterinin bakiyesi yok. | No balance records for this customer. | This customer has no balance. |
| `statement.noMovements` | Seçili aralıkta hareket yok. | Bu tarihlerde hareket yok. | No movements in the selected range. | No activity in this date range. |
| `statement.paymentN` | {{n}}. tahsilat | {{n}}. tahsilat | Payment #{{n}} | Payment {{n}} |

</details>
