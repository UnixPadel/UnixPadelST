# Faz 8 — StokTablo / UrunMaliyetTablo Yazma Akışları Bulguları

## Durum

- `StokTablo` ve `UrunMaliyetTablo` entity'leri Faz 3'te eklendi
  (`StockEntry`, `ProductCost`) ve schema'da var.
- WinForms'ta her iki tabloya **yazma akışı yok**.
- Modern UI'da da Faz 3-7 sürecinde yazma eklenmedi (raporlarda not düşüldü).

## Karar (Faz 8)

Kullanıcı kuralı: **"WinForms davranışını birebir koruyun, refactor yok."**

→ Bu fazda da yazma akışı **eklenmiyor**.

## Faz 9 için backlog (kullanıcı isterse)

Aşağıdaki manuel akışlar değerli olabilir:

1. **Manuel stok girişi UI'ı:**
   - Sayfa: `pages/product-catalog/StockEntryPage.tsx`
   - Endpoint: `POST /api/product-catalog/stock` (mevcut StockRepository üzerinden)
   - Tetikleyici aksiyonlar: kategori bazlı stok artış/azalt, açıklamalı.

2. **Ürün maliyet kaydı:**
   - Sayfa: `pages/product-catalog/ProductCostPage.tsx`
   - Endpoint: `POST /api/product-catalog/costs`
   - Maliyet zaman serisi, malzeme bazlı.

3. **Sipariş tamamlama → otomatik stok düşümü:**
   - `LogisticsService.CompleteShipmentAsync` içinde reçete açılımı ile
     `StokTablo` decrement.
   - Bu **WinForms'ta yok**, refactor sınırını aşar; kullanıcı onayı şart.

## Bu fazda etkilenen alan

Hiçbiri. Yalnızca bu bulgu belgesi üretildi.
