import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCheck, Factory } from 'lucide-react'
import { getFactoryOrders, moveToProduction, markReady, type FactoryFilter } from '@/api/factory'
import { getUsersLookup } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { FilterBar, FilterField, ALL, useFilterState, useDefaultView } from '@/components/FilterBar'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { useNotHereHint } from '@/hooks/useNotHereHint'
import { useShortcutHints } from '@/components/StatusBar'
import { statusLabel } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ToastProvider'
import { useAppMutation } from '@/hooks/useAppMutation'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/lib/utils'
import { describeApiError } from '@/lib/axios'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import type { FactoryOrderListDto } from '@/types'
import { localDateTimeInput } from '@/lib/date'

// FactoryService.GetProductionStagesAsync 5 aşama dönüyor.
const FACTORY_ASAMALAR = ['Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi'] as const

type Row = FactoryOrderListDto & Record<string, unknown>

const FILTER_DEFAULTS = {
  siparisNo: '', musteriAd: '', mUlke: '', kullaniciID: ALL, asama: ALL, baslangicTarih: '', bitisTarih: '',
}

/**
 * Fabrika / Üretim. Bu turdaki iyileştirmeler:
 *  • SR-5/QW-15 — ortak FilterBar, URL'de kalıcı filtreler, 300 ms debounce,
 *    yenilemede tablo boşalmaz (keepPreviousData), kayıtlı görünümler (E-6).
 *  • E-9 — satır seçilince sağda sipariş detayı (liste görünür kalır).
 *  • E-17 — toplu "Üretime Al" (tek tarih + not) ve toplu "Hazır"; sonuç özeti.
 *  • F0-6 — üretim tarihi yerel saat ve pencere her açılışta "şimdi"ye sıfırlanır.
 *  • SR-7 — satır bazlı bekleme (yalnız tıklanan satırın butonu döner).
 */
