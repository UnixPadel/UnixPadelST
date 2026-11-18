# UX metin sözlüğü (TR / EN)

Tüm ekran metinleri, kılavuz, sürüm notları ve hata mesajları bu sözlüğe uyar. Yeni bir metin yazarken önce buraya bak; bir kavram için burada olmayan bir kelime kullanma.

## İlkeler
- **Ne iş yapıyorsa onu yaz.** Kurumsal ya da teknik terim yok ("Belge Akışı" değil "Sipariş Geçmişi").
- **Bir kavram, tek kelime.** Menüde, butonda, bildirimde ve kılavuzda aynı kelime kullanılır.
- **"Sen" hitabı, kısa cümle.** "Müşteri seç", "Tutar gir", "Kaydetmeden çık".
- **Bildirimler:**
  - Başarı: "Kaydedildi." / "Saved." — 40+ ergonomi (K6, 2026-11): başarı mesajı açılır pencere değil, alt durum çubuğuna yazılır. Açılır mesaj (toast) yalnız sonucu ekrandan çıkan işlemlerde (onaylanan sipariş listeden kaybolur, silme + "Geri al").
  - Hata: "Kaydedilemedi. Tekrar dene." / "Couldn't save. Try again." — hata mesajı kullanıcı kapatana kadar kalır.
  - Boş durum: "Henüz … yok." / "No … yet."
- **Onay pencereleri (2026-11):** başlık soru ("… silinsin mi?"), açıklamada kayıt adı, "Ne olacak?" maddeleri ve varsa "Sonraki adım". Buton etiketi eylem fiilidir ("Hazır olarak işaretle", "Formu temizle"); "Evet/Tamam" kullanılmaz.
- **Etiketler:** her ikon butonun yanında adı yazar; devre dışı butonun sebebi butonun altında görünür metindir (yalnız ipucu değil)."
- **Yasak:** "optimize", "entegre", "sinerji", "kesintisiz", "mükemmel çözüm", "dijital dünya", "harmanla", "gerçekleştirilmektedir", "temin edilmektedir", "başarıyla", "lütfen" / "please", "successfully".
- **Büyük harf (EN):** menü, sayfa ve bu sözlükteki özel adlar Title Case ("Order History"); diğer tüm metinler sentence case ("Save changes").
- **Sayı ve tarih (EN, 2026-11-18):** `en-GB` biçimi: `1,234.56`, `18/11/2026`. Tutar alanları etkin dilin ondalık ayırıcısına göre okunur.
- **Veri çevrilmez:** katalog, ülke ve serbest metin değerleri Türkçe kalır. Sabit listelerde (birim, para tipi) kayıtlı değer aynı kalır, yalnız ekrandaki ad çevrilir.
- **Dosya çıktıları:** Excel ve proforma arayüz dilini izler. Liste indirme (CSV) başlık ve durumları çevirir, sayı biçimi Excel'in Türkçe ayarına uygun kalır.
- **Adım ve aşama farkı:**
  - **Aşama** (Stage): siparişin durumu; Teklif, Sipariş, Planlama, Üretim, Hazır, Lojistik, Tamamlandı.
  - **Adım** (Step): iş sırasında bekleyen iş; "Önceki adımda bekleyenler".

