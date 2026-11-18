# UnixPadel CRM · Tasarım Rehberi

Bu belge, uygulamaya eklenecek her yeni sayfanın nasıl görünmesi ve nasıl davranması gerektiğini anlatır. Kurallar mevcut koddan (v1.1.1) ve 40+ ergonomi çalışmasındaki kararlardan çıkarıldı.

**Öncelik sırası:** kod ile bu belge çelişirse önce Bölüm 15'e (Bilinen sapmalar) bak. Orada yazıyorsa kural geçerlidir, kod düzeltilecektir. Orada yoksa çelişkiyi çöz ve belgeyi güncelle. Metinlerde son söz [docs/ux-copy/00-sozluk.md](docs/ux-copy/00-sozluk.md) dosyasınındır.

**Hızlı başlangıç:**
1. Bölüm 3 ile sayfa türünü seç.
2. O türün iskeletini kopyala (Bölüm 4 veya Bölüm 5).
3. Bitirmeden önce Bölüm 14'teki kontrol listesini uygula.

---

## 1. Kim için tasarlıyoruz

Kullanıcılar 40–65 yaş arası, gün boyu aynı ekranlarda çalışan fabrika, lojistik, muhasebe ve satış personeli. Üç şey belirleyici:

- **Yakın görme zorluğu:** küçük yazı ve soluk renk iş kaybıdır.
- **Görev değiştirme maliyeti:** pencere aç-kapat, sekme arası gezinme dikkati dağıtır.
- **Doğruluk kaygısı:** para ve sipariş aşaması söz konusu. Kullanıcı yanlış tıklamaktan çekinir.

**Referans ekran:** 1280×720 CSS piksel (1920×1080, Windows %150 ölçek), yan menü açık (256 px), görünüm **Rahat**. Her sayfa önce burada çalışmalı. Sonra 1366×768 ve geniş ekranda denenir.

## 2. Temel ilkeler

| # | İlke | Pratikte |
|---|---|---|
| 1 | **Tek belirgin ana işlem** | Bir bölgede en çok bir dolu (primary) buton. Eş ağırlıklı buton ızgarası yok. |
| 2 | **Liste solda, kayıt sağda** | Kayıt açmak için pencere açılmaz. Satıra tıklamak sağ paneli değiştirir. |
| 3 | **Seçim adımı yok** | İlk kayıt kendiliğinden seçilir, panel boş açılmaz. |
| 4 | **Satırda buton yok** | Liste yalnız seçim içindir. İşlem panelin altındadır. |
| 5 | **Dikey alan içeriğindir** | Sekme ve açıklama başlığın yanına, filtre listenin üstüne, isteğe bağlı alan kapalı. |
| 6 | **Bir değer bir kez görünür** | Aynı tutar veya durum iki yerde tekrarlanmaz. |
| 7 | **Az kullanılan işlem saklanır, kaybolmaz** | İkincil ve yıkıcı işlemler tek bir "Diğer işlemler" menüsünde. |
| 8 | **Sonuç önceden söylenir** | Kritik onayda "Ne olacak?" ve "Sonraki adım" görünür. |
| 9 | **Her silme geri alınır** | Sunucuda yumuşak silme, ekranda "Geri al". |
| 10 | **Durum renkle değil, renk + metinle** | Rozet her zaman çevrilmiş etiket taşır. |

---

## 3. Sayfa türünü seç

| Sayfanın işi | Tür | Örnek ekranlar | İskelet |
|---|---|---|---|
| Kayıtlar arasında gezip her birinde **iş yapmak** | **İş ekranı** (liste + sağ panel) | Sipariş Kontrolü, Fabrika, Lojistik, Siparişlerim, Sipariş Ara, Muhasebe Onaylar / Tahsilat / Klasörler | `FillPage` + `MasterDetailLayout` |
| Kayıtları **aramak, görmek, dışa aktarmak**; detay gerekmiyor ya da ayrı sayfada | **Sade liste** | Müşteriler, Kullanıcılar, Tahsilat Geçmişi | `FillPage` + `FilterBar` + `FillRegion` |
| Tek kaydı **oluşturmak veya düzenlemek** | **Form sayfası** | Müşteri formu, Yeni Satın Alma Talebi, Yeni Sipariş | `PageHeader` + ortalanmamış form sütunu + alta yapışık işlem çubuğu |
| Birden çok kaynağı **özetlemek** | **Pano** | Ana Sayfa, Bekleyen İşler | `PageHeader` + kart ızgarası |

Kararsız kaldığında: kullanıcı aynı oturumda birden fazla kayıt işliyorsa **iş ekranıdır**.

---

## 4. İş ekranı (liste + sağ panel)

Uygulamanın ana kalıbı budur.

