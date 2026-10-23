import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCheck, XCircle } from 'lucide-react'
import { getLogisticsHistory, completeShipment, cancelShipment } from '@/api/logistics'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { LogisticsStatusBadge } from '@/components/LogisticsStatusBadge'
import { FilterBar, FilterField, useFilterState } from '@/components/FilterBar'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ToastProvider'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useAppMutation } from '@/hooks/useAppMutation'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { describeApiError } from '@/lib/axios'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import { sumOf } from '@/lib/export'
import type { LogisticsHistoryDto } from '@/types'

type Row = LogisticsHistoryDto & Record<string, unknown>
const FILTER_DEFAULTS = { siparisNo: '', firmaAdi: '' }

/**
 * Lojistik — Geçmiş. Bu turda: etiketli FilterBar + debounce (her tuşta sorgu
 * yoktu artık), Tamamla onaylı ve isteğe bağlı teslim notuyla (API `not` kabul
 * ediyor), İptal zorunlu gerekçeyle (window.prompt yerine), satır bazlı bekleme,
 * toplu Tamamla (E-17), detay sağ panelde (E-9).
 */
export function LogisticsHistoryPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { askReason } = useConfirm()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  const canMutate = role === 'Yonetici' || role === 'Lojistik'
  // Round-11 §3 — omur.caliskan (Gozlemci) lojistik tutarını görmez.
  const hideMoney = hideMoneyFor(getUser())
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)
  const debounced = useDebouncedValue(f, 300)
  const [activeNo, setActiveNo] = useState<string | null>(null)
  const [selection, setSelection] = useState<(string | number)[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['logistics-history', debounced],
    queryFn: () => getLogisticsHistory(debounced.siparisNo || undefined, debounced.firmaAdi || undefined),
    placeholderData: keepPreviousData,
  })

  const completeMut = useAppMutation({
    mutationFn: ({ id, not }: { id: number; not?: string }) => completeShipment(id, not),
    successTitle: t('logistics.toast.completed'),
    errorTitle: t('logistics.toast.error'),
  })
  const cancelMut = useAppMutation({
    mutationFn: ({ id, sebep }: { id: number; sebep: string }) => cancelShipment(id, sebep),
    successTitle: t('logistics.toast.cancelled'),
    errorTitle: t('logistics.toast.error'),
  })

  const askComplete = async (rows: Row[]) => {
    const not = await askReason({
      title: t('logistics.history.completeTitle', { count: rows.length }),
      description: rows.map((r) => `${r.siparisNo} · ${r.firmaAdi}`).join(', '),
      label: t('logistics.history.completeNote'),
      required: false,
      confirmLabel: t('logistics.history.complete'),
    })
    if (not === null) return
    if (rows.length === 1) { completeMut.mutate({ id: rows[0].id, not: not || undefined }); return }
    setBulkRunning(true)
    const failed: number[] = []
    let lastErr: unknown = null
    for (const r of rows) {
      try { await completeShipment(r.id, not || undefined) } catch (e) { failed.push(r.id); lastErr = e }
    }
    setBulkRunning(false)
    void invalidateOrderGraph(qc)
    setSelection(failed)
    toast({
      title: `${t('logistics.toast.completed')} — ${t('bulk.result', { ok: rows.length - failed.length, failed: failed.length })}`,
      description: failed.length ? describeApiError(lastErr) : undefined,
      variant: failed.length ? 'warning' : 'success',
    })
  }

  const askCancel = async (r: Row) => {
    // QW-6 — window.prompt yerine zorunlu gerekçeli uygulama penceresi.
    const sebep = await askReason({
      title: t('logistics.history.cancelTitle'),
      description: `${r.siparisNo} · ${r.firmaAdi}`,
      label: t('logistics.history.cancelPrompt'),
      destructive: true,
      confirmLabel: t('logistics.history.cancelConfirm'),
      cancelLabel: t('common.back'),
    })
    if (sebep) cancelMut.mutate({ id: r.id, sebep })
  }

  const cols: Column<Row>[] = [
    { key: 'siparisNo', pin: 'left', header: t('common.orderNo'),  sortable: true, hideable: false, render: (r) => <span className="font-mono text-xs">{r.siparisNo}</span> },
    { key: 'firmaAdi', truncate: '16rem', header: t('logistics.history.firma'), sortable: true },
    { key: 'lojistikCesit',header: t('logistics.history.tur'),   sortable: true },
    // PROMPT.md OBSERVER #18: operatör Ad Soyad kolonu.
    { key: 'kullaniciAdSoyad', header: t('logistics.history.operator'), sortable: true,
      render: (r) => (r.kullaniciAdSoyad as string) || '—' },
    ...(!hideMoney ? [
      { key: 'fiyat', header: t('common.amount'), sortable: true, type: 'money', render: (r) => formatCurrency((r.fiyat as number) ?? 0),
        footer: (rows) => formatCurrency(sumOf(rows, (x) => x.fiyat as number)) },
    ] satisfies Column<Row>[] : []),
    { key: 'siparisMiTeklifMi', header: t('common.status'), sortable: true,
      render: (r) => <LogisticsStatusBadge value={(r.siparisMiTeklifMi as string) ?? ''} /> },
    { key: 'lNot', truncate: '16rem', header: t('common.note'), render: (r) => <span className="text-muted-foreground">{(r.lNot as string) ?? '—'}</span> },
    { key: 'id',           header: t('logistics.history.shipmentId'), sortable: true, type: 'number', defaultHidden: true },
    {
      key: 'actions', pin: 'right', header: t('common.actions'), hideable: false, exportValue: false,
      render: (r) => {
        if (!canMutate) return null
        // Paket 3: sadece "Sevk Yolda" (Order=Lojistik) satırlarda Tamamla/İptal gösterilir.
        if (r.siparisMiTeklifMi !== 'Lojistik') return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button size="xs" loading={completeMut.isPendingFor((v) => v.id === r.id)} onClick={() => askComplete([r])}>
              <CheckCheck className="h-3.5 w-3.5" /> {t('logistics.history.complete')}
            </Button>
            <Button size="xs" variant="outline" className="text-destructive" loading={cancelMut.isPendingFor((v) => v.id === r.id)} onClick={() => askCancel(r)}>
              <XCircle className="h-3.5 w-3.5" /> {t('common.cancel')}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact" title={t('logistics.historyTitle')} />
      <div className="space-y-2 px-4 pt-2">
        <FilterBar onReset={reset} tableId="logistics-history" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}>
          <FilterField label={t('common.orderNo')}>
            <Input inputSize="sm" value={f.siparisNo} onChange={(e) => set('siparisNo', e.target.value)} />
          </FilterField>
          <FilterField label={t('logistics.history.firma')}>
            <Input inputSize="sm" placeholder={t('logistics.history.firmaPlaceholder')} value={f.firmaAdi} onChange={(e) => set('firmaAdi', e.target.value)} />
          </FilterField>
        </FilterBar>
      </div>
      <FillRegion className="pt-2">
        <MasterDetailLayout fill siparisNo={activeNo} onClose={() => setActiveNo(null)} logisticsView>
          <DataTable
            fill
            tableId="logistics-history"
            exportFileName="lojistik-gecmis"
            columns={cols}
            data={data as Row[]}
            keyField="id"
            loading={isLoading}
            error={isError}
            density="compact"
            showFooter={!hideMoney}
            activeRowKey={data.find((r) => r.siparisNo === activeNo)?.id ?? null}
            onActiveRowChange={(r) => setActiveNo(r.siparisNo)}
            selectable={canMutate ? (r) => r.siparisMiTeklifMi === 'Lojistik' : false}
            selectedKeys={selection}
            onSelectionChange={setSelection}
            bulkActions={(rows) => (
              <Button size="xs" loading={bulkRunning} onClick={() => askComplete(rows)}>
                <CheckCheck className="h-3.5 w-3.5" /> {t('logistics.history.bulkComplete', { count: rows.length })}
              </Button>
            )}
            rowActions={[
              { key: 'detail', label: t('common.details'), shortcut: 'Enter', onSelect: (r) => setActiveNo(r.siparisNo) },
              { key: 'complete', label: t('logistics.history.complete'), hidden: (r) => !canMutate || r.siparisMiTeklifMi !== 'Lojistik', onSelect: (r) => askComplete([r]) },
              { key: 'cancel', label: t('common.cancel'), destructive: true, hidden: (r) => !canMutate || r.siparisMiTeklifMi !== 'Lojistik', onSelect: (r) => askCancel(r) },
            ]}
          />
        </MasterDetailLayout>
      </FillRegion>
    </FillPage>
  )
}
