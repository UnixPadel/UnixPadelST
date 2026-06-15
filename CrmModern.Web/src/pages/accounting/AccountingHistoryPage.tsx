import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getTransactionHistory, downloadAccountingExcel,
  getAccountingOrderDetail, submitMaliyetTalep,
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { DecimalInput } from '@/components/DecimalInput'
import { KPICard } from '@/components/KPICard'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { describeApiError } from '@/lib/axios'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { AccountingOrderListDto } from '@/types'

/**
 * PROMPT.md ACCOUNTING #15 + PROMPT-v2 §10 — Muhasebe Geçmiş.
 *
 * §10.1: Yonetici/Muhasebe için tek "Tutar" sütunu yerine SiparisNo bazında
 * gruplanmış peşinat sütunları (1. Peşinat / 2. Peşinat / …) + Fark (1→2).
 * Görünür peşinat 4 ile sınırlı; fazlası "+N daha" hücresinde toplanır.
 * Gozlemci için eski tek-Tutar görünümü korunur.
 *
 * §10.2: Her satırın en solunda "Maliyet Reçetesi" butonu; modal kar/zarar
 * hesabı yapar (Brüt Kar, Net Kar, Marj %, Tahsilat Oranı) ve maliyet düzenleme
 * affordance'i mevcut `POST /api/accounting/orders/{no}/maliyet` endpoint'ine
 * gider; modal kapanınca accounting-orders query'si invalidate edilir.
 */

const SENTINEL_ALL = '__all__'
const MAX_VISIBLE_INSTALLMENTS = 4

interface InstallmentCell {
  index: number
  miktar: number | null
  tarih: string
}

interface OrderRow {
  siparisNo: string
  musteriAd?: string
  kullanici?: string
  paraTipi?: string
  installments: InstallmentCell[]
}