```text
┌ Üst çubuk (56 px, tek satır) ─ Layout verir ───────────────────────────────┐
├ PageHeader (compact) ──────────────────────────────────────────────────────┤
│ Başlık  [Sekme 3] [Sekme] │ [Tümü]   kısa açıklama…        [Önceki adım]   │
├──────────────────────────────────────┬─┬───────────────────────────────────┤
│ FilterBar (tek satır)                │ │ 2025-0123 [Durum] [Aşama]    [⛶]  │ ← panel başlığı
│ [Sipariş no] [Müşteri] [Diğer ▾][◧][↺]│ ├───────────────────────────────────┤
├──────────────────────────────────────┤↔│ tarih · şirket  [Klasör][Diğer ▾] │
│ 3 kayıt · Son güncelleme  [Yenile]…  │ │ Genel | Kalemler | Notlar | Geçmiş│
├──────────────────────────────────────┤ ├───────────────────────────────────┤
│ DataTable (kalan yükseklik)          │ │ Kayan içerik                      │
│ ▌seçili satır                        │ │                                   │
│  satır                               │ ├───────────────────────────────────┤
│  satır                               │ │ [        TEK ANA BUTON          ] │ ← sabit
└──────────────────────────────────────┴─┴───────────────────────────────────┘
└ Durum çubuğu ─ son mesaj + kısayol ipuçları ─ Layout verir ────────────────┘
```

### Bölge kuralları

**Sayfa başlığı** — `PageHeader density="compact"`
- Tek satır kalır. `meta`: sekmeler. `description`: başlığın yanında, sığmazsa kısalır.
- `actions`: en çok bir iki ikincil öğe (ör. `WaitingUpstreamPanel variant="button"`, Excel). Ana işlem buraya konmaz; "Yeni …" oluşturma düğmesi istisnadır.

**Sekmeler** — yalnız farklı iş kuyrukları varsa
- Kuyruk sekmeleri sayaç taşır. Genel liste ("Tümü", "Ara") ayraçtan sonra ikincil görünümde durur.
- Sekmeye özel filtre o sekme açıkken görünür.
- Kalıp: [QueueTabs.tsx](CrmModern.Web/src/pages/accounting/approval/QueueTabs.tsx).

**Filtre** — `FilterBar`, `list` bölgesinin **içinde**
- Filtre yalnız listeyi süzer. Tam genişlikte konursa sağ paneli aşağı iter.
- `primaryCount={2}` ile iki alan görünür, kalanı "Diğer filtreler"e girer. Gizli filtre etkinse çubuk açık gelir.
- Durum URL'de tutulur (`useFilterState`), yazı filtresi 300 ms geciktirilir (`useDebouncedValue`).

**Liste** — `DataTable fill`
- Liste sütunu referans ekranda yaklaşık **555–575 px**. Varsayılan **3–5 sütun** yatay kaymadan sığmalı; gerisi `defaultHidden`.
- Anahtar sütun `pin: 'left'`, `hideable: false`. Uzun metin `truncate: '10rem'`.
- `actionBar={false}`, `rowGoneNotice={false}` (işlemler panelde, seçimi sayfa yönetir).
- `rowActions` yalnız sağ tık kısayoludur; orada olup panelde olmayan işlem bırakma.
- Varsayılan sütunlar değişirse `tableId` sonekini artır (`-v2` → `-v3`), eski kayıtlı düzen yenisini ezmesin.

**Panel** — `MasterDetailLayout`
- `open` hep açık, `onClose` verilmez. `defaultShare` 0.40–0.42. Kullanıcı sürükleyerek %28–70 arasında ayarlar; değer kullanıcı ve sayfa bazında saklanır. 900 px altında panel listenin altına iner.
- Başlık: kayıt numarası. Durum rozetleri `usePanelHeaderSlot()` ile başlık şeridine taşınır.
- Sipariş gösteren ekranda `OrderWorkPanel` kullan. Detay başlığına ek işlem gerekiyorsa `extraActions` ver; **ikinci menü açma**.
- Sipariş dışı kayıtta panel üç parçadır: rozet, kayan içerik, sabit alt bölge (aşağıdaki iskelet).
- Satır seçili değilse boş durum: `MousePointerClick` simgesi + ne yapılacağını söyleyen tek cümle.

**Panelin alt bölgesi** — `shrink-0 space-y-2 border-t bg-card px-4 py-2`
- `size="lg"`, tam genişlik **tek ana buton**. Her zaman görünür, içerikle birlikte kaymaz.
- Reddet gibi karşıt işlem gerekiyorsa ayraçla ayrılmış `variant="outline"` + `text-danger`.
- İsteğe bağlı alan kapalı başlar: "+ Onay notu ekle · isteğe bağlı". Tıklayınca açılır, imleç içine gelir.
- Yapılacak iş yoksa bölge hiç çizilmez.

