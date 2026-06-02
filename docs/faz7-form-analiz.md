# Faz 7 — Form Analiz: Dashboard + Global Arama + Yenilik

> WinForms kaynak: `WindowsFormsApp1\Form2.cs`, `Form3.cs`, `Ara.cs`, `Yenilik.cs`, `Foxer.cs`
> Hedef: Modern UI Dashboard + Topbar Global Arama + Yenilik (changelog).

---

## (a) Form3.cs — Dashboard / Karşılama Kısmı

**Kullanım:** Ana menü/hub formu (3832 satır). Faz 1-6'da modül butonları portlandı.
Bu fazda yalnız **dashboard/karşılama** bölümü analiz edildi.

### Açılışta gösterilenler

- **Bağlantı durumu:** `sunucuBaglantiLabel.Text = "Başarıyla sunucuya bağlanıldı"` (TR) /
  `"Successfully connected to the server"` (Eng). Sabit metin, gerçek bir health-check değil.
- **Kullanıcı adı:** `kullaniciadi.Text = KullaniciAdi` — DB'den çekilen `KullaniciBilgileri.KullaniciAdi`.
  (Form3.cs satır 309-310)
- **"Hoş geldin {ad}" metni YOK.** Sadece kullanıcı adı label'i ve sabit "sunucuya bağlandı" mesajı.
- **Son giriş tarihi YOK.**

### KPI / Grafik durumu — KRİTİK BULGU

Form3'te **4 adet `System.Windows.Forms.DataVisualization.Charting` chart** tanımlı:

| Method | Chart | Tip | Sorgu |
|---|---|---|---|
| `LoadUrunChartData()` | `chart1` | Column | `SELECT KategoriAdi, Stok FROM UrunKategorileri` |
| `LoadMusteriSatinAlimChartData()` | `chart2` | Doughnut | `TeslimatBilgileri JOIN MusteriBilgileri GROUP BY MusteriID` (Müşteri bazlı miktar) |
| `LoadUlkeChartData()` | `chart3` | Pie | `TeslimatBilgileri JOIN MusteriBilgileri JOIN UlkelerBilgileri GROUP BY UlkeAdi` |
| `LoadBolgeChartData()` | `chart4` | Pyramid | Aynı join + `GROUP BY Bolge` |

**ANCAK** bu 4 method çağrısı `DataGrid()` içinde **YORUM SATIRINDA** (Form3.cs satır 563-566):

```csharp
//LoadUrunChartData();
//LoadMusteriSatinAlimChartData();
//LoadUlkeChartData();
//LoadBolgeChartData();
```

→ **WinForms'ta dashboard grafikleri çalışmıyor, devre dışı bırakılmış.**

### "Raporlama" (chartButton) butonu

WinForms'ta `chartButton_Click` (Form3.cs 1657) → `new Ara(...).ShowDialog()`.
Yani "Raporlama" butonu aslında **Ara (sipariş arama)** formunu açıyor. Gerçek bir
"raporlama paneli" YOK.

### Grafik kütüphanesi

- `System.Windows.Forms.DataVisualization.Charting` — beklenen .NET built-in chart.
- `SciChart.Core.Extensions` — `using` direktifi var ama proje genelinde sadece `.ForEachDo()` extension
  metoduna küçük 1-2 yerde kullanılıyor; chart için değil.
- `GrapeCity.DataVisualization.TypeScript` — `using` direktifi var ama hiçbir aktif kullanım yok
  (sadece reference).

→ **SciChart / GrapeCity grafik için fiilen kullanılmıyor.** Faz 0 planına göre modern UI'da
**Recharts** kullanılacak (kullanıcı onayı ile).

### Rol bazlı widget durumu

WinForms'ta rol bazlı dashboard widget yok (zaten dashboard çalışmıyor). Sadece menü butonları
rol göre `Enabled` set ediliyor (Form3.cs 158-280). Modern UI'da Faz 1'de Sidebar buna göre
ayarlandı.

### Sonuç — Faz 7 Dashboard Kararı

WinForms'ta fiilen aktif bir dashboard YOK. Modern UI için **minimum dashboard** kuracağız:

- 4-6 KPI kartı (rol bazlı)
- 3 Recharts grafiği (sipariş trendi, aşama dağılımı, top müşteri)
- WinForms'taki yorumlanmış 4 grafiğin **mantığı korunarak** modernize edilecek
  (Stok/Kategori → kullanmıyoruz, çünkü Stok WinForms'a özgü bir kavram; yerine
  **son 12 ay sipariş** ve **aşama dağılımı** daha değerli).

