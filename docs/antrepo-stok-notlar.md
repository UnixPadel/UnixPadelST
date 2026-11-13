# Antrepo & Depo Stokları — Modül Notları ve İş Kuralları

Bu belge, **Lojistik → Antrepo & Depo Stokları** modülünün mimari kararlarını, iş kurallarını ve ileride yapılacak düzenlemeleri belgeler.

---

## 1. Çıkış İşlemi ve Geri Alma Kuralı

> [!WARNING]
> **Çıkış Geri Alma Süresi: Şimdilik 30 Gündür.**
> Bu süre `CrmModern.Core/WarehouseStockRules.cs` dosyasında `CikisGeriAlmaSuresiGun = 30` olarak tanımlanmıştır.
>
> - Bir mal araca yüklendiğinde ("Tamamı çıktı" veya "Bir kısmı çıktı"), bu işlemi yapan kullanıcı veya **Yönetici** işlemi **30 gün içinde** detay çekmecesinden veya işlem sonrasındaki bildirimden geri alabilir.
> - 30 gün dolduktan sonra işlem kilitlenir; tutarlılık gereği geri alınamaz.
> - **İleride yapılacak düzenleme:** Bu süre Yönetici tarafından *Yönetim → Sistem Ayarları* ekranından parametrik olarak değiştirilebilir hale getirilecektir.

---

## 2. Modülün Temel İşleyişi

1. **Tek Liste Yaklaşımı:**
   - Antrepoda bekleyen veya şirketin kendi deposunda bekleyen tüm mallar tek bir tabloda listelenir.
   - Her satır bir mal kalemini temsil eder.
   - Varsa **Gümrük Beyanname Numarası** (örn. `26341200AN000123`), yoksa `—` (boş) olarak gösterilir.
   - Konum sütunu: `Antrepo` veya `Depo`.

2. **Düşük Bilişsel Yük:**
   - Kullanıcı için tek ana eylem her satırdaki **[Araca Yükle]** butonudur.
   - Butona tıklandığında açılan pencerede iki net seçenek sunulur:
     - **Tamamı çıktı:** Kalan miktarın tamamı düşer (tek Enter ile onaylanabilir).
     - **Bir kısmı çıktı:** Çıkan miktar yazılır, kalan miktar anında güncellenir.
   - Tamamı çıkan mallar varsayılan olarak listeden gizlenir; ihtiyaç halinde "Tamamı çıkanları da göster" onay kutusuyla incelenebilir.

3. **Gemini Yapay Zekâ ile Beyanname Okuma:**
   - PDF, taranmış belge veya cep telefonu fotoğrafı formatındaki gümrük beyannameleri `gemini-3.8-flash` modeli ile taranır.
   - Kutu 41 tamamlayıcı ölçü birimi (ADET, M2 vb.) birincil miktar olarak alınır. Kutu 31'deki kap bilgileri (kap adedi ve cinsi) ikinci ölçü olarak eklenir.
   - Beyanname numarası, gümrük idaresi, tescil tarihi, fatura tutarı vb. otomatik doldurulur.
   - Kullanıcı onay ekranında kalemlere kısa ve anlaşılır isimler (örn: "Cam 10 mm", "Demir Profil 80x80") verebilir.

4. **Merkezi Gemini API Anahtarı:**
   - API anahtarı `SistemAyarlari` tablosunda AES-GCM ile şifrelenir.
   - Yönetici, **Yönetim → Sistem Ayarları** ekranından anahtarı test edebilir ve güncelleyebilir.
   - Güncellenen anahtar tüm istemci bilgisayarlarda anında geçerli olur.

---

## 3. İleride Yapılacaklar (Backlog)

Kullanıcı onayı ile ilk sürümün sade ve hatasız tutulması adına sonraya bırakılan geliştirmeler:

1. **Ürün Kataloğu Eşleştirmesi:**
   - Beyannameden okunan kısa adların CRM ürün/malzeme kataloğundaki kodlarla eşleştirilmesi.

2. **Antrepo Bekleme Süresi Uyarıları:**
   - Antrepoda kalış süresi yasal sınırları veya şirket hedeflerini (örn. 30/90 gün) aşan kalemler için sarı/kırmızı renkli rozet uyarıları.

3. **Excel Dışa Aktarımı:**
   - Stok listesinin ve antrepo hareketlerinin özel formatlı Excel raporu olarak indirilmesi.

4. **Dinamik Geri Alma Süresi:**
   - 30 günlük sürenin Sistem Ayarları ekranından parametrik olarak ayarlanabilmesi.