**Yükseklik hedefi:** referans ekranda panelin kayan içeriği **en az 280 px** kalmalı. Mevcut ekranlar 283–410 px aralığında (sahte veriyle, Rahat görünümde ölçüldü).

### İskelet

`samples` yalnız örnek addır. Kod derleme denetiminden geçirildi.

```tsx
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCheck, MousePointerClick, Trash2 } from 'lucide-react'
import { approveSample, deleteSample, getSamples, restoreSample, type SampleDto } from '@/api/samples'
import { DataTable, type Column } from '@/components/DataTable'
import { FillPage } from '@/components/FillPage'
import { ALL, FilterBar, FilterField, moreFilterCount, useFilterState } from '@/components/FilterBar'
import { MasterDetailLayout, usePanelHeaderSlot } from '@/components/MasterDetailLayout'
import { PageHeader } from '@/components/PageHeader'
import { RowActionsMenu } from '@/components/RowActionsMenu'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { KeyValue } from '@/components/ui/key-value'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppMutation } from '@/hooks/useAppMutation'
import { useAutoSelectFirst } from '@/hooks/useAutoSelectFirst'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { formatDate } from '@/lib/utils'

type Row = SampleDto & Record<string, unknown>
const FILTER_DEFAULTS = { no: '', musteri: '', durum: ALL }

export function SamplesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { confirm } = useConfirm()
  const undoable = useUndoableDelete()
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)
  const filter = useDebouncedValue(f, 300)
  const [activeId, setActiveId] = useState<number | null>(null)

  const { data = [], isLoading, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['samples', filter],
    queryFn: () => getSamples(filter),
    placeholderData: keepPreviousData, // yenilemede tablo boşalmaz
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['samples'] })

  useAutoSelectFirst(data.map((r) => r.id), activeId, setActiveId, isLoading)
  const active = data.find((r) => r.id === activeId) ?? null

  const approveMut = useAppMutation({
    mutationFn: (id: number) => approveSample(id),
    invalidate: false, // sipariş verisine dokunmayan işlem
    onSuccess: refresh,
    successTitle: t('samples.toast.approved'),
    notify: 'toast', // kayıt listeden çıkıyorsa; ekranda kalıyorsa bu satırı sil
    errorTitle: t('samples.toast.approveFailed'),
  })

  const askApprove = async (row: SampleDto) => {
    const ok = await confirm({
      title: t('samples.approveTitle'),
      description: `${row.no} · ${row.musteriAd}`,
      impact: [t('samples.impact.approve')],
      confirmLabel: t('samples.approve'),
    })
    if (ok) approveMut.mutate(row.id)
  }

  const askDelete = async (row: SampleDto) => {
    const ok = await confirm({
      title: t('samples.deleteTitle'),
      description: row.no,
      destructive: true,
      confirmLabel: t('common.delete'),
    })
    if (!ok) return
    await deleteSample(row.id)
    await refresh()
    undoable({ name: row.no, restore: () => restoreSample(row.id), onRestored: refresh })
  }

  const columns: Column<Row>[] = [
    { key: 'no', pin: 'left', hideable: false, sortable: true, header: t('samples.no'),
      render: (r) => <span className="font-mono text-xs">{r.no}</span> },
    { key: 'musteriAd', truncate: '10rem', sortable: true, header: t('common.customer') },
    { key: 'durum', sortable: true, header: t('common.status'),
      render: (r) => <StatusBadge value={r.durum} context="purchase" /> },
    { key: 'tarih', type: 'date', sortable: true, header: t('common.date'),
      render: (r) => formatDate(r.tarih) },
  ]

  return (
    <FillPage>
      <PageHeader density="compact" title={t('samples.title')} description={t('samples.description')} />
      <MasterDetailLayout
        pageId="samples"
        open
        defaultShare={0.42}
        panelLabel={t('samples.panel')}
        title={active ? <span className="font-mono">{active.no}</span> : t('samples.panel')}
        headerActions={active && (
          <RowActionsMenu row={active} label={t('common.moreActions')} actions={[{
            key: 'delete', label: t('common.delete'), destructive: true,
            icon: <Trash2 className="h-4 w-4" aria-hidden />, onSelect: (r) => void askDelete(r),
          }]} />
        )}
        list={<>
          <FilterBar className="mb-2 shrink-0" onReset={reset} tableId="samples" values={f}
            onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}
            primaryCount={2} moreActiveCount={moreFilterCount(f, FILTER_DEFAULTS, ['no', 'musteri'])}>
            <FilterField label={t('samples.no')}>
              <Input inputSize="sm" value={f.no} onChange={(e) => set('no', e.target.value)} />
            </FilterField>
            <FilterField label={t('common.customer')}>
              <Input inputSize="sm" value={f.musteri} onChange={(e) => set('musteri', e.target.value)} />
            </FilterField>
            <FilterField label={t('common.status')}>
              <Select value={f.durum} onValueChange={(v) => set('durum', v)}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={ALL}>{t('common.all')}</SelectItem></SelectContent>
              </Select>
            </FilterField>
          </FilterBar>
          <DataTable
            fill
            tableId="samples-v1"
            exportFileName="numuneler"
            columns={columns}
            data={data as Row[]}
            keyField="id"
            loading={isLoading}
            error={isError}
            updatedAt={dataUpdatedAt}
            onRefresh={() => void refetch()}
            activeRowKey={activeId}
            onRowClick={(r) => setActiveId(r.id)}
            onActiveRowChange={(r) => setActiveId(r.id)} // ↑/↓ paneli de değiştirir
            actionBar={false}
            rowGoneNotice={false}
          />
        </>}
        detail={
          <SamplePanel
            row={active}
            emptyText={t(data.length ? 'masterDetail.selectHint' : 'masterDetail.emptyList')}
            pending={approveMut.isPending}
            onApprove={() => active && void askApprove(active)}
          />
        }
      />
    </FillPage>
  )
}

function SamplePanel({ row, emptyText, pending, onApprove }: {
  row: SampleDto | null
  emptyText: string
  pending: boolean
  onApprove: () => void
}) {
  const { t } = useTranslation()
  const headerSlot = usePanelHeaderSlot()

  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
        <MousePointerClick className="h-8 w-8" aria-hidden />
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {headerSlot && createPortal(<StatusBadge value={row.durum} context="purchase" />, headerSlot)}

      {/* Kayan içerik */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-2">
        <p className="break-words text-base font-semibold">{row.musteriAd}</p>
        <KeyValue label={t('common.date')} value={formatDate(row.tarih)} />
      </div>

      {/* Sabit alt bölge: tek ana buton */}
      <div className="shrink-0 space-y-2 border-t bg-card px-4 py-2">
        <Button size="lg" className="w-full" loading={pending} onClick={onApprove}>
          <CheckCheck className="h-4 w-4" aria-hidden /> {t('samples.approve')}
        </Button>
      </div>
    </div>
  )
}
```