---

## (b) Form2.cs — Eski "Ana Menü"?

**Bulgu: Form2 ana menü DEĞİL.** Bu form bir **stok ekleme + teslimat oluşturma** formudur.

### Form2 ne yapıyor (220 satır)

1. `Form2_Load`: 3 ComboBox doldurma (kategori, kategori_1, müşteri), 4 DataGridView
   (MusteriBilgileri, UrunKategorileri, TeslimatBilgileri, EklemeGecmisi).
2. `button1_Click`: `UPDATE UrunKategorileri SET Stok = Stok + @Miktar` + `EklemeGecmisi` log.
3. `button2_Click`: `INSERT TeslimatBilgileri` + `UPDATE UrunKategorileri SET Stok = Stok - @Miktar`
   (transaction içinde).
4. `Form2_FormClosed`: `Application.Exit()` — uygulamayı tamamen kapatıyor.

### Form3 ile çakışma

Form2, **Faz 1'den önce kalmış/kullanılmayan** bir "stok yönetimi"/"teslimat" formu.
Modern UI'da:
- Stok ekleme → Faz 1'de `product-catalog/StockPage.tsx` ve `EklemeGecmisiPage`'e portlandı.
- Teslimat ekleme → Faz 4 lojistik modülünde teslimat planı/sevkiyat akışına yedirildi
  (TeslimatBilgileri tablosu lojistik tarafında).

### PORTLANMAMIŞ ne kaldı

Form2'de bizim portlamadığımız özgün bir akış **YOK**:
- Stok ekleme/azaltma + EklemeGecmisi → Faz 1.
- TeslimatBilgileri insert + stok decrement → Faz 4 lojistik teslim/sevk akışı.

→ **Form2 Faz 7'ye iş çıkarmıyor.** Karar: Faz 7'de YOK.

---

## (c) Ara.cs — Global Arama mı?

**KRİTİK BULGU: Ara.cs "global arama" DEĞİL.**

### Ara ne yapıyor (1317 satır)

Ara formu, **sipariş arama (SiparisAlTablo) için yapılandırılmış filtre** ekranıdır:

