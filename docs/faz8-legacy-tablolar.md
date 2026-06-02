# Faz 8 — Legacy / Entity'siz Tablolar

> Kullanıcı kuralı: **şema dokunulmaz, SİLME yok.**
> Bu liste yalnız bilgilendirme amaçlıdır; tablolar duruyor, modern UI'dan erişim yok.

## Duplicate / kanonik dışı

### `SatinAlmaTalepleri`
- 0 satırlı, kullanılmayan eski tablo.
- Kanonik tablo: `SatinAlmaTalep` (tekil, 17 satır, Faz 6'da modernize edildi).
- Faz 6 raporundaki kanonik kararı geçerli; bu tablo modern API tarafından okunmuyor/yazılmıyor.

### `TeslimatBilgileri` vs `TeslimatBilgisiTablo`
- WinForms iki ayrı tabloya yazıyordu (`TeslimatBilgileri` eski stok teslimat akışı,
  `TeslimatBilgisiTablo` modern sipariş teslimat adres tablosu).
- Modern UI yalnız `TeslimatBilgisiTablo`'yu kullanır (DeliveryAddress entity Faz 1).
- `TeslimatBilgileri` Form2 stok azaltma akışına bağlıydı; modern UI'da bu akış
  product-catalog stok modülüne entegre olmadı (8.5 atlandı).

## Entity'siz tablolar (Faz 0 snapshot'tan)

Modern API tarafından okunmayan / yazılmayan tablolar — sebep "ölü kod" veya
"farklı modül kapsamı dışı":

| Tablo | Satır sayısı | Sebep |
|---|---|---|
| `ChatMessages` | dolu | Chat modülü — Faz 1-8 kapsamı dışı |
| `Clients` | 164 | "İş ortağı" tablosu, müşterilerden ayrı; kapsam dışı |
| `ClientCategories` | bilinmiyor | Clients ile ilişkili |
| `ClientProjects` | bilinmiyor | Clients ile ilişkili |
| `ClientResources` | 22 | Clients ile ilişkili |
| `DestekTalepleri` | 0 | Destek talep modülü, yapılmadı |
| `Discussions` | 159 | Tartışma/yorum modülü, kapsam dışı |
| `DiscussionParticipants` | 301 | Discussions ile ilişkili |
| `DiscussionAssignedUsers` | 2 | Discussions ile ilişkili |
| `Projects` | bilinmiyor | Proje yönetim modülü, kapsam dışı |
| `Tasks` | bilinmiyor | Görev modülü, kapsam dışı |
| `Meetings` | bilinmiyor | Toplantı modülü, kapsam dışı |
| `MeetingDocuments` | 0 | |
| `MeetingNotes` | 0 | |
| `MeetingParticipants` | 0 | |
| `FileStorage` | 0 | Dosya storage modülü, kapsam dışı (sipariş için Ek/MuhasebeEk BLOB var) |
| `GuncellemeKontrol` | 0 | WinForms Form1 login'de sürüm kontrol; modern UI `CURRENT_VERSION` frontend sabit |
| `UlkelerBilgileri` | dolu | Faz 1'de entity (`Ulke`) eklendi, listelenebiliyor |

## Kullanılan ama Faz 8'de eklenen tablolar

| Tablo | Entity | Faz |
|---|---|---|
| `ExcelIndir` | ExcelTemplate | 8.1 |
| `EklemeGecmisi` (genişletildi) | AuditEntry | 8.3 |
| `TalepOnaylari` (CREATE IF NOT EXISTS) | PurchaseApproval | 8.4 |

## Önerilen temizlik (Faz 9+)

- `SatinAlmaTalepleri` DROP TABLE — kullanıcı onayı şart.
- `Clients`/`Projects`/`Tasks`/`Meetings`/`Discussions` modüllerine karar:
  geliştirilecek mi yoksa drop edilecek mi?
- Bu kapsam Faz 8'i aştığı için **bu fazda yapılmadı**.