Birden çok kullanıcının aynı kuyruğu işlediği ekranlarda sorguya `refetchInterval: 30_000`, `refetchOnWindowFocus: 'always'`, `staleTime: 0` ekle ([FactoryPage.tsx](CrmModern.Web/src/pages/factory/FactoryPage.tsx)).

---

## 5. Diğer sayfa türleri

### Sade liste

Panel olmadığı için filtre tam genişliktedir.

```tsx
<FillPage>
  <PageHeader density="compact" title={t('x.title')}
    actions={<Button size="sm"><Plus className="h-4 w-4" aria-hidden /> {t('common.add')}</Button>} />
  <div className="space-y-2 px-4 pt-2">
    <FilterBar onReset={reset}>…</FilterBar>
  </div>
  <FillRegion className="pt-2">
    <DataTable fill tableId="x-v1" columns={columns} data={rows} keyField="id" rowActions={actions} />
  </FillRegion>
</FillPage>
```

- Sayfa dikeyde kaymaz, tablo kendi içinde kayar.
- Panel olmadığından `actionBar` açık kalır: seçili satırın işlemleri tablonun üstünde etiketli butonlar olur.
- Toplamlar KPI kartı yerine tek satırlık şerit veya tablo alt toplamıdır.

### Form sayfası

```tsx
<div>
  <PageHeader title={t('x.newTitle')} actions={<SaveStatus savedAt={savedAt} saving={mut.isPending} dirty={dirty} />} />
  <div className="max-w-3xl space-y-4 p-4 lg:p-6" onKeyDown={enterNavigation ? onEnterNav : undefined}>
    <FormField label={t('x.name')} required error={submitted && !form.name ? t('validation.required') : null}>
      <Input value={form.name} onChange={…} />
    </FormField>
    <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-canvas px-4 py-2.5 lg:-mx-6 lg:px-6">
      <Button variant="outline" onClick={() => nav(-1)}>{t('common.cancel')}</Button>
      <Button loading={mut.isPending} onClick={submit}>{t('common.save')}</Button>
    </div>
  </div>
</div>
```

- Tek sütun esastır. Yalnız birlikte okunan kısa alanlar yan yana durur (tutar + tarih, posta kodu + şehir).
- Etiket her zaman alanın üstünde, `FormField` ile. Zorunlu yıldızını `required` ekler.
- Hata ilk gönderimden sonra alanın altında görünür; `focusFirstError` ilk hatalı alana götürür.
- Kaydet her zaman görünür: alta yapışık çubuk.
- Çıkış koruması `useUnsavedChangesGuard(dirty && !leaving)`, Enter ile gezinme `useEnterNavigation`.
- Riskli veya çok alanlı kayıt önce önizlemeden geçer (Yeni Sipariş kalıbı).