export function AccountingHistoryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { getUser } = useAuth()
  const role = getUser()?.yetkiTuru ?? ''
  // PROMPT-v2 §10.3: Sadece Yonetici + Muhasebe peşinat sütunları + Maliyet
  // Reçetesi butonu görür. Gozlemci eski tek-Tutar görünümünde kalır.
  const showInstallments = role === 'Yonetici' || role === 'Muhasebe'

  // Grouped view için server-side sayfalama bilgili değil — installment'lar
  // sayfa sınırını aşmasın diye pageSize'ı yükseltiyoruz.
  const DEFAULT_PAGE_SIZE = showInstallments ? 200 : 50
  const [filter, setFilter] = useState<TransactionFilter>({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  const [exporting, setExporting] = useState(false)
  const [maliyetTarget, setMaliyetTarget] = useState<string | null>(null)

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
    catch (e) { toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }) }
    finally { setExporting(false) }
  }

  const { data: page, isLoading } = useQuery({
    queryKey: ['tx-history', filter],
    queryFn: () => getTransactionHistory(filter),
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
          installments: [],
        }
        m.set(tx.siparisNo, g)
      }
      g.installments.push({
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
    { key: 'id',           header: 'ID' },
    { key: 'tarih',        header: t('common.date'),     render: (r) => formatDate(r.tarih as string) },
    { key: 'siparisNo',    header: t('common.orderNo') },
    { key: 'musteriAd',    header: t('common.customer') },
    { key: 'kullanici',    header: t('common.representative') },
    { key: 'paraTipi',     header: t('common.currency') },
    { key: 'odenenMiktar', header: t('common.amount'),
      render: (r) => formatCurrency((r.odenenMiktar as number) ?? 0, r.paraTipi as string) },
  ]

  // ── Filter helpers ─────────────────────────────────────────────────────
  const update = <K extends keyof TransactionFilter>(k: K, v: TransactionFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))
  const reset = () => setFilter({ page: 1, pageSize: DEFAULT_PAGE_SIZE })

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

        {/* Result count */}
        <div className="text-sm text-muted-foreground">
          {t('accounting.filter.rowCount')}: <span className="font-semibold text-foreground">{page?.totalCount ?? 0}</span>
        </div>

        {/* Installment-grouped view (Yonetici + Muhasebe) */}
        {showInstallments ? (
          <InstallmentTable
            rows={orderRows}
            loading={isLoading}
            onMaliyet={(no) => setMaliyetTarget(no)}
          />
        ) : (
          <DataTable
            columns={legacyCols}
            data={(page?.items ?? []) as unknown as LegacyRow[]}
            keyField="id"
            loading={isLoading}
          />
        )}

        {/* Pagination — only meaningful in the legacy per-transaction view.
            Installment view loads up to 200 per page; pagination still works
            but a SiparisNo may straddle pages (acceptable v1 limitation). */}
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
                disabled={page.items.length < (filter.pageSize ?? DEFAULT_PAGE_SIZE)}
                onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* PROMPT-v2 §10.2: Maliyet Reçetesi modalı. */}
      <MaliyetRecetesiDialog
        siparisNo={maliyetTarget}
        onClose={() => setMaliyetTarget(null)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Installment table
// ─────────────────────────────────────────────────────────────────────────────

function InstallmentTable({
  rows, loading, onMaliyet,
}: {
  rows: OrderRow[]
  loading: boolean
  onMaliyet: (siparisNo: string) => void
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
    <div className="rounded-md border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase">
          <tr>
            <th className="px-2 py-2 text-left w-32">{t('accountingHistory.maliyetRecetesi')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.siparisNo')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.musteri')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.temsilci')}</th>
            <th className="px-2 py-2 text-left">{t('accountingHistory.cols.paraTipi')}</th>
            {Array.from({ length: maxN }, (_, i) => (
              <th key={i} className="px-2 py-2 text-right">{t('accountingHistory.cols.pesinat', { n: i + 1 })}</th>
            ))}
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.fark')}</th>
            <th className="px-2 py-2 text-right">{t('accountingHistory.cols.diger')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const visible = r.installments.slice(0, maxN)
            const overflow = r.installments.slice(maxN)
            const fark = r.installments.length >= 2
              ? ((r.installments[1].miktar ?? 0) - (r.installments[0].miktar ?? 0))
              : null
            return (
              <tr key={r.siparisNo} className="border-t hover:bg-muted/20">
                <td className="px-2 py-1">
                  <Button size="sm" variant="outline" onClick={() => onMaliyet(r.siparisNo)}>
                    {t('accountingHistory.maliyetRecetesi')}
                  </Button>
                </td>
                <td className="px-2 py-1 font-mono text-xs">{r.siparisNo}</td>
                <td className="px-2 py-1">{r.musteriAd ?? '—'}</td>
                <td className="px-2 py-1">{r.kullanici ?? '—'}</td>
                <td className="px-2 py-1">{r.paraTipi ?? '—'}</td>
                {Array.from({ length: maxN }, (_, i) => {
                  const inst = visible[i]
                  if (!inst) return <td key={i} className="px-2 py-1 text-right text-muted-foreground">—</td>
                  return (
                    <td key={i} className="px-2 py-1 text-right tabular-nums">
                      <div>{formatCurrency(inst.miktar ?? 0, r.paraTipi ?? '')}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(inst.tarih)}</div>
                    </td>
                  )
                })}
                <td className="px-2 py-1 text-right tabular-nums">
                  {fark === null
                    ? <span className="text-muted-foreground">—</span>
                    : <span className={fark < 0 ? 'text-red-600' : ''}>{formatCurrency(fark, r.paraTipi ?? '')}</span>}
                </td>
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
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Maliyet Reçetesi dialog (PROMPT-v2 §10.2)
// ─────────────────────────────────────────────────────────────────────────────

function MaliyetRecetesiDialog({
  siparisNo, onClose,
}: {
  siparisNo: string | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: order, isLoading } = useQuery<AccountingOrderListDto>({
    queryKey: ['accounting-order-detail', siparisNo],
    queryFn: () => getAccountingOrderDetail(siparisNo!),
    enabled: !!siparisNo,
  })

  const [maliyetEdit, setMaliyetEdit] = useState<number | null>(null)
  // Aynı sipariş için modal her açılışta servisten gelen maliyeti baseline yap.
  const baseMaliyet = order?.maliyet ?? null
  const effectiveMaliyet = maliyetEdit ?? baseMaliyet ?? 0

  const saveMut = useMutation({
    mutationFn: () => submitMaliyetTalep(siparisNo!, {
      maliyet:          effectiveMaliyet,
      maliyetDetayi:    order?.maliyetDetayi,
      toplamSiparis:    order?.toplamFiyat ?? undefined,
      kaporaBakiyesi:   order?.kaparoFiyat ?? undefined,
      kalanBakiyeTalep: order?.kalanBakiye ?? undefined,
      pesinYuzde:       order?.pesinYuzde,
    }),
    onSuccess: () => {
      toast({ title: t('accountingHistory.dialog.saved') })
      // Parent grid'i yenile — Kar / Maliyet sütunları güncelsin.
      qc.invalidateQueries({ queryKey: ['accounting-orders'] })
      qc.invalidateQueries({ queryKey: ['accounting-order-detail', siparisNo] })
      qc.invalidateQueries({ queryKey: ['tx-history'] })
    },
    onError: () => toast({ title: t('accountingHistory.dialog.saveFailed'), variant: 'destructive' }),
  })

  // ── Computed math ─────────────────────────────────────────────────────
  // PROMPT-v2 §10.2 formülleri.
  const toplam      = order?.toplamFiyat ?? 0
  const odenen      = order?.odenenMiktar ?? 0
  const indirimPct  = order?.indirim ?? 0   // İndirim mutlak değil; spec'te yüzde gibi okunuyor.
  const kdvPct      = order?.kdv ?? 0
  const maliyet     = effectiveMaliyet
  const brutKar     = toplam - maliyet
  const netKar      = toplam * (1 - indirimPct / 100) * (1 - kdvPct / 100) - maliyet
  const marjPct     = toplam > 0 ? (netKar / toplam) * 100 : 0
  const tahsilatPct = toplam > 0 ? (odenen / toplam) * 100 : 0
  const isLoss      = netKar < 0
  const cur         = order?.paraTipi ?? ''

  const handleClose = () => {
    setMaliyetEdit(null)
    onClose()
  }

  return (
    <Dialog open={!!siparisNo} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('accountingHistory.dialog.title', { no: siparisNo })}</DialogTitle>
        </DialogHeader>

        {isLoading || !order ? (
          <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Read-only girdiler */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ReadOnlyCell label={t('accountingHistory.dialog.toplamFiyat')} value={formatCurrency(toplam, cur)} />
              <ReadOnlyCell label={t('accountingHistory.dialog.odenenMiktar')} value={formatCurrency(odenen, cur)} />
              <ReadOnlyCell label={t('accountingHistory.dialog.indirim')} value={`%${indirimPct}`} />
              <ReadOnlyCell label={t('accountingHistory.dialog.kdv')} value={`%${kdvPct}`} />
              <ReadOnlyCell label={t('accountingHistory.dialog.pesin')} value={`%${order.pesinYuzde}`} />
              <ReadOnlyCell label={t('accountingHistory.dialog.paraTipi')} value={cur} />
            </div>

            {/* Maliyet — editlenebilir */}
            <div className="border rounded-md p-3 bg-muted/20 space-y-2">
              <Label className="text-xs">{t('accountingHistory.dialog.maliyetEdit')}</Label>
              <div className="flex items-center gap-2">
                <DecimalInput
                  value={maliyetEdit ?? baseMaliyet ?? ''}
                  onValueChange={(v) => setMaliyetEdit(v === '' ? 0 : v)}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">{cur}</span>
                <Button
                  size="sm"
                  disabled={saveMut.isPending || maliyetEdit === null}
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? t('common.saving') : t('accountingHistory.dialog.maliyetKaydet')}
                </Button>
              </div>
              {order.maliyetDetayi && (
                <p className="text-[11px] text-muted-foreground">{t('accountingHistory.dialog.detay')}: {order.maliyetDetayi}</p>
              )}
            </div>

            {/* Hesaplanan çıktılar — Net Kar pozitif yeşil / negatif kırmızı (Zarar). */}
            <div className={`border rounded-md p-3 space-y-2 ${
              isLoss ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'
            }`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICell label={t('accountingHistory.dialog.brutKar')}      value={formatCurrency(brutKar, cur)} />
                <KPICell
                  label={isLoss ? t('accountingHistory.dialog.zarar') : t('accountingHistory.dialog.netKar')}
                  value={formatCurrency(netKar, cur)}
                  highlight={isLoss ? 'loss' : 'profit'}
                />
                <KPICell label={t('accountingHistory.dialog.marj')}        value={`%${marjPct.toFixed(2)}`} />
                <KPICell label={t('accountingHistory.dialog.tahsilat')}    value={`%${tahsilatPct.toFixed(2)}`} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReadOnlyCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded p-2 bg-muted/30">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  )
}

function KPICell({ label, value, highlight }: { label: string; value: string; highlight?: 'loss' | 'profit' }) {
  const color = highlight === 'loss' ? 'text-red-700' : highlight === 'profit' ? 'text-emerald-700' : ''
  return (
    <div className="rounded p-2 bg-card">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`font-semibold text-sm ${color}`}>{value}</p>
    </div>
  )
}
