import { useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getTransactionHistory, downloadAccountingExcel,
  type TransactionFilter, type TransactionListItem,
} from '@/api/accounting'
import { getCustomers, getUlkeler } from '@/api/customers'
import { getUsersLookup } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { DecimalInput } from '@/components/DecimalInput'
import { CancelTransactionDialog, CancelTxButton, type CancelTxTarget } from '@/components/CancelTransactionDialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { isAccountingApprover } from '@/lib/permissions'
import { hideMoneyFor } from '@/lib/visibility'
import { toastApiError } from '@/lib/apiError'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate, formatCurrency } from '@/lib/utils'

/**
 * PROMPT.md ACCOUNTING #15 + PROMPT-v2 §10 — Muhasebe Geçmiş.
 *
 * §10.1: Yonetici/Muhasebe için tek "Tutar" sütunu yerine SiparisNo bazında
 * gruplanmış peşinat sütunları (1. Peşinat / 2. Peşinat / …) + Fark (1→2).
 * Görünür peşinat 4 ile sınırlı; fazlası "+N daha" hücresinde toplanır.
 * Gozlemci için eski tek-Tutar görünümü korunur.
 *
 * Not: Eski "Maliyet Reçetesi" butonu + kar/zarar modalı kaldırıldı. Maliyet
 * reçetesi artık muhasebe onaydan gelen tahsilatların sıra sıra (1. Peşinat /
 * 2. Peşinat / …) listelenmesinden ibaret.
 */

const SENTINEL_ALL = '__all__'
const MAX_VISIBLE_INSTALLMENTS = 4

interface InstallmentCell {
  id: number
  index: number
  miktar: number | null
  tarih: string
}

interface OrderRow {
  siparisNo: string
  musteriAd?: string
  kullanici?: string
  paraTipi?: string
  // Round-11 §10: siparişin nihai maliyeti (Maliyet Reçetesi ile aynı kaynak).
  maliyet?: number | null
  installments: InstallmentCell[]
}