### Pano

- `PageHeader` normal yoğunlukta. İçerik `p-4 lg:p-6`.
- Kartlar pencereye değil alana göre dizilir: `grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3`.
- Her KPI bir işe götürür (`KPICard to=…`). Tıklanmayan süs sayı koyma.
- Kart yalnız gerçekten ayrı bir özeti taşıyorsa kullanılır. Liste ekranlarını karta bölme.

---

## 6. Yazı ve ölçü

Tüm boyutlar tek ayardan büyür. **Sabit piksel yazma** (`text-[11px]`, `h-[37px]` yok).

| Sınıf | Rahat (varsayılan) | Standart | Kullanım |
|---|---|---|---|
| `text-2xs` | 14 px | 12 px | Filtre etiketi, menü rozeti. En küçük yazı. |
| `text-xs` | 15 px | 13 px | Rozet, tablo yardımcı metni, ipucu, sipariş no |
| `text-sm` | 16 px | 14 px | **Gövde metni**, buton, alan, bölüm başlığı |
| `text-base` | 17 px | 16 px | Sıkı sayfa başlığı, paneldeki kayıt adı |
| `text-lg` | 19 px | 18 px | Normal sayfa başlığı |
| `text-xl` | 20 px | 20 px | Yalnız KPI sayısı |

| Kontrol | Rahat | Standart | Kullanım |
|---|---|---|---|
| `xs` (`h-ctl-xs`) | 36 px | 32 px | Araç çubuğu, filtre düğmeleri, panel başlığı |
| `sm` (`h-ctl-sm`) | 40 px | 36 px | Filtre alanı, sayfa başlığı düğmesi, sekme |
| varsayılan (`h-ctl-md`) | 44 px | 40 px | Form alanı, pencere düğmesi |
| `lg` (`h-ctl-lg`) | 48 px | 44 px | **Ana işlem** |
| `h-check` | 22 px | 18 px | Onay kutusu |