export function FactoryPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const [params] = useSearchParams()
  // PROMPT-v6 §1.1 — Üretime Al / Hazır aşama geçişleri yalnız simge.cakir
  // (backend Forbid + buton render gate'i). §24 — Admin de yapabilir.
  const isFactoryUser = getUser()?.kullaniciAdi === 'simge.cakir' || isSuperAdmin(getUser())
  const [productionTargets, setProductionTargets] = useState<string[]>([])
  const [fabrikaNot, setFabrikaNot] = useState('')
  const [noteTouched, setNoteTouched] = useState(false)
  const [sTarih, setSTarih] = useState(() => localDateTimeInput())
  const [bulkRunning, setBulkRunning] = useState(false)
  const [activeNo, setActiveNo] = useState<string | null>(() => params.get('sel'))
  const [selection, setSelection] = useState<(string | number)[]>([])

  // Faz-fix 2.2 — Fabrika.cs çoklu filtre. Boş alanlar query'ye gönderilmez.
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)
  useDefaultView('factory', Object.values(f).some((v, i) => v !== Object.values(FILTER_DEFAULTS)[i]), (v) => setAll(v as typeof FILTER_DEFAULTS))
  const debounced = useDebouncedValue(f, 300)
  const filter: FactoryFilter = useMemo(() => ({
    siparisNo: debounced.siparisNo || undefined,
    musteriAd: debounced.musteriAd || undefined,
    mUlke: debounced.mUlke || undefined,
    kullaniciID: debounced.kullaniciID !== ALL ? Number(debounced.kullaniciID) : undefined,
    asama: debounced.asama !== ALL ? debounced.asama : undefined,
    baslangicTarih: debounced.baslangicTarih || undefined,
    bitisTarih: debounced.bitisTarih || undefined,
  }), [debounced])

  const { data: users = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup })
  // Round-8 §11 — Temsilci filtresi yalnız Temsilci rolündeki kullanıcıları listeler.
  const temsilciUsers = useMemo(() => users.filter((u) => u.yetkiTuru === 'Temsilci'), [users])

  const { data = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['factory', filter],
    queryFn: () => getFactoryOrders(filter),
    placeholderData: keepPreviousData,
    // PROMPT-v7 §3 — canlılık: başka makinedeki onay ≤30 sn'de yansısın.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  })
  const notHere = useNotHereHint(debounced.siparisNo, !isLoading && !isError && data.length === 0)

  const toProductionMut = useAppMutation({
    mutationFn: ({ siparisNo, dto }: { siparisNo: string; dto: { sTarih: string; fabrikaNot: string } }) =>
      moveToProduction(siparisNo, dto),
    successTitle: t('factory.toast.movedToProduction'),
    successDescription: (_d, v) => v.siparisNo,
    errorTitle: t('factory.toast.moveFailed'),
    onSuccess: () => { setProductionTargets([]); setFabrikaNot('') },
  })

  const readyMut = useAppMutation({
    mutationFn: (siparisNo: string) => markReady(siparisNo),
    successTitle: t('factory.toast.markedReady'),
    successDescription: (_d, no) => no,
    errorTitle: t('factory.toast.readyFailed'),
  })

  const openProduction = (nos: string[]) => {
    setProductionTargets(nos)
    setFabrikaNot('')
    setNoteTouched(false)
    setSTarih(localDateTimeInput()) // F0-6 — her açılışta yerel "şimdi"
  }

  const askReady = async (nos: string[]) => {
    const ok = await confirm({
      title: t('factory.readyConfirmTitle', { count: nos.length }),
      description: nos.join(', '),
      confirmLabel: t('factory.ready'),
    })
    if (!ok) return
    if (nos.length === 1) { readyMut.mutate(nos[0]); return }
    await runBulk(nos, (no) => markReady(no), t('factory.toast.markedReady'))
  }

  /** E-17 — sıralı toplu işlem; sonuçta başarılı/hatalı özeti. */
  const runBulk = async (nos: string[], fn: (no: string) => Promise<unknown>, title: string) => {
    setBulkRunning(true)
    const failed: string[] = []
    let lastErr: unknown = null
    for (const no of nos) {
      try { await fn(no) } catch (e) { failed.push(no); lastErr = e }
    }
    setBulkRunning(false)
    void invalidateOrderGraph(qc)
    setSelection(failed)
    toast({
      title: `${title} — ${t('bulk.result', { ok: nos.length - failed.length, failed: failed.length })}`,
      description: failed.length ? `${failed.join(', ')}: ${describeApiError(lastErr)}` : undefined,
      variant: failed.length ? 'warning' : 'success',
    })
  }

  const submitProduction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fabrikaNot.trim()) { setNoteTouched(true); return }
    const dto = { sTarih, fabrikaNot }
    if (productionTargets.length === 1) {
      toProductionMut.mutate({ siparisNo: productionTargets[0], dto })
      return
    }
    const nos = productionTargets
    setProductionTargets([])
    await runBulk(nos, (no) => moveToProduction(no, dto), t('factory.toast.movedToProduction'))
  }

  const columns: Column<Row>[] = [
    { key: 'siparisNo',         header: t('common.orderNo'),  sortable: true, hideable: false, render: (r) => <span className="font-mono text-xs">{r.siparisNo}</span> },
    { key: 'musteriAd',         header: t('common.customer'), sortable: true },
    { key: 'mUlke',             header: t('common.country'),  sortable: true },
    // 2.2 — legacy "Temsilci" (CONCAT(Ad, Soyad)) sütunu
    { key: 'kullanici',         header: t('factory.temsilci'), sortable: true, render: (r) => (r.kullanici as string) ?? '—' },
    { key: 'siparisMiTeklifMi', header: t('common.stage'),    sortable: true, render: (r) => <StatusBadge value={r.siparisMiTeklifMi} context="stage" /> },
    { key: 'fabrikaNot',        header: t('common.note'),     render: (r) => <span className="text-muted-foreground">{(r.fabrikaNot as string) ?? '—'}</span> },
    { key: 'sTarih',            header: t('common.startDate'), sortable: true, type: 'date', render: (r) => r.sTarih ? formatDate(r.sTarih as string) : '—' },
    // Round-8 §11 — Cari onay tarihi (başlangıç tarihinden ayrı).
    { key: 'cariOnayTarih',     header: t('factory.cariOnayTarih'), sortable: true, type: 'date', render: (r) => r.cariOnayTarih ? formatDate(r.cariOnayTarih as string) : '—' },
    { key: 'tarih',             header: t('common.date'),     sortable: true, type: 'date', render: (r) => formatDate(r.tarih as string) },
    {
      key: 'actions',
      header: t('common.actions'),
      hideable: false,
      exportValue: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {isFactoryUser && r.siparisMiTeklifMi === 'Planlama' && (
            <Button size="xs" onClick={() => openProduction([r.siparisNo])}>
              <Factory className="h-3.5 w-3.5" /> {t('factory.moveToProduction')}
            </Button>
          )}
          {isFactoryUser && r.siparisMiTeklifMi === 'Uretim' && (
            <Button size="xs" variant="secondary" loading={readyMut.isPendingFor((no) => no === r.siparisNo)} onClick={() => askReady([r.siparisNo])}>
              <CheckCheck className="h-3.5 w-3.5" /> {t('factory.ready')}
            </Button>
          )}
        </div>
      ),
    },
  ]

  useShortcutHints([
    { keys: '/', label: t('shortcuts.focusFilter') },
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'Space', label: t('shortcuts.selectRow') },
  ])

  return (
    <div>
      <PageHeader title={t('factory.title')} description={t('factory.description')} />
      <div className="space-y-3 p-4 lg:p-6">
        {/* Filter grid — Fabrika.cs araButtonInTab port'u */}
        <FilterBar onReset={reset} tableId="factory" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}>
          <FilterField label={t('common.orderNo')}>
            <Input inputSize="sm" value={f.siparisNo} onChange={(e) => set('siparisNo', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.customer')}>
            <Input inputSize="sm" value={f.musteriAd} onChange={(e) => set('musteriAd', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.country')}>
            <Input inputSize="sm" value={f.mUlke} onChange={(e) => set('mUlke', e.target.value)} />
          </FilterField>
          <FilterField label={t('factory.temsilci')}>
            <Select value={f.kullaniciID} onValueChange={(v) => set('kullaniciID', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {temsilciUsers.map((u) => (
                  <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>{`${u.ad} ${u.soyad}`.trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.stage')}>
            <Select value={f.asama} onValueChange={(v) => set('asama', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {FACTORY_ASAMALAR.map((a) => <SelectItem key={a} value={a}>{statusLabel(t, a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.startDate')}>
            <Input inputSize="sm" type="date" value={f.baslangicTarih} onChange={(e) => set('baslangicTarih', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.endDate')}>
            <Input inputSize="sm" type="date" value={f.bitisTarih} onChange={(e) => set('bitisTarih', e.target.value)} />
          </FilterField>
        </FilterBar>

        {/* İç denetim — henüz Planlama'ya düşmemiş: Muhasebe cari onayı bekleyenler. */}
        <WaitingUpstreamPanel screen="factory" />

        {/* E-9 — satır seçilince sağda detay (aşama geçmişi + belge akışı dahil). */}
        <MasterDetailLayout siparisNo={activeNo} onClose={() => setActiveNo(null)} factoryView>
          <DataTable
            tableId="factory"
            exportFileName="fabrika"
            columns={columns}
            data={data as Row[]}
            keyField="siparisNo"
            loading={isLoading}
            error={isError}
            emptyMessage={notHere}
            density="compact"
            toolbar={isFetching && !isLoading ? <span className="animate-pulse">{t('table.refreshing')}</span> : null}
            activeRowKey={activeNo}
            onActiveRowChange={(r) => setActiveNo(r.siparisNo)}
            selectable={isFactoryUser ? (r) => r.siparisMiTeklifMi === 'Planlama' || r.siparisMiTeklifMi === 'Uretim' : false}
            selectedKeys={selection}
            onSelectionChange={setSelection}
            bulkActions={(rows) => {
              const planning = rows.filter((r) => r.siparisMiTeklifMi === 'Planlama').map((r) => r.siparisNo)
              const inProd = rows.filter((r) => r.siparisMiTeklifMi === 'Uretim').map((r) => r.siparisNo)
              return (
                <>
                  <Button size="xs" disabled={!planning.length || bulkRunning} loading={bulkRunning} onClick={() => openProduction(planning)}>
                    <Factory className="h-3.5 w-3.5" /> {t('factory.bulkProduction', { count: planning.length })}
                  </Button>
                  <Button size="xs" variant="secondary" disabled={!inProd.length || bulkRunning} onClick={() => askReady(inProd)}>
                    <CheckCheck className="h-3.5 w-3.5" /> {t('factory.bulkReady', { count: inProd.length })}
                  </Button>
                </>
              )
            }}
            rowActions={[
              { key: 'detail', label: t('common.details'), shortcut: 'Enter', onSelect: (r) => setActiveNo(r.siparisNo) },
              { key: 'prod', label: t('factory.moveToProduction'), hidden: (r) => !isFactoryUser || r.siparisMiTeklifMi !== 'Planlama', onSelect: (r) => openProduction([r.siparisNo]) },
              { key: 'ready', label: t('factory.ready'), hidden: (r) => !isFactoryUser || r.siparisMiTeklifMi !== 'Uretim', onSelect: (r) => askReady([r.siparisNo]) },
            ]}
          />
        </MasterDetailLayout>
      </div>

      <Dialog open={productionTargets.length > 0} onOpenChange={(o) => { if (!o) setProductionTargets([]) }}>
        <DialogContent>
          <form onSubmit={submitProduction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {productionTargets.length === 1
                  ? t('factory.moveToProductionTitle', { siparisNo: productionTargets[0] })
                  : t('factory.bulkProductionTitle', { count: productionTargets.length })}
              </DialogTitle>
              {productionTargets.length > 1 && <DialogDescription>{productionTargets.join(', ')}</DialogDescription>}
            </DialogHeader>
            <FormField label={t('factory.uretimTarihi')} hint={t('factory.uretimTarihiHint')}>
              <Input type="datetime-local" value={sTarih} onChange={(e) => setSTarih(e.target.value)} />
            </FormField>
            <FormField label={t('factory.fabrikaNot')} required error={noteTouched && !fabrikaNot.trim() ? t('validation.required') : null}>
              <Textarea
                autoFocus
                placeholder={t('factory.fabrikaNotPlaceholder')}
                value={fabrikaNot}
                onChange={(e) => setFabrikaNot(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
                rows={3}
              />
            </FormField>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setProductionTargets([])}>{t('common.cancel')}</Button>
              <Button type="submit" loading={toProductionMut.isPending} title="Ctrl+Enter">{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