## Terimler
| Kavram | TR | EN |
|---|---|---|
| Sipariş detayındaki tüm adımlar sekmesi | Sipariş Geçmişi | Order History |
| Aşama geçmişi bloğu | Aşamalar | Stages |
| Onay geçmişi bloğu | Onaylar | Approvals |
| Muhasebe geçmişi sekmesi | Tahsilatlar | Payments |
| Kontrol ekranı | Sipariş Kontrolü | Order Review |
| Kontrol durumu değerleri | Kontrolde / Onaylandı / Reddedildi | In review / Approved / Rejected |
| Kapora / Kaparo / Peşinat | Peşinat | Down payment |
| Kaparo bakiyesi | Kalan peşinat | Down payment due |
| Kalan bakiye | Kalan bakiye | Balance due |
| Tahsilat (alınan ödeme) | Tahsilat | Payment |
| Ödeme durumu | Ödeme durumu (Ödendi / Beklemede) | Payment status (Paid / Pending) |
| Cari | Cari (aynen) | Account |
| Cari Hesap Ekstresi | Cari Hesap Ekstresi | Account Statement |
| Satış temsilcisi | Satış Temsilcisi ("Temsilci" tek başına yok) | Sales Rep |
| Sipariş açma (Form'u getir / Form Göster) | Siparişi Aç | Open Order |
| Proforma indirme | Proforma (Excel) / Proforma (PDF) | Proforma (Excel) / Proforma (PDF) |
| Ekrandaki listeyi indirme | Listeyi İndir | Download List |
| Satıcı Ek / Muhasebe Ek | Satıcı Ek / Muhasebe Ek (aynen) | Seller File / Accounting File |
| Siparişin belge klasörü (proforma + muhasebe ekleri + Satıcı Ek) | Muhasebe Klasörü | Accounting Folder |
| Klasördeki yüklenmiş dosyalar | Muhasebe Ekleri | Accounting Files |
| Muhasebe · Teklif ve Siparişler (menü) | Muhasebe · Klasörler | Accounting · Folders |
| Bileşen | Parça | Part |
| Öznitelik | Özellik | Option |
| Serbest / özel kalem | Ek kalem | Extra item |
| Ekstra maliyet | Ek maliyet | Extra cost |
| Reçete | Parça listesi | Parts list |
| Para tipi / para birimi | Döviz | Currency |
| Teslimat çeşidi (Incoterm) | Teslim şekli | Delivery terms |
| Montaj | Montaj | Installation |
| Sevk / sevkiyat | Sevkiyat | Shipment |
| Taşıyıcı | Nakliye firması | Carrier |
| Taşıma türü | Taşıma türü | Transport mode |
| Lojistik teklifi | Nakliye teklifi | Shipping quote |
| Nihai onay | Son Onay | Final Approval |
| Ödeme detayı (satın alma) | Ödeme bilgileri | Payment details |
| Komut paleti (Ctrl+K) | Hızlı Erişim | Quick Open |
| Panel / Ana Panel | Ana Sayfa | Home |
| Arama ekranı | Sipariş Ara | Search Orders |
| Diyaloğu kapatma | Vazgeç | Cancel |
| Yanlış girilen tahsilatı kaldırma (2026-11-17: "iptal" yerine "sil") | Tahsilatı sil | Delete payment |
| Yazı/buton boyutu tercihi | Görünüm: Rahat / Standart | View: Comfortable / Standard |
| Electron zoomFactor | Yakınlaştırma | Zoom |
| Tablo üstündeki seçili satır çubuğu | Seçili kayıt | Selected record |
| Satır işlem menüsü (eski "⋯") | İşlemler | Actions |
| Etki önizlemesi başlığı | Ne olacak? | What happens next? |
| İş akışındaki bir sonraki iş | Sonraki adım | Next step |
| Silmeden hemen sonra geri alma | Geri al | Undo |
| Silinmiş kaydı listeden geri getirme | Geri yükle | Restore |
| Silinmiş kayıtları listeleme filtresi | Silinenleri göster | Show deleted |
| Yapay zekânın doldurduğu alan işareti | YZ doldurdu · kontrol et | Filled by AI · check |
| Taslak durumu | Taslak kaydedildi · 13:25 | Draft saved · 13:25 |
| Sipariş detayının sağ paneli | Sipariş detayı | Order details |
| Siparişi kapatma (muhasebe) | Siparişi Kapat | Close Order |
| Teklifi siparişe çevirme | Siparişe Çevir | Turn into Order |
| Peşin ödeme koşulu | Peşin | Advance payment |
| Vadeli ödeme koşulu ("taksit" değildir) | Vadeli | Deferred payment |
| Taksit | Taksit | Installments |
| Sipariş veya talep satırı | Kalem | Item |
| Reddetme gerekçesi | Red sebebi | Reason for rejection |
| Maliyet reçetesi / tablosu | Maliyet tablosu | Cost sheet |
| Gümrüklü depo | Antrepo | Bonded warehouse |
| Beyannamedeki gönderen | Gönderici | Consignor |
| Beyannamedeki alan | Alıcı | Consignee |
| Gümrük rejimi kodu | Rejim kodu | Customs procedure code |

**Fiiller:** Kaydet/Save, Ekle/Add, Sil/Delete, Düzenle/Edit, Onayla/Approve, Reddet/Reject, Kapat/Close, Sıfırla/Reset, Yenile/Refresh, Revize Et/Revise, Seç/Select, Kaldır/Remove.

## Kapsam dışı
Proforma sözleşme maddeleri (`clauses.*`, `lib/clauses.ts`, `ClauseText.cs`) hukuki metindir; üslup için değiştirilmez. İstisna (2026-11-18): anlamı yanlış olan EN "Installments" → "Deferred Payment" ve "Assembly" → "Installation". Bu iki değişiklik yayından önce hukuk/finans onayı ister.