**Hiyerarşi** renk açıklığıyla değil, boyut, kalınlık ve konumla kurulur: `font-semibold` başlık ve vurgu, `font-medium` düğme ve etiket. Yazı tipi sistem yazısıdır (Windows'ta Segoe UI); web fontu eklenmez. Sayılar `tabular-nums` kullanır.

**Boşluk** 4 px adımlıdır:

| Yer | Değer |
|---|---|
| Sıkı sayfa ve panel yan boşluğu | `px-4` |
| Normal sayfa içeriği | `p-4 lg:p-6` |
| Filtre çubuğu iç boşluğu, kontrol araları | `p-2`, `gap-2` |
| Panel içi bölümler | `space-y-2.5` |
| Kart ızgarası | `gap-3` / `gap-4` |
| Sabit alt bölge | `px-4 py-2`, `space-y-2` |

**Köşe ve derinlik:** kontrol `rounded-md`, kart ve pencere `rounded-lg`, rozet `rounded-full`. Sayfa zemini `bg-canvas`, yüzeyler `bg-card`. Ayrım önce çerçeveyle (`border`) yapılır; gölge yalnız kart (`shadow-sm`) ve üstte açılan katmanlardadır (`shadow-lg`).

**Dar alan:** genişliğe göre düzen pencereye değil kaba bakmalı. `auto-fill` ızgarası veya `cq` + `cq-md:` varyantlarını kullan.

## 7. Renk

Her renk [index.css](CrmModern.Web/src/index.css) belirtecinden gelir. `bg-blue-600`, `text-red-500`, `#...` yazılmaz.

| Belirteç | Anlamı |
|---|---|
| `background`, `card` | Beyaz yüzeyler |
| `canvas` | Sayfa zemini |
| `foreground` | Ana metin |
| `muted-foreground` | İkincil metin |
| `muted`, `accent` | Tablo başlığı, sekme şeridi, üzerine gelme, etkin satır |
| `primary` | Ana işlem, seçili sekme, bağlantı, odak |
| `border`, `border-strong`, `input` | Ayraç, düğme çerçevesi, alan çerçevesi |
| `field-*` | Alan etiketi, yer tutucu, salt okunur ve odak zemini |

**Durum tonları** — metinde `text-danger` kullan, `text-destructive` değil. `destructive` yalnız dolu tehlike butonudur.

| Ton | Anlamı | Örnek |
|---|---|---|
| `neutral` | Henüz akışa girmedi, pasif | Teklif, Pasif |
| `info` | Akışta ilerliyor | Sipariş, Planlama, Yolda |
| `progress` | Üzerinde aktif çalışılıyor | Üretim |
| `success` | Tamamlandı, onaylandı | Hazır, Onaylandı, Ödendi |
| `warning` | Birini bekliyor, dikkat | Kontrolde, Beklemede |
| `danger` | Reddedildi, iptal, hata | Reddedildi, İptal |

- Yeni durum yalnız [lib/status.ts](CrmModern.Web/src/lib/status.ts) içine eklenir (etiket + ton tek kayıt). Sayfada renk seçilmez, `StatusBadge` kullanılır. Veritabanı değeri Türkçe kalır, yalnız etiket çevrilir.
- Uyarı kutusu: `rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground`. Diğer tonlar aynı kalıpla.
- Renk bir durum bildirir, süs değildir. Durumla ilgisi olmayan renkli alan kullanma.

**Ölçülen kontrast (açık tema):**

| Çift | Oran |
|---|---|
| Ana metin / beyaz | 16.96:1 |
| İkincil metin / beyaz, zemin, muted | 9.11, 7.90, 7.60:1 |
| Primary üstü yazı | 7.60:1 |
| Tüm `*-soft` rozet çiftleri | 7.78–9.01:1 |
| Yer tutucu / beyaz | 4.72:1 |
| Alan çerçevesi / beyaz | 3.81:1 |

Yeni renk çifti metinde **en az 7:1** (yer tutucu 4.5:1), kontrol sınırında 3:1 sağlamalı.

**Koyu tema:** belirteçleri tanımlı ama açma düğmesi yok, yani etkin değil. Belirteç kullanırsan hazır kalır. `dark:` sınıfı ekleme.

---

## 8. Bileşenler

Önce var olanı kullan. Yenisini yazmadan `src/components` ve `src/components/ui` içine bak.

### Butonlar

| Görünüm | Ne zaman |
|---|---|
| `default` | Bölgenin tek ana işlemi |
| `outline` | İkincil işlem, Vazgeç |
| `outline` + `text-danger` | Ana işlemin yanındaki Reddet |
| `ghost` | Araç çubuğu ve panel başlığı işlemleri |
| `destructive` | Yalnız silme / geri dönülmez onay penceresinde |
| `link` veya metin bağlantısı | "Kalan bakiyeyi yaz", "+ Not ekle" gibi yardımcı işlem |

- Düğmenin **adı yazılır**. Yalnız simgeli düğme sadece dar alanda ikincil işlem içindir ve `title` + `aria-label` zorunludur (Tam ekran, Görünümler, Sıfırla).
- Bekleme: `loading`. Satır bazlı bekleme: `mut.isPendingFor(...)`.
- Pasif düğmenin sebebi altında görünür: `disabled={!!reason} disabledReason={reason}`. Tam genişlikte `wrapperClassName="w-full"` de ver.
- Etiket eylem fiilidir: "Hazır olarak işaretle". "Evet", "Tamam" kullanılmaz.
- Simge: `lucide-react`, düğmede `h-4 w-4`, `xs` düğmede `h-3.5 w-3.5`, her zaman `aria-hidden`.

### Menü

- Kayıt başına **tek** menü: `RowActionsMenu`, etiketi "Diğer işlemler". Hover ile değil, tıklayınca açılır.
- Yıkıcı öğe `destructive: true`, gerekirse `separatorBefore`.
- İşlem tanımı `RowAction[]` olarak bir kez yazılır; sağ tık ve menü aynı kaydı kullanır.

### Form alanları

- `FormField` + `Input` / `Textarea` / `Select` / `Combobox`; tutarda `DecimalInput`.
- Filtrede `FilterField` + `inputSize="sm"` / `SelectTrigger size="sm"`.
- Salt okunur gösterim: `KeyValue` (satır) veya `ReadOnlyField` (kutu). Pasif alanı metin göstermek için kullanma.
- Boş değer `—` olarak yazılır.

### Tablo verisi

| Veri | Yazım |
|---|---|
| Sipariş no | `font-mono text-xs` |
| Para | `type: 'money'`, `formatCurrency(tutar, paraTipi)` |
| Tarih | `type: 'date'`, `formatDate` / `formatDateShort` |
| Durum | `StatusBadge` |
| Alt toplam | `showFooter` + `footerGroups={{ by: (r) => r.paraTipi, order: PARA_TIPLERI }}`; farklı döviz toplanmaz |

Para yetkisi olmayan rolde tutarlar gizlenir (`hideMoneyFor`).

### Pencereler

Pencere **kayıt görmek için değil**, kısa bir girdi veya onay içindir. `Dialog` (Radix) odağı içeride tutar ve Esc ile kapanır. İstisna: Sipariş Ara'da sağ panel özet gösterir, tüm ayrıntı "Siparişi Aç" ile `OrderDetailModal` penceresinde açılır.

| `size` | Genişlik | Kullanım |
|---|---|---|
| `sm` | 384 px | Tek soru |
| `md` (varsayılan) | 512 px | Kısa form |
| `lg` | 672 px | Önizleme, çok alanlı form |
| `xl`, `2xl`, `full` | 896, 1152 px, %95 | Tam ekran detay, belge |

Altta önce Vazgeç (`outline`), sonra eylem. Formda Ctrl+Enter gönderir.

---

## 9. Her bileşenin durumları

| Durum | Davranış |
|---|---|
| **Üzerine gelme** | Renk değişimi; Tailwind yalnız fareli cihazda uygular |
| **Klavye odağı** | `focus-visible:ring-2 ring-ring ring-offset-2`. Halkayı kaldırıp yerine bir şey koymamak yasak |
| **Basılı / seçili** | `aria-selected`, `aria-current`; yalnız renge bağlı kalma |
| **Pasif** | Sebep görünür metin. Alan: kesikli çerçeve + gri zemin, değer okunur |
| **Yükleniyor** | Tablo iskelet satırları (`loading`), sayfa `PageLoader`, düğme `loading`. Yenilemede eski veri kalır (`keepPreviousData`) |
| **Boş** | Ne olduğunu ve sıradaki adımı söyler: "Henüz … yok." `emptyMessage`; sipariş aramasında `useNotHereHint` siparişin hangi adımda olduğunu yazar |
| **Hata** | Tablo `error`, işlem `toastApiError`, alan `FormField error`. Hata ekrandan kendiliğinden gitmez |

## 10. Geri bildirim ve güvenlik

**Mesajın yeri:**

| Durum | Yer | Kod |
|---|---|---|
| Sonuç ekranda görünüyor | Durum çubuğu | `useAppMutation` varsayılanı |
| Form kaydedildi | İşlemin yanında | `SaveStatus` |
| Kayıt listeden çıktı | Açılır mesaj | `notify: 'toast'` |
| Silindi | Açılır mesaj + Geri al | `useUndoableDelete` |
| Hata | Kapatılana dek kalan mesaj + durum çubuğu | `errorTitle` / `toastApiError` |

**Onay pencereleri** (`useConfirm`):
- Başlık soru: "… silinsin mi?". Açıklamada kayıt adı.
- `impact`: "Ne olacak?" maddeleri. `warnings`: eksikler. `nextStep`: `useNextStepLabel` ile iş akışından gelen adım.
- Art arda iş yapılan kuyrukta `confirmChoice` + `altLabel` ("Onayla ve sonrakine geç").
- Gerekçe gereken işlemde `askReason`. `window.confirm` / `prompt` yok.
- Yıkıcı onayda varsayılan odak Vazgeç'tedir.
- Her küçük işleme onay sorma: yalnız aşama değiştiren, para etkileyen veya başkasının işini başlatan işlemlere.

**Silme:** yeni kayıt türünde sunucuda yumuşak silme + `POST …/restore` zorunlu. Ekranda `useUndoableDelete`; yetkili kullanıcıya "Silinenleri göster" ve "Geri yükle".

**İç denetim:** sipariş zinciri ekranlarında yalnız bir önceki bekleyen adım gösterilir (`WaitingUpstreamPanel`, kaynak `OrderWorkflow.cs`).

## 11. Klavye ve erişilebilirlik

- Tablo: ↑/↓ satır, Enter aç, Boşluk seç, Shift+F10 satır menüsü. Filtreye `/`, filtre uygula F8, yenile F5, Hızlı Erişim Ctrl+K, yardım F1.
- Sayfanın kısayolları `useShortcutHints` ile durum çubuğunda görünür.
- Sayfada tek `h1` (`PageHeader`), bölümler `SectionTitle` ile `h2`/`h3`.
- Simgesiz ad yoksa `aria-label`; süs simgesi `aria-hidden`. Bölgeler adlandırılır (`aria-label`, `role="search"`, `role="tablist"`).
- Sayaçların ekran okuyucu metni olur (`nav.pendingCount`).
- Hareket: yalnız `transition-colors`, en çok 150 ms. Sistemde "hareketi azalt" açıksa animasyon kapanır.
- Uygulama yalnız TR/EN soldan sağa çalışır; fiziksel `left/right` sınıfları kabul edilir.

## 12. Metin

- Tüm yazılar `t('...')` ile; `src/i18n/locales/tr.json` ve `en.json` birlikte güncellenir. Kodda düz Türkçe metin bırakma.
- Terimler [sözlükten](docs/ux-copy/00-sozluk.md). Bir kavram, tek kelime: Peşinat, Tahsilat, Satış Temsilcisi, Nakliye firması.
- "Sen" hitabı, kısa cümle: "Tutar gir", "Müşteri seç".
- Yasak: "lütfen", "başarıyla", "gerçekleştirilmektedir", "optimize", "kesintisiz", "please", "successfully".
- Başarı "Kaydedildi." Hata "Kaydedilemedi. Tekrar dene." Boş "Henüz … yok."

## 13. Yapılmayacaklar

- Satır başına düğme sütunu
- Kayıt detayını açmak için pencere (Tam ekran ve Sipariş Ara'daki "Siparişi Aç" hariç)
- Sayfa başına birden çok dolu düğme veya eş ağırlıklı düğme ızgarası
- Başlık altında ayrı sekme veya açıklama satırı (sıkı sayfalarda)
- İş ekranında tam genişlik filtre çubuğu
- Aynı kayıt için ikinci "Diğer işlemler" menüsü
- 14 px altı yazı (Rahat), sabit piksel, ham Tailwind rengi, hex
- Yalnız üzerine gelince görünen işlem veya bilgi
- Başarı için köşe mesajı (sonuç ekrandaysa)
- Geri alınamaz silme
- Degrade, cam efekti, parlayan arka plan, süs illüstrasyon, süs KPI kartı, ortalanmış uzun metin

---

## 14. Yeni sayfa kontrol listesi

**Bağlama**
- [ ] `src/pages/<alan>/XPage.tsx`, adlandırılmış export
- [ ] [App.tsx](CrmModern.Web/src/App.tsx): `lazy` import + `Route`, gerekiyorsa `RoleGuard`
- [ ] [lib/navigation.ts](CrmModern.Web/src/lib/navigation.ts): `NAV_ITEMS` kaydı (grup, simge, benzersiz `code`, `roles`). Menü, Ctrl+K ve Ana Sayfa buradan okur
- [ ] `tr.json` + `en.json`, `nav.*` menü adı dahil
- [ ] [data/guide.ts](CrmModern.Web/src/data/guide.ts): ekranın kılavuz bölümü
- [ ] Yayında [data/changelog.ts](CrmModern.Web/src/data/changelog.ts): TR + EN not

**Düzen** (1280×720, yan menü açık, Rahat)
- [ ] Doğru sayfa türü seçildi
- [ ] Sayfa yatay kaymıyor; varsayılan liste sütunları sığıyor
- [ ] Başlık ve filtre çubuğu tek satır
- [ ] Panel içeriği en az 280 px
- [ ] Standart görünümde ve İngilizce metinle de bozulmuyor

**Davranış**
- [ ] Bölgede tek ana işlem; ilk kayıt seçili geliyor
- [ ] Yükleniyor, boş, hata ve pasif durumları var
- [ ] Kritik işlem etki önizlemeli; silme geri alınabilir
- [ ] Mesaj doğru yerde (durum çubuğu / açılır mesaj)
- [ ] Klavyeyle tüm akış yapılabiliyor, odak halkası görünüyor

**Kod**
- [ ] Yalnız belirteçler: sabit piksel ve ham renk yok
- [ ] `useAppMutation`, `FormField`, `StatusBadge`, `useConfirm` kullanıldı
- [ ] `npx tsc -b` temiz

## 15. Bilinen sapmalar

Eski kodda kurala uymayan yerler. **Yeni sayfada örnek alma**; dosyaya dokunurken düzelt.

| Yer | Sapma | Doğrusu |
|---|---|---|
| `pages/admin/SystemSettingsPage.tsx` (22), `components/OrderDetailModal.tsx` (11) | Ham Tailwind renkleri | Durum / yüzey belirteçleri |
| `components/WorkQueuePanel.tsx` | Metinde `text-destructive` | `text-danger` |
| `CustomerFormPage`, `NewPurchaseRequestPage`, `UsersPage`, `LoginPage`, `QualityControlPage` | Elle `Label` + `FieldError` | `FormField` |
| `CustomerFormPage`, `NewPurchaseRequestPage`, `NewOrderPage`, `CustomersPage`, `UsersPage` ve diğerleri (11 dosya) | Doğrudan `useMutation` | `useAppMutation` (giriş gibi özel akışlar hariç) |
| `CustomerFormPage` | Alt çubukta `backdrop-blur`, düğmede `disabled` | Düz `bg-canvas`, `loading` |
| `QueueTabs.tsx`, `QualityControlPage.tsx` | Sayfa sekmesi iki yerde elle yazılmış | Üçüncü kullanımda ortak `PageTabs` bileşeni çıkar |
| `QualityControlPage` alt bölgesi | `py-3` | `py-2` |
| `WorkQueuePanel`, `SetTabPanel`, `FillPage` | `h-7`, `min-h-8` sabit yükseklik | `h-ctl-*` |
| `MyOrdersPage` | Her şeyi gören kullanıcıda 1366 px'te liste yana taşıyor | Varsayılan sütunları azalt |
