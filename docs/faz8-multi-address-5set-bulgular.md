# Faz 8 — Çoklu Adres + 5-Paralel Set Bulguları (8.7 + 8.8)

## Mevcut durum

### 8.7 — SiparisTeslimatTablo çoklu adres

- Backend `OrderShipmentRepository` Faz 4'te eklendi, **yazma akışı sevkiyat
  modülünde** çalışıyor (`SiparisTeslimatTablo` insert).
- Sipariş oluşturulurken (`OrderService.CreateOrderAsync`) yalnız tek adres
  (`T*` snapshot kolonları) yazılıyor. 2-5. adres yazma kaydı **yok**.
- WinForms `SiparisForm.cs` 5 paralel set tabıyla aynı yapıyı paylaşıyor;
  her tabdaki teslimat bilgisi ayrı bir adres satırı olabiliyor — fiilen
  test edilmiş bir parite yok (production DB'de SiparisTeslimatTablo'nun
  içerikleri çoğunlukla sevk tamamlama akışından dolu).

### 8.8 — 5-paralel set tab parite

- Backend `CreateOrderDto.Sets` zaten `IReadOnlyList<OrderSetDto>` — sınırsız
  set destekliyor.
- `OrderService.CreateOrderAsync` tüm setleri `SiparisIslemTablo`'ya yazıyor.
- BoM açılım ve toplam fiyat formülü **birebir korunmuş** (Faz 3).
- Frontend `NewOrderPage.tsx` "Reçeteden Aç" akışı tek seferde tek kategori
  ekler; **5-tab UI yok**, kullanıcı butonu birden fazla kez kullanarak
  birden fazla set ekleyebiliyor. UX olarak WinForms'taki 5 tab kadar net
  değil ama veri katmanı tam destekli.

## Karar (Faz 8)

Her iki konuyu da **bu fazda tam parite yapmıyoruz**. Gerekçe:

1. WinForms'un 5-tab + çoklu adres davranışı zaten kullanıcılar tarafından
   **nadir** kullanılıyordu (üretimde tek set + tek adres yaygın). Tam
   parite mevcut çalışan veri akışını bozma riskine değmiyor.
2. NewOrderPage'in tamamen yeniden yazılması (5 tab state, her tabda ayrı
   kategori/adet/reçete, ayrı teslimat formu) bu fazın kapsamını aşıyor —
   wizard mimarisinin overhaul'ü ayrı bir faz.
3. Backend zaten **çoklu set kabul ediyor**. UI'dan tek tek set eklenebiliyor.

## Faz 9 için backlog

### Çoklu adres (8.7 devamı)

- `CreateOrderDto`'ya `ExtraDeliveryAddresses: IReadOnlyList<DeliveryAddressInputDto>?` ekle.
- `OrderService.CreateOrderAsync` bu listeyi `SiparisTeslimatTablo`'ya
  insertle (KullaniciID/SiparisNo + her satır).
- `NewOrderPage` Teslimat Adresleri sekmesinde "Adres Ekle" buton + dinamik
  satır UI.
- `OrderDetailModal` 2-5. adresleri ek tablo olarak listeler.

### 5-set tab parite (8.8 devamı)

- `NewOrderPage` Kalemler sekmesini 5 alt-tab (Set 1..5) yap.
- Her tabda: ayrı kategori seçici, adet, reçete genişletme.
- Toplam fiyat 5 set + montaj + teslimat formülünden anlık hesapla.
- `useReducer` state yönetimi; tabs lazy render.

## Bu fazda etkilenen alan

- Yalnız bu bulgu belgesi üretildi.
- Backend / frontend kod değişmedi.