export function AccountingHistoryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  // Round-11 §3 — omur.caliskan (Gozlemci) parasal değer görmez: para birimi
  // toplamları, tahsilat tutar sütunu ve Excel (tutar içerir) gizlenir.
  const hideMoney = hideMoneyFor(getUser())
  // PROMPT-v2 §10.3: Sadece Yonetici + Muhasebe peşinat sütunlarını görür.
  // Gozlemci eski tek-Tutar görünümünde kalır.
  const showInstallments = role === 'Yonetici' || role === 'Muhasebe'
  // Tahsilat iptali yalnız Muhasebe Onay kullanıcılarına (backend aynı kapı).
  const canCancel = isAccountingApprover(getUser()) && !hideMoney
  const [cancelTarget, setCancelTarget] = useState<CancelTxTarget | null>(null)

  // Grouped view için server-side sayfalama bilgili değil — installment'lar
  // sayfa sınırını aşmasın diye pageSize'ı yükseltiyoruz.
  const DEFAULT_PAGE_SIZE = showInstallments ? 200 : 50
  const [filter, setFilter] = useState<TransactionFilter>({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  const [exporting, setExporting] = useState(false)

  // ── Filter sources ─────────────────────────────────────────────────────
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: ulkeler   = [] } = useQuery({ queryKey: ['ulkeler'],   queryFn: getUlkeler })
  const { data: users     = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup })

  // Round-8 §15 — temsilci boyutu yalnız Temsilci rolündeki kullanıcıları gösterir.
  const temsilciUsers = useMemo(() => users.filter((u) => u.yetkiTuru === 'Temsilci'), [users])

  const musteriOptions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.musteriAd).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'tr-TR', { sensitivity: 'base' })),
    [customers],
  )

  // ── Excel export ───────────────────────────────────────────────────────
  const onExport = async () => {
    setExporting(true)
    try { await downloadAccountingExcel(filter) }
    catch (e) { toastApiError(toast, t('common.error'), e) }
    finally { setExporting(false) }
  }

  // QW-15 — metin/tutar alanları her tuşta sorgu atıyordu: 300 ms debounce +
  // yenilemede tablo boşalmaz (keepPreviousData).
  const debouncedFilter = useDebouncedValue(filter, 300)
  const { data: page, isLoading, isFetching } = useQuery({
    queryKey: ['tx-history', debouncedFilter],
    queryFn: () => getTransactionHistory(debouncedFilter),
    placeholderData: keepPreviousData,
  })

  // ── Grouping for §10.1 ─────────────────────────────────────────────────
  // SiparisNo bazında topla; installmentIndex asc sırala.
  const orderRows: OrderRow[] = useMemo(() => {
    if (!showInstallments || !page) return []
    const m = new Map<string, OrderRow>()
    for (const tx of page.items as TransactionListItem[]) {
      if (!tx.siparisNo) continue
      let g = m.get(tx.siparisNo)
      if (!g) {
        g = {
          siparisNo: tx.siparisNo,
          musteriAd: tx.musteriAd,
          kullanici: tx.kullanici,
          paraTipi:  tx.paraTipi,
          // Round-11 §10: maliyet siparişin tüm satırlarında aynı; ilk satırdan al.
          maliyet:   tx.maliyet,
          installments: [],
        }
        m.set(tx.siparisNo, g)
      }
      g.installments.push({
        id:      tx.id,
        index:   tx.installmentIndex,
        miktar:  tx.odenenMiktar,
        tarih:   tx.tarih,
      })
    }
    // Index asc; aynı sipariş için 0 (sahipsiz) olanlar sona düşer.
    return Array.from(m.values()).map((g) => ({
      ...g,
      installments: g.installments.sort((a, b) => a.index - b.index),
    }))
  }, [page, showInstallments])

  // ── Legacy per-transaction view (Gozlemci) ─────────────────────────────
  type LegacyRow = TransactionListItem & Record<string, unknown>
  const legacyCols: Column<LegacyRow>[] = [
    { key: 'id',           header: t('accounting.history.txId') },
    { key: 'tarih',        header: t('common.date'),     render: (r) => formatDate(r.tarih as string) },
    { key: 'siparisNo',    header: t('common.orderNo') },
    { key: 'musteriAd',    header: t('common.customer') },
    { key: 'kullanici',    header: t('common.representative') },
    { key: 'paraTipi',     header: t('common.currency') },
    ...(!hideMoney ? [
      { key: 'odenenMiktar', header: t('common.amount'),
        render: (r) => formatCurrency((r.odenenMiktar as number) ?? 0, r.paraTipi as string) },
    ] satisfies Column<LegacyRow>[] : []),
    ...(canCancel ? [
      { key: 'iptal', header: '',
        render: (r) => <CancelTxButton onClick={() => setCancelTarget(r as TransactionListItem)} /> },
    ] satisfies Column<LegacyRow>[] : []),
  ]

  // ── Filter helpers ─────────────────────────────────────────────────────
  const update = <K extends keyof TransactionFilter>(k: K, v: TransactionFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))
  const reset = () => setFilter({ page: 1, pageSize: DEFAULT_PAGE_SIZE })

  const totals = page?.currencyTotals ?? { Euro: 0, Dolar: 0, TL: 0, Sterlin: 0 }

  return (
    // Scaling Faz 2 — FillPage: filtreler ortak FilterBar'da (tek satır), döviz
    // toplamları KPI kartları yerine tek satır şerit; tablo kalan yüksekliği
    // doldurur (başlık yapışık), sayfalama altta hep görünür.
    <FillPage>
      <PageHeader
        density="compact"
        title={t('accounting.historyTitle')}
        actions={hideMoney ? undefined : <Button variant="outline" size="sm" loading={exporting} title={t('accounting.history.excelHint')} onClick={onExport}>{t('common.excel')}</Button>}
      />

      <div className="space-y-2 px-4 pt-2">
        <FilterBar onReset={reset}>
          <FilterField label={t('common.orderNo')}>
            <Input inputSize="sm" value={filter.siparisNo ?? ''} onChange={(e) => update('siparisNo', e.target.value || undefined)} />
          </FilterField>
          <FilterField label={t('common.customer')}>
            <AutocompleteInput
              inputSize="sm"
              value={filter.musteriAd ?? ''}
              onChange={(v) => update('musteriAd', v.trim() ? v : undefined)}
              options={musteriOptions}
              placeholder={t('accounting.filter.musteriPlaceholder')}
            />
          </FilterField>
          <FilterField label={t('accounting.filter.ulke')}>
            <Select
              value={filter.mUlke ?? SENTINEL_ALL}
              onValueChange={(v) => update('mUlke', v === SENTINEL_ALL ? undefined : v)}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_ALL}>{t('accounting.filter.all')}</SelectItem>
                {ulkeler.map((u) => (
                  <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.representative')}>
            <Select
              value={filter.kullaniciID ? String(filter.kullaniciID) : SENTINEL_ALL}
              onValueChange={(v) => update('kullaniciID', v === SENTINEL_ALL ? undefined : Number(v))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_ALL}>{t('accounting.filter.all')}</SelectItem>
                {temsilciUsers.map((u) => (
                  <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>
                    {`${u.ad} ${u.soyad}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('accounting.filter.odemeDurumu')}>
            <DecimalInput
              inputSize="sm"
              value={filter.odenenMiktar ?? ''}
              onValueChange={(v) => update('odenenMiktar', v === '' ? undefined : v)}
              placeholder={t('accounting.filter.odemePlaceholder')}
            />
          </FilterField>
          <FilterField label={t('common.startDate')}>
            <Input inputSize="sm" type="date" value={filter.baslangicTarih ?? ''} onChange={(e) => update('baslangicTarih', e.target.value || undefined)} />
          </FilterField>
          <FilterField label={t('common.endDate')}>
            <Input inputSize="sm" type="date" value={filter.bitisTarih ?? ''} onChange={(e) => update('bitisTarih', e.target.value || undefined)} />
          </FilterField>
        </FilterBar>

        {/* Sonuç sayısı + döviz toplamları — Round-11 §3: omur.caliskan için toplamlar gizli. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t('accounting.filter.rowCount')}: <span className="font-semibold text-foreground">{page?.totalCount ?? 0}</span>
            {isFetching && !isLoading && <span className="ml-2 animate-pulse">{t('table.refreshing')}</span>}
          </span>
          {!hideMoney && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium uppercase">{t('accounting.filter.totalsLabel')}:</span>
              {/* Yüklenirken 0 yerine "…" — sıfır sanılmasın. */}
              {(['Euro', 'Dolar', 'TL', 'Sterlin'] as const).map((c) => (
                <span key={c} className="rounded border bg-card px-2 py-0.5">
                  {c} <span className="font-semibold tabular-nums text-foreground">{isLoading ? '…' : formatCurrency(totals[c] ?? 0, c)}</span>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <FillRegion className="pt-2">
        {/* Installment-grouped view (Yonetici + Muhasebe) */}
        {showInstallments ? (
          <InstallmentTable
            rows={orderRows}
            loading={isLoading}
            onCancel={canCancel
              ? (r, inst) => setCancelTarget({
                  id: inst.id, siparisNo: r.siparisNo, odenenMiktar: inst.miktar,
                  tarih: inst.tarih, paraTipi: r.paraTipi,
                })
              : undefined}
          />
        ) : (
          <DataTable
            fill
            columns={legacyCols}
            data={(page?.items ?? []) as unknown as LegacyRow[]}
            keyField="id"
            loading={isLoading}
          />
        )}
      </FillRegion>

        {/* Pagination — only meaningful in the legacy per-transaction view.
            Installment view loads up to 200 per page; pagination still works
            but a SiparisNo may straddle pages (acceptable v1 limitation). */}
        {page && (
          <div className="flex items-center justify-between px-4 pb-2 text-xs">
            <span className="text-muted-foreground">
              {t('common.total')}: {page.totalCount} • {t('table.pageOf', { page: page.page, count: Math.max(1, Math.ceil(page.totalCount / (page.pageSize || DEFAULT_PAGE_SIZE))) })}
            </span>
            <div className="flex gap-2">
              <Button size="xs" variant="outline"
                disabled={(filter.page ?? 1) <= 1}
                onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>
                {t('common.previous')}
              </Button>
              <Button size="xs" variant="outline"
                disabled={page.items.length < (filter.pageSize ?? DEFAULT_PAGE_SIZE)}
                onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}

      <CancelTransactionDialog target={cancelTarget} onClose={() => setCancelTarget(null)} />
    </FillPage>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Installment table
// ─────────────────────────────────────────────────────────────────────────────

function InstallmentTable({
  rows, loading, onCancel,
}: {
  rows: OrderRow[]
  loading: boolean
  /** Verilirse her peşinat hücresinde iptal (X) butonu gösterilir. */
  onCancel?: (row: OrderRow, inst: InstallmentCell) => void
}) {
  const { t } = useTranslation()
  if (loading) {
    return <div className="rounded-md border bg-card p-8 text-center text-muted-foreground">{t('common.loading')}</div>
  }
  if (rows.length === 0) {
    return <div className="rounded-md border bg-card p-8 text-center text-muted-foreground">{t('accountingHistory.empty')}</div>
  }
  // Sayfa için en yüksek installment sayısı sütun sayısını belirler.
  const maxN = Math.min(
    MAX_VISIBLE_INSTALLMENTS,
    rows.reduce((acc, r) => Math.max(acc, r.installments.length), 0),
  )

  return (
    <div className="h-full overflow-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted text-xs uppercase">
          <tr>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.siparisNo')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.musteri')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.temsilci')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.paraTipi')}</th>
            {Array.from({ length: maxN }, (_, i) => (
              <th key={i} className="px-2 py-2 text-right">{t('accountingHistory.cols.pesinat', { n: i + 1 })}</th>
            ))}
            {/* Round-11 §10: sıra — peşinatlar → Diğer → Maliyet → Fark */}
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.diger')}</th>
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.maliyet')}</th>
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.fark')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const visible = r.installments.slice(0, maxN)
            const overflow = r.installments.slice(maxN)
            // Round-11 §10: Toplam Tahsilat = tüm peşinatlar + Diğer (taşanlar dahil).
            const toplamTahsilat = r.installments.reduce((acc, i) => acc + (i.miktar ?? 0), 0)
            const maliyet = r.maliyet ?? null
            // Fark = Toplam Tahsilat − Maliyet (maliyet girilmemişse hesaplanamaz → —).
            const fark = maliyet != null ? toplamTahsilat - maliyet : null
            const farkClass = fark == null
              ? 'text-muted-foreground'
              : fark > 0 ? 'text-success font-semibold'
              : fark < 0 ? 'text-destructive font-semibold'
              : ''
            return (
              <tr key={r.siparisNo} className="border-t hover:bg-muted/20">
                <td className="px-2 py-1 font-mono text-xs">{r.siparisNo}</td>
                <td className="px-2 py-1">{r.musteriAd ?? '—'}</td>
                <td className="px-2 py-1">{r.kullanici ?? '—'}</td>
                <td className="px-2 py-1">{r.paraTipi ?? '—'}</td>
                {Array.from({ length: maxN }, (_, i) => {
                  const inst = visible[i]
                  if (!inst) return <td key={i} className="px-2 py-1 text-right text-muted-foreground">—</td>
                  return (
                    <td key={i} className="px-2 py-1 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1">
                        {formatCurrency(inst.miktar ?? 0, r.paraTipi ?? '')}
                        {onCancel && <CancelTxButton onClick={() => onCancel(r, inst)} />}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(inst.tarih)}</div>
                    </td>
                  )
                })}
                {/* Diğer — maxN'i aşan peşinatlar (tooltip'te dökümü) */}
                <td className="px-2 py-1 text-right">
                  {overflow.length === 0
                    ? <span className="text-muted-foreground">—</span>
                    : (
                      <span
                        title={overflow
                          .map((o) => `${o.index}. ${formatCurrency(o.miktar ?? 0, r.paraTipi ?? '')} (${formatDate(o.tarih)})`)
                          .join('\n')}
                        className="underline cursor-help text-xs"
                      >
                        {t('accountingHistory.moreCount', { count: overflow.length })}
                      </span>
                    )}
                </td>
                {/* Round-11 §10: Maliyet — Tamamlanmayı Bekleyen'de girilen nihai maliyet */}
                <td className="px-2 py-1 text-right tabular-nums">
                  {maliyet != null
                    ? formatCurrency(maliyet, r.paraTipi ?? '')
                    : <span className="text-muted-foreground">—</span>}
                </td>
                {/* Round-11 §10: Fark = Toplam Tahsilat − Maliyet (yeşil/kırmızı/nötr) */}
                <td className="px-2 py-1 text-right tabular-nums">
                  {fark == null
                    ? <span className="text-muted-foreground">—</span>
                    : (
                      <span
                        className={farkClass}
                        title={`${t('accountingHistory.cols.toplamTahsilat')}: ${formatCurrency(toplamTahsilat, r.paraTipi ?? '')} − ${t('accountingHistory.cols.maliyet')}: ${formatCurrency(maliyet ?? 0, r.paraTipi ?? '')}`}
                      >
                        {formatCurrency(fark, r.paraTipi ?? '')}
                      </span>
                    )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