- TextBox `textBoxSiparisNo` — Sipariş/Teklif numarası (T-prefix otomatik S'ye çevriliyor)
- ComboBox `comboBoxMusteriAdi` — `MusteriBilgileri`'nden müşteri seçimi
- ComboBox `comboBoxUlke` — `UlkelerBilgileri`'nden ülke seçimi
- ComboBox `comboBoxKullaniciAdi` — `KullaniciBilgileri`'nden temsilci
- ComboBox `comboBoxOdemeDurum`, `comboBoxIslemDurum`, `comboBoxKontrol`
- 2 DateTimePicker — tarih aralığı

Tek query: `SiparisAlTablo INNER JOIN KullaniciBilgileri` + dinamik WHERE.
**Tek tablo** — birden çok tabloda LIKE araması YOK.

`siparisAlDataGridView_CellClick`: Bir satıra tıklanınca formun **alt tab'lerinde** sipariş
detayını yüklüyor (modern UI'da bu davranış `OrderDetailModal`'a karşılık geliyor).

### Modern UI eşleştirmesi

- Mevcut `SearchService.SearchAsync(filter)` zaten Ara.cs'in **birebir** karşılığı.
- Mevcut `pages/search/` muhtemelen bu yapılandırılmış aramayı kullanıyor.
- → Ara.cs **zaten portlanmış**.

### Faz 7 "Global Arama"

Faz 7'de eklenecek **Topbar Global Arama**, WinForms'ta **olmayan yeni bir özellik**.
Tek bir input → birden çok kategori (Sipariş, Müşteri, Bileşen, Kategori, Kullanıcı,
Satın Alma Talep) üzerinde paralel LIKE araması.

### Kategoriler (Faz 7 yeni)

| Kategori | Tablo | Aranan kolonlar | Navigasyon | Yetki |
|---|---|---|---|---|
| Sipariş | `SiparisAlTablo` | SiparisNo, TeklifNo, MusteriAd, MAdres | `/orders/{siparisNo}` | Tüm authenticated |
| Müşteri | `MusteriBilgileri` | MusteriAd, MTelefon, MMail, MVATNumarasi | `/customers/{id}` | Tüm authenticated |
| Bileşen | `BilesenBilgileri` | BilesenAdi | `/product-catalog/components/{id}` | Yonetici, Fabrika, Muhasebe |
| Kategori | `UrunKategorileri` | KategoriAdi | `/product-catalog/categories/{id}` | Yonetici, Fabrika, Muhasebe |
| Kullanıcı | `KullaniciBilgileri` | KullaniciAdi, Ad, Soyad, Email | `/users/{id}` | Yalnız Yonetici |
| Satın Alma Talep | `SatinAlmaTalep` | UrunAdi, TalepEdenKullaniciAdi | `/purchase/{id}` | omur, elshan, Muhasebe, Yonetici |

Her kategoriden max 5 sonuç; SQL'de tek union yerine kategori başına paralel query
(`Task.WhenAll`).

---

## (d) Yenilik.cs — Changelog

### Ne yapıyor (20 satır)

```csharp
public partial class Yenilik : Form
{
    public Yenilik()
    {
        InitializeComponent();
    }
}
```

`Yenilik.Designer.cs`: Tek bir `TextBox` (`Multiline=true, ReadOnly=true, ScrollBars=Vertical`).
Text içeriği: `resources.GetString("textBox1.Text")` — yani **.resx kaynağından okuyor**,
DB'den DEĞİL.

### `GuncellemeKontrol` tablosu

`GuncellemeKontrol`, kod tabanında **sadece Form1.cs satır 136**'da kullanılıyor:

```csharp
string query = "SELECT GuncellemeVersiyon FROM GuncellemeKontrol ORDER BY ID DESC LIMIT 1";
```

→ Bu tablo **login ekranındaki uygulama sürüm kontrolü** içindir, Yenilik formuyla
ilgisi yoktur.

### Sürüm/tarih bilgisi

Yenilik formunda sürüm/tarih alanı YOK. Sadece sabit metin var.

### Karar

**Hardcoded changelog (frontend statik).** `CrmModern.Web/src/data/changelog.ts` içine
versiyonlu girdiler. Modal: `UpdatesModal` — kullanıcı login sonrası `localStorage`'da
`lastSeenVersion` saklı; yeni versiyon varsa modal gösterilir.

→ **Yeni entity / endpoint GEREKMEZ.** (7.5 (i) yolu)

---

## (e) Foxer.cs — ne yapıyor?

### Ne yapıyor (49 satır)

```csharp
public partial class Foxer : Form
{
    private string Yetki;
    private MySqlConnection connection;
    public int KullaniciID;
    // ...
    private void Bilesen_Load(object sender, EventArgs e) { }
    private void iliskilendirButton_Click(object sender, EventArgs e) { }
    private void bilesenDataGridView1_CellClick(...) { }
    private async void button1_Click(object sender, EventArgs e) { }
}
```

**Tüm event handler'lar BOŞ.** Yalnız ctor, alan tanımları ve boş method gövdeleri var.

### Değerlendirme

- İsim ve değişken adları (`Bilesen_Load`, `iliskilendirButton_Click`,
  `bilesenDataGridView1`) bunun **bileşen ilişkilendirme (reçete)** için başlatılmış
  ama tamamlanmamış bir form olduğunu gösteriyor.
- Modern UI'da reçete/iliskilendirme akışı zaten `pages/product-catalog/RecetePage.tsx`'te
  portlanmıştır (Faz 1).

### Karar

**Portlanmıyor — atlanacak.** Rapora not düşülecek. Form3 menüsünden de çağrılmıyor (grep
sonucu: yalnız `using UnixPadelST;` namespace referansı var, hiçbir yer `new Foxer(...)`
çağırmıyor).

---

## Özet Karar Tablosu

| Form | Portlanacak mı? | Faz 7'de iş | Not |
|---|---|---|---|
| Form3 (dashboard kısmı) | Kısmi | Minimum dashboard kur | Grafikler WinForms'ta yorumlanmış |
| Form2 | Hayır | Yok | Zaten Faz 1+4'te akışlar portlandı |
| Ara | Hayır | Yok | Zaten `SearchService` olarak portlanmış |
| Yenilik | Evet (hardcoded) | Statik changelog + modal | Backend gereksiz |
| Foxer | Hayır | Yok | Boş iskelet form, ölmüş kod |

## Kullanılacak DB Tabloları (Faz 7)

Schema değişmez. Sadece **mevcut tablolardan okuma**:

- `SiparisAlTablo` (KPI'lar, sipariş arama, ay/aşama/top customer/currency)
- `MusteriBilgileri`, `BilesenBilgileri`, `UrunKategorileri`, `KullaniciBilgileri`,
  `SatinAlmaTalep` (global arama kategorileri)
- `KontrolKayitlari` (bekleyen kontrol KPI'sı — Yonetici)

Yeni entity / migration üretilmeyecek.
