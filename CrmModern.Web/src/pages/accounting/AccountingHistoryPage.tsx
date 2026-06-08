import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getTransactionHistory, downloadAccountingExcel, type TransactionFilter } from '@/api/accounting'
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
import { useToast } from '@/components/ToastProvider'
import { describeApiError } from '@/lib/axios'
import { formatDate, formatCurrency } from '@/lib/utils'

/**
 * PROMPT.md ACCOUNTING #15: full Muhasebe Geçmiş filter strip ported from
 * legacy MuhasebeGecmis.cs. Adds Ülke, Temsilci, Ödeme Durumu (exact decimal)
 * plus the 4-currency totals strip, row-count badge and Sıfırla button.
 *
 * Filter sources:
 *   Müşteri Adı  — typeable combobox (Style=DropDown parity) from /api/musteri
 *   Ülke         — strict dropdown from /api/musteri/ulkeler
 *   Temsilci     — strict dropdown from /api/users/lookup (Ad Soyad)
 *   Ödeme Durumu — free decimal text input (Phase 1 DecimalInput)
 *
 * Currency totals are computed server-side over the FULL filtered set, so
 * pagination does not skew the strip.
 */

const SENTINEL_ALL = '__all__'  // shadcn Select can't have an empty value, so we route "tümü" through a sentinel.

export function AccountingHistoryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [filter, setFilter] = useState<TransactionFilter>({ page: 1, pageSize: 50 })
  const [exporting, setExporting] = useState(false)

  // ── Filter sources (queryClient-cached, all paginated 0) ───────────────
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: ulkeler   = [] } = useQuery({ queryKey: ['ulkeler'],   queryFn: getUlkeler })
  const { data: users     = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup })

  const musteriOptions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.musteriAd).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'tr-TR', { sensitivity: 'base' })),
    [customers],
  )

  // ── Excel export (PROMPT.md #7 fix preserved) ──────────────────────────
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

  type Row = {
    id: number; siparisNo: string; musteriAd?: string;
    kullanici?: string; paraTipi?: string;
    odenenMiktar: number | null; tarih: string
  } & Record<string, unknown>

  const cols: Column<Row>[] = [
    { key: 'id',           header: 'ID' },
    { key: 'tarih',        header: t('common.date'),     render: (r) => formatDate(r.tarih as string) },
    { key: 'siparisNo',    header: t('common.orderNo') },
    { key: 'musteriAd',    header: t('common.customer') },
    { key: 'kullanici',    header: t('accounting.filter.temsilci') },
    { key: 'paraTipi',     header: t('common.currency') },
    { key: 'odenenMiktar', header: t('common.amount'),
      render: (r) => formatCurrency((r.odenenMiktar as number) ?? 0, r.paraTipi as string) },
  ]

  // ── Filter helpers ─────────────────────────────────────────────────────
  // Any change resets to page 1 so the user isn't stranded on an empty page.
  const update = <K extends keyof TransactionFilter>(k: K, v: TransactionFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))

  const reset = () => setFilter({ page: 1, pageSize: 50 })

  // ── Currency totals strip (4 cards) ────────────────────────────────────
  const totals = page?.currencyTotals ?? { Euro: 0, Dolar: 0, TL: 0, Sterlin: 0 }

  return (
    <div>
      <PageHeader
        title={t('accounting.historyTitle')}
        actions={<Button variant="outline" disabled={exporting} onClick={onExport}>{t('common.excel')}</Button>}
      />

      <div className="p-6 space-y-4">

        {/* Filter strip */}
        <div className="rounded-md border bg-card p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>{t('common.orderNo')}</Label>
              <Input value={filter.siparisNo ?? ''} onChange={(e) => update('siparisNo', e.target.value || undefined)} />
            </div>

            {/* Combobox — typeable Müşteri Adı */}
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
              <Label>{t('accounting.filter.temsilci')}</Label>
              <Select
                value={filter.kullaniciID ? String(filter.kullaniciID) : SENTINEL_ALL}
                onValueChange={(v) => update('kullaniciID', v === SENTINEL_ALL ? undefined : Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_ALL}>{t('accounting.filter.all')}</SelectItem>
                  {users.map((u) => (
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

        {/* Currency totals strip */}
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

        {/* Result count — legacy textBoxSorgu */}
        <div className="text-sm text-muted-foreground">
          {t('accounting.filter.rowCount')}: <span className="font-semibold text-foreground">{page?.totalCount ?? 0}</span>
        </div>

        <DataTable
          columns={cols}
          data={(page?.items ?? []) as unknown as Row[]}
          keyField="id"
          loading={isLoading}
        />

        {page && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('common.total')}: {page.totalCount} • {t('common.page')} {page.page}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline"
                disabled={(filter.page ?? 1) <= 1}
                onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>
                {t('common.previous')}
              </Button>
              <Button size="sm" variant="outline"
                disabled={page.items.length < (filter.pageSize ?? 50)}
                onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
