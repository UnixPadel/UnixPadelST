import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getTransactionHistory, downloadAccountingExcel,
  type TransactionFilter, type TransactionListItem,
} from '@/api/accounting'
import { getCustomers, getUlkeler } from '@/api/customers'
import { getUsersLookup } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { DecimalInput } from '@/components/DecimalInput'
import { KPICard } from '@/components/KPICard'
import { CancelTransactionDialog, CancelTxButton, type CancelTxTarget } from '@/components/CancelTransactionDialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { isAccountingApprover } from '@/lib/permissions'
import { hideMoneyFor } from '@/lib/visibility'
import { describeApiError } from '@/lib/axios'
import { formatDate, formatCurrency } from '@/lib/utils'

/**
 * PROMPT.md ACCOUNTING #15 + PROMPT-v2 Â§10 â€” Muhasebe GeÃ§miÅŸ.
 *
 * Â§10.1: Yonetici/Muhasebe iÃ§in tek "Tutar" sÃ¼tunu yerine SiparisNo bazÄ±nda
 * gruplanmÄ±ÅŸ peÅŸinat sÃ¼tunlarÄ± (1. PeÅŸinat / 2. PeÅŸinat / â€¦) + Fark (1â†’2).
 * GÃ¶rÃ¼nÃ¼r peÅŸinat 4 ile sÄ±nÄ±rlÄ±; fazlasÄ± "+N daha" hÃ¼cresinde toplanÄ±r.
 * Gozlemci iÃ§in eski tek-Tutar gÃ¶rÃ¼nÃ¼mÃ¼ korunur.
 *
 * Not: Eski "Maliyet ReÃ§etesi" butonu + kar/zarar modalÄ± kaldÄ±rÄ±ldÄ±. Maliyet
 * reÃ§etesi artÄ±k muhasebe onaydan gelen tahsilatlarÄ±n sÄ±ra sÄ±ra (1. PeÅŸinat /
 * 2. PeÅŸinat / â€¦) listelenmesinden ibaret.
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
  // Round-11 Â§10: sipariÅŸin nihai maliyeti (Maliyet ReÃ§etesi ile aynÄ± kaynak).
  maliyet?: number | null
  installments: InstallmentCell[]
}

export function AccountingHistoryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  // Round-11 Â§3 â€” omur.caliskan (Gozlemci) parasal deÄŸer gÃ¶rmez: para birimi
  // toplamlarÄ±, tahsilat tutar sÃ¼tunu ve Excel (tutar iÃ§erir) gizlenir.
  const hideMoney = hideMoneyFor(getUser())
  // PROMPT-v2 Â§10.3: Sadece Yonetici + Muhasebe peÅŸinat sÃ¼tunlarÄ±nÄ± gÃ¶rÃ¼r.
  // Gozlemci eski tek-Tutar gÃ¶rÃ¼nÃ¼mÃ¼nde kalÄ±r.
  const showInstallments = role === 'Yonetici' || role === 'Muhasebe'
  // Tahsilat iptali yalnız Muhasebe Onay kullanıcılarına (backend aynı kapı).
  const canCancel = isAccountingApprover(getUser()) && !hideMoney
  const [cancelTarget, setCancelTarget] = useState<CancelTxTarget | null>(null)

  // Grouped view iÃ§in server-side sayfalama bilgili deÄŸil â€” installment'lar
  // sayfa sÄ±nÄ±rÄ±nÄ± aÅŸmasÄ±n diye pageSize'Ä± yÃ¼kseltiyoruz.
  const DEFAULT_PAGE_SIZE = showInstallments ? 200 : 50
  const [filter, setFilter] = useState<TransactionFilter>({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  const [exporting, setExporting] = useState(false)

  // â”€â”€ Filter sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: ulkeler   = [] } = useQuery({ queryKey: ['ulkeler'],   queryFn: getUlkeler })
  const { data: users     = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup })

  // Round-8 Â§15 â€” temsilci boyutu yalnÄ±z Temsilci rolÃ¼ndeki kullanÄ±cÄ±larÄ± gÃ¶sterir.
  const temsilciUsers = useMemo(() => users.filter((u) => u.yetkiTuru === 'Temsilci'), [users])

  const musteriOptions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.musteriAd).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'tr-TR', { sensitivity: 'base' })),
    [customers],
  )

  // â”€â”€ Excel export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onExport = async () => {
    setExporting(true)
    try { await downloadAccountingExcel(filter) }
    catch (e) { toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }) }
    finally { setExporting(false) }
  }

  const { data: page, isLoading } = useQuery({
    queryKey: ['tx-history', filter],
    queryFn: () => getTransactionHistory(filter),
  })

  // â”€â”€ Grouping for Â§10.1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // SiparisNo bazÄ±nda topla; installmentIndex asc sÄ±rala.
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
          // Round-11 Â§10: maliyet sipariÅŸin tÃ¼m satÄ±rlarÄ±nda aynÄ±; ilk satÄ±rdan al.
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
    // Index asc; aynÄ± sipariÅŸ iÃ§in 0 (sahipsiz) olanlar sona dÃ¼ÅŸer.
    return Array.from(m.values()).map((g) => ({
      ...g,
      installments: g.installments.sort((a, b) => a.index - b.index),
    }))
  }, [page, showInstallments])

  // â”€â”€ Legacy per-transaction view (Gozlemci) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  type LegacyRow = TransactionListItem & Record<string, unknown>
  const legacyCols: Column<LegacyRow>[] = [
    { key: 'id',           header: 'ID' },
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

  // â”€â”€ Filter helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const update = <K extends keyof TransactionFilter>(k: K, v: TransactionFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))
  const reset = () => setFilter({ page: 1, pageSize: DEFAULT_PAGE_SIZE })

  const totals = page?.currencyTotals ?? { Euro: 0, Dolar: 0, TL: 0, Sterlin: 0 }

  return (
    <div>
      <PageHeader
        title={t('accounting.historyTitle')}
        actions={hideMoney ? undefined : <Button variant="outline" disabled={exporting} onClick={onExport}>{t('common.excel')}</Button>}
      />

      <div className="p-6 space-y-4">

        {/* Filter strip */}
        <div className="rounded-md border bg-card p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>{t('common.orderNo')}</Label>
              <Input value={filter.siparisNo ?? ''} onChange={(e) => update('siparisNo', e.target.value || undefined)} />
            </div>

            <div className="space-y-1">
              <Label>{t('common.customer')}</Label>
              <AutocompleteInput
                value={filter.musteriAd ?? ''}
                onChange={(v) => update('musteriAd', v.trim() ? v : undefined)}
                options={musteriOptions}
                placeholder={t('accounting.filter.musteriPlaceholder')}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('accounting.filter.ulke')}</Label>
              <Select
                value={filter.mUlke ?? SENTINEL_ALL}
                onValueChange={(v) => update('mUlke', v === SENTINEL_ALL ? undefined : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_ALL}>{t('accounting.filter.all')}</SelectItem>
                  {ulkeler.map((u) => (
                    <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t('common.representative')}</Label>
              <Select
                value={filter.kullaniciID ? String(filter.kullaniciID) : SENTINEL_ALL}
                onValueChange={(v) => update('kullaniciID', v === SENTINEL_ALL ? undefined : Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_ALL}>{t('accounting.filter.all')}</SelectItem>
                  {temsilciUsers.map((u) => (
                    <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>
                      {`${u.ad} ${u.soyad}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t('accounting.filter.odemeDurumu')}</Label>
              <DecimalInput
                value={filter.odenenMiktar ?? ''}
                onValueChange={(v) => update('odenenMiktar', v === '' ? undefined : v)}
                placeholder={t('accounting.filter.odemePlaceholder')}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('common.startDate')}</Label>
              <Input type="date" value={filter.baslangicTarih ?? ''} onChange={(e) => update('baslangicTarih', e.target.value || undefined)} />
            </div>
            <div className="space-y-1">
              <Label>{t('common.endDate')}</Label>
              <Input type="date" value={filter.bitisTarih ?? ''} onChange={(e) => update('bitisTarih', e.target.value || undefined)} />
            </div>

            <div className="space-y-1 flex items-end">
              <Button variant="outline" className="w-full" onClick={reset}>
                {t('accounting.filter.reset')}
              </Button>
            </div>
          </div>
        </div>

        {/* Currency totals strip â€” Round-11 Â§3: omur.caliskan iÃ§in gizli (para birimi toplamlarÄ±). */}
        {!hideMoney && (
          <div>
            <p className="text-xs uppercase text-muted-foreground font-medium mb-2">
              {t('accounting.filter.totalsLabel')}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard baslik="Euro"    deger={formatCurrency(totals['Euro']    ?? 0, 'Euro')} />
              <KPICard baslik="Dolar"   deger={formatCurrency(totals['Dolar']   ?? 0, 'Dolar')} />
              <KPICard baslik="TL"      deger={formatCurrency(totals['TL']      ?? 0, 'TL')} />
              <KPICard baslik="Sterlin" deger={formatCurrency(totals['Sterlin'] ?? 0, 'Sterlin')} />
            </div>
          </div>
        )}

        {/* Result count */}
        <div className="text-sm text-muted-foreground">
          {t('accounting.filter.rowCount')}: <span className="font-semibold text-foreground">{page?.totalCount ?? 0}</span>
        </div>

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
            columns={legacyCols}
            data={(page?.items ?? []) as unknown as LegacyRow[]}
            keyField="id"
            loading={isLoading}
          />
        )}

        {/* Pagination â€” only meaningful in the legacy per-transaction view.
            Installment view loads up to 200 per page; pagination still works
            but a SiparisNo may straddle pages (acceptable v1 limitation). */}
        {page && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('common.total')}: {page.totalCount} â€¢ {t('common.page')} {page.page}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline"
                disabled={(filter.page ?? 1) <= 1}
                onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>
                {t('common.previous')}
              </Button>
              <Button size="sm" variant="outline"
                disabled={page.items.length < (filter.pageSize ?? DEFAULT_PAGE_SIZE)}
                onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <CancelTransactionDialog target={cancelTarget} onClose={() => setCancelTarget(null)} />
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Installment table
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // Sayfa iÃ§in en yÃ¼ksek installment sayÄ±sÄ± sÃ¼tun sayÄ±sÄ±nÄ± belirler.
  const maxN = Math.min(
    MAX_VISIBLE_INSTALLMENTS,
    rows.reduce((acc, r) => Math.max(acc, r.installments.length), 0),
  )

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase">
          <tr>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.siparisNo')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.musteri')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.temsilci')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.paraTipi')}</th>
            {Array.from({ length: maxN }, (_, i) => (
              <th key={i} className="px-2 py-2 text-right">{t('accountingHistory.cols.pesinat', { n: i + 1 })}</th>
            ))}
            {/* Round-11 Â§10: sÄ±ra â€” peÅŸinatlar â†’ DiÄŸer â†’ Maliyet â†’ Fark */}
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.diger')}</th>
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.maliyet')}</th>
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.fark')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const visible = r.installments.slice(0, maxN)
            const overflow = r.installments.slice(maxN)
            // Round-11 Â§10: Toplam Tahsilat = tÃ¼m peÅŸinatlar + DiÄŸer (taÅŸanlar dahil).
            const toplamTahsilat = r.installments.reduce((acc, i) => acc + (i.miktar ?? 0), 0)
            const maliyet = r.maliyet ?? null
            // Fark = Toplam Tahsilat âˆ’ Maliyet (maliyet girilmemiÅŸse hesaplanamaz â†’ â€”).
            const fark = maliyet != null ? toplamTahsilat - maliyet : null
            const farkClass = fark == null
              ? 'text-muted-foreground'
              : fark > 0 ? 'text-emerald-600 font-semibold'
              : fark < 0 ? 'text-red-600 font-semibold'
              : ''
            return (
              <tr key={r.siparisNo} className="border-t hover:bg-muted/20">
                <td className="px-2 py-1 font-mono text-xs">{r.siparisNo}</td>
                <td className="px-2 py-1">{r.musteriAd ?? 'â€”'}</td>
                <td className="px-2 py-1">{r.kullanici ?? 'â€”'}</td>
                <td className="px-2 py-1">{r.paraTipi ?? 'â€”'}</td>
                {Array.from({ length: maxN }, (_, i) => {
                  const inst = visible[i]
                  if (!inst) return <td key={i} className="px-2 py-1 text-right text-muted-foreground">â€”</td>
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
                {/* DiÄŸer â€” maxN'i aÅŸan peÅŸinatlar (tooltip'te dÃ¶kÃ¼mÃ¼) */}
                <td className="px-2 py-1 text-right">
                  {overflow.length === 0
                    ? <span className="text-muted-foreground">â€”</span>
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
                {/* Round-11 Â§10: Maliyet â€” TamamlanmayÄ± Bekleyen'de girilen nihai maliyet */}
                <td className="px-2 py-1 text-right tabular-nums">
                  {maliyet != null
                    ? formatCurrency(maliyet, r.paraTipi ?? '')
                    : <span className="text-muted-foreground">â€”</span>}
                </td>
                {/* Round-11 Â§10: Fark = Toplam Tahsilat âˆ’ Maliyet (yeÅŸil/kÄ±rmÄ±zÄ±/nÃ¶tr) */}
                <td className="px-2 py-1 text-right tabular-nums">
                  {fark == null
                    ? <span className="text-muted-foreground">â€”</span>
                    : (
                      <span
                        className={farkClass}
                        title={`${t('accountingHistory.cols.toplamTahsilat')}: ${formatCurrency(toplamTahsilat, r.paraTipi ?? '')} âˆ’ ${t('accountingHistory.cols.maliyet')}: ${formatCurrency(maliyet ?? 0, r.paraTipi ?? '')}`}
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
