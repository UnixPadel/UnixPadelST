import type { ChangelogEntry } from '@/types'

/**
 * Faz 7 — Yenilik (Changelog).
 *
 * WinForms karşılığı: `Yenilik.cs` formu — sabit metin tek bir TextBox'tan okunuyordu
 * (resources.GetString("textBox1.Text")). Bu modülün DB bağlantısı yok; modern UI'da
 * statik veri olarak tutuluyor.
 *
 * Her yeni faz/sürümde başa yeni bir entry eklenir. Versiyon karşılaştırması
 * `UpdatesModal` içinde semver'sız basit string eşitliği üzerinden yapılır
 * (localStorage `lastSeenVersion`).
 */
export const CURRENT_VERSION = '2.7.0'

export const CHANGELOG: ChangelogEntry[] = [
  {
    versiyon: '2.7.0',
    tarih:    '2026-05-18',
    baslik:   'Faz 7 — Dashboard, Global Arama ve Yenilik',
    maddeler: [
      'Ana panele KPI kartları ve rol bazlı widget\'lar eklendi (son 30 gün sipariş/ciro, bekleyen kontrol, üretim, sevkiyat, ödeme, satın alma).',
      'Recharts ile 3 yeni grafik: aylık sipariş trendi, aşama dağılımı, top müşteri (Yönetici/Muhasebe).',
      'Topbar\'a global arama eklendi (Ctrl/Cmd+K). Sipariş, Müşteri, Bileşen, Kategori, Kullanıcı ve Satın Alma Talep kategorilerinde tek input ile arama.',
      '"Neler Yeni" modalı ilk login sonrası bir kez gösteriliyor; geçmiş tüm sürümlere "Neler Yeni" sayfasından erişilebilir.',
    ],
  },
  {
    versiyon: '2.6.0',
    tarih:    '2026-05-10',
    baslik:   'Faz 6 — 3 aşamalı Satın Alma onayı',
    maddeler: [
      'Satın alma talepleri: ön onay (omur.caliskan) → muhasebe ödeme detayı → nihai onay (elshan.rasulov) akışı.',
      'Tüm talepler ekranı + departman bazlı filtreler.',
      'Muhasebe tipi taleplerde 17 ödeme/önizleme alanı.',
    ],
  },
  {
    versiyon: '2.5.0',
    tarih:    '2026-05-01',
    baslik:   'Faz 5 — Muhasebe modülü',
    maddeler: [
      'Sipariş ödeme takibi, ek dosya yükleme, kalan bakiye hesaplama.',
      'Muhasebe Excel özet dışa aktarma.',
      'Müşteri bakiye sayfası.',
    ],
  },
  {
    versiyon: '2.4.0',
    tarih:    '2026-04-20',
    baslik:   'Faz 4 — Lojistik modülü',
    maddeler: [
      'Hazır siparişleri lojistik aşamasına alma, sevkiyat planı oluşturma.',
      'Lojistik geçmişi + nakliyeci yönetimi.',
    ],
  },
  {
    versiyon: '2.3.0',
    tarih:    '2026-04-10',
    baslik:   'Faz 3 — Fabrika ve sipariş yaşam döngüsü',
    maddeler: [
      'Sipariş aşama yönetimi: Teklif → Sipariş → Üretim → Hazır → Lojistik → Tamamlandı.',
      'Stok hareketleri ve maliyet takibi.',
    ],
  },
  {
    versiyon: '2.2.0',
    tarih:    '2026-04-01',
    baslik:   'Faz 2 — Kalite Kontrol',
    maddeler: [
      'Yönetici kontrol akışı: Onay / Reddet.',
      'Kontrol notu ve red sebebi alanları.',
    ],
  },
  {
    versiyon: '2.1.0',
    tarih:    '2026-03-15',
    baslik:   'Faz 1 — Sipariş + Müşteri + Ürün Kataloğu + Kullanıcı',
    maddeler: [
      'Teklif/Sipariş oluşturma formu, müşteri yönetimi.',
      'Kategori + bileşen + öznitelik tabanlı reçete.',
      'Rol bazlı kullanıcı yönetimi (6 rol).',
    ],
  },
  {
    versiyon: '2.0.0',
    tarih:    '2026-03-01',
    baslik:   'Faz 0 — Modern .NET 8 + React migration başlangıcı',
    maddeler: [
      'WinForms uygulamasından .NET 8 Web API + React/Vite/Tailwind frontend\'e geçiş.',
      'JWT tabanlı kimlik doğrulama, EF Core/Pomelo MySQL, Recharts.',
    ],
  },
]
