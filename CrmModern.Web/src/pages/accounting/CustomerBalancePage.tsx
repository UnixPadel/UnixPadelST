import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { getCustomers } from '@/api/customers'
import { getCustomerBalance, getTransactionHistory } from '@/api/accounting'
import { getOrders } from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { Combobox } from '@/components/ui/combobox'
import { LookupDialog } from '@/components/LookupDialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionTitle } from '@/components/ui/section-title'
import { KeyValue } from '@/components/ui/key-value'
import { formatMoney } from '@/lib/currency'
import { formatDate } from '@/lib/utils'
import { downloadCsv } from '@/lib/export'
import { cn } from '@/lib/utils'

/**
 * E-15 — LOGO/ETA "Cari Hesap Ekstresi". Önceden yalnız döviz başına bakiye
 * kartları vardı; artık seçilen müşteri için tarih aralıklı hareket dökümü:
 *   Borç   = sipariş tutarı (Teklif/İptal/silinmiş hariç, sipariş tarihinde)
 *   Alacak = tahsilat (iptal edilenler hariç)
 *   Bakiye = döviz başına yürüyen bakiye
 * Satırdan belgeye (sipariş detayı + belge akışı) gidilir; CSV/Excel çıktısı alınır.
 * Veri mevcut uçlardan birleştirilir (getOrders + getTransactionHistory).
 */
interface Movement {
  key: string
  tarih: string
  siparisNo: string
  tur: 'borc' | 'alacak'
  aciklama: string
  borc: number
  alacak: number
  paraTipi: string
  bakiye?: number
}

const EXCLUDED_STAGES = new Set(['Teklif', 'Iptal'])

export function CustomerBalancePage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [lookupOpen, setLookupOpen] = useState(false)
  const musteriId = params.get('m') ? Number(params.get('m')) : null
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const setParam = (k: string, v: string) => setParams((p) => {
    const np = new URLSearchParams(p)
    if (v) np.set(k, v); else np.delete(k)
    return np
  }, { replace: true })

  const { data: customers = [], isLoading: customersLoading } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const customer = customers.find((c) => c.musteriID === musteriId) ?? null

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['customer-balance', musteriId],
    queryFn: () => getCustomerBalance(musteriId!),
    enabled: !!musteriId,
  })
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-statement', 'orders', customer?.musteriAd],
    queryFn: () => getOrders({ musteriAd: customer!.musteriAd, pageSize: 1000, page: 1 }),
    enabled: !!customer,
  })
  const { data: txPage, isLoading: txLoading } = useQuery({
    queryKey: ['customer-statement', 'tx', customer?.musteriAd],
    queryFn: () => getTransactionHistory({ musteriAd: customer!.musteriAd, pageSize: 2000, page: 1 }),
    enabled: !!customer,
  })

  // Döviz bazında, tarih sırasıyla, yürüyen bakiyeli hareket listesi.
  const byCurrency = useMemo(() => {
    if (!customer) return new Map<string, Movement[]>()
    const name = customer.musteriAd
    const moves: Movement[] = []
    for (const o of orders?.items ?? []) {
      // Sunucu araması "içerir" olabilir — müşteri adı tam eşleşmeli.
      if (o.musteriAd !== name || o.silindi || EXCLUDED_STAGES.has(o.siparisMiTeklifMi)) continue
      moves.push({
        key: `o-${o.siparisAlID}`, tarih: o.tarih, siparisNo: o.siparisNo || o.teklifNo, tur: 'borc',
        aciklama: t('statement.orderLine'), borc: o.toplamFiyat ?? 0, alacak: 0, paraTipi: o.paraTipi,
      })
    }
    for (const x of txPage?.items ?? []) {
      if (x.musteriAd && x.musteriAd !== name) continue
      moves.push({
        key: `t-${x.id}`, tarih: x.tarih, siparisNo: x.siparisNo, tur: 'alacak',
        aciklama: x.installmentIndex > 0 ? t('statement.paymentN', { n: x.installmentIndex }) : t('statement.payment'),
        borc: 0, alacak: x.odenenMiktar ?? 0, paraTipi: x.paraTipi ?? '—',
      })
    }
    const fromTs = from ? new Date(from).getTime() : null
    const toTs = to ? new Date(to).getTime() + 86_400_000 : null
    const map = new Map<string, Movement[]>()
    for (const m of moves.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime() || (a.tur === 'borc' ? -1 : 1))) {
      const list = map.get(m.paraTipi) ?? []
      const prev = list.length ? list[list.length - 1].bakiye ?? 0 : 0
      list.push({ ...m, bakiye: prev + m.borc - m.alacak })
      map.set(m.paraTipi, list)
    }
    // Tarih aralığı yürüyen bakiyeyi bozmadan (devreden bakiye korunur) süzülür.
    if (fromTs || toTs) {
      for (const [k, list] of map) {
        const opening = fromTs ? [...list].reverse().find((m) => new Date(m.tarih).getTime() < fromTs)?.bakiye ?? 0 : 0
        const shown = list.filter((m) => {
          const ts = new Date(m.tarih).getTime()
          return (!fromTs || ts >= fromTs) && (!toTs || ts < toTs)
        })
        map.set(k, fromTs && opening ? [{ key: `open-${k}`, tarih: from, siparisNo: '', tur: 'borc', aciklama: t('statement.opening'), borc: 0, alacak: 0, paraTipi: k, bakiye: opening }, ...shown] : shown)
      }
    }
    return map
  }, [customer, orders, txPage, from, to, t])

  const loading = !!customer && (ordersLoading || txLoading)
  const openOrder = (no: string) => setParams((p) => { const np = new URLSearchParams(p); np.set('order', no); return np })

  const exportCsv = () => {
    if (!customer) return
    const rows: (string | number)[][] = []
    for (const [cur, list] of byCurrency) {
      for (const m of list) rows.push([cur, formatDate(m.tarih), m.siparisNo, m.aciklama, m.borc || '', m.alacak || '', m.bakiye ?? ''])
    }
    downloadCsv(`ekstre-${customer.musteriAd}`, [t('common.currency'), t('common.date'), t('common.orderNo'), t('statement.description'), t('statement.debit'), t('statement.credit'), t('common.balance')], rows)
  }

  return (
    <div>
      <PageHeader
        title={t('statement.title')}
        description={t('statement.description_page')}
        actions={customer && byCurrency.size > 0 ? (
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> {t('table.export')}</Button>
        ) : undefined}
      />
      <div className="space-y-4 p-4 lg:p-6">
        <form role="search" className="grid max-w-4xl gap-3 md:grid-cols-[1fr_160px_160px]" onSubmit={(e) => e.preventDefault()}>
          <FormField label={t('common.customer')} hint={t('orders.form.musteriHint')}>
            <Combobox
              options={customers.map((c) => ({ value: String(c.musteriID), label: c.musteriAd, description: c.ulkeAdi, keywords: `${c.vatNumarasi ?? ''} ${c.telefon ?? ''}` }))}
              value={musteriId ? String(musteriId) : ''}
              onValueChange={(v) => setParam('m', v)}
              onLookup={() => setLookupOpen(true)}
              placeholder={t('orders.form.musteriSec')}
              loading={customersLoading}
            />
          </FormField>
          <FormField label={t('common.startDate')}>
            <Input type="date" value={from} onChange={(e) => setParam('from', e.target.value)} />
          </FormField>
          <FormField label={t('common.endDate')}>
            <Input type="date" value={to} onChange={(e) => setParam('to', e.target.value)} />
          </FormField>
        </form>

        {!musteriId && <p className="text-sm text-muted-foreground">{t('statement.pickCustomer')}</p>}

        {musteriId && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {balanceLoading && Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-md bg-muted" />)}
            {!balanceLoading && (balance?.lines ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">{t('statement.noBalance')}</p>
            )}
            {balance?.lines.map((l) => (
              <div key={l.paraTipi} className="space-y-1.5 rounded-md border bg-card p-4">
                <SectionTitle actions={<Badge variant={l.kalan > 0.005 ? 'warning' : 'success'}>{l.kalan > 0.005 ? t('statement.open') : t('statement.closed')}</Badge>}>
                  {l.paraTipi}
                </SectionTitle>
                <KeyValue label={t('statement.debit')} value={<span className="tabular-nums">{formatMoney(l.toplam, l.paraTipi)}</span>} />
                <KeyValue label={t('statement.credit')} value={<span className="tabular-nums text-success">{formatMoney(l.odenen, l.paraTipi)}</span>} />
                <KeyValue emphasis className="border-t pt-1.5" label={t('common.balance')}
                  value={<span className={cn('tabular-nums', l.kalan > 0.005 ? 'text-warning' : 'text-muted-foreground')}>{formatMoney(l.kalan, l.paraTipi)}</span>} />
              </div>
            ))}
          </div>
        )}

        {customer && (
          <div className="space-y-4">
            {loading && <div className="h-40 animate-pulse rounded-md bg-muted" />}
            {!loading && byCurrency.size === 0 && <p className="text-sm text-muted-foreground">{t('statement.noMovements')}</p>}
            {[...byCurrency.entries()].map(([cur, list]) => {
              const debit = list.reduce((a, m) => a + m.borc, 0)
              const credit = list.reduce((a, m) => a + m.alacak, 0)
              return (
                <section key={cur} className="space-y-2">
                  <SectionTitle>{t('statement.movementsIn', { currency: cur })}</SectionTitle>
                  {/* Scaling Faz 2 — uzun ekstre kendi kabında kayar, başlık yapışık kalır. */}
                  <div className="max-h-[calc(100vh-12rem)] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-muted">
                        <tr className="text-xs text-muted-foreground">
                          <th className="px-3 py-2 text-left font-medium">{t('common.date')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('common.orderNo')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('statement.description')}</th>
                          <th className="px-3 py-2 text-right font-medium">{t('statement.debit')}</th>
                          <th className="px-3 py-2 text-right font-medium">{t('statement.credit')}</th>
                          <th className="px-3 py-2 text-right font-medium">{t('common.balance')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((m) => (
                          <tr key={m.key} className={cn('border-t', !m.siparisNo && 'bg-muted/40 italic')}>
                            <td className="px-3 py-1.5 tabular-nums">{formatDate(m.tarih)}</td>
                            <td className="px-3 py-1.5">
                              {m.siparisNo ? <button type="button" className="font-mono text-primary hover:underline" onClick={() => openOrder(m.siparisNo)}>{m.siparisNo}</button> : '—'}
                            </td>
                            <td className="px-3 py-1.5">{m.aciklama}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{m.borc ? formatMoney(m.borc, cur) : ''}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-success">{m.alacak ? formatMoney(m.alacak, cur) : ''}</td>
                            <td className={cn('px-3 py-1.5 text-right font-medium tabular-nums', (m.bakiye ?? 0) > 0.005 ? 'text-warning' : (m.bakiye ?? 0) < -0.005 ? 'text-destructive' : '')}>
                              {formatMoney(m.bakiye ?? 0, cur)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted font-medium">
                        <tr className="border-t-2">
                          <td className="px-3 py-2" colSpan={3}>{t('common.total')}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(debit, cur)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(credit, cur)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(list[list.length - 1]?.bakiye ?? 0, cur)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      <LookupDialog
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        title={t('orders.form.musteriSec')}
        rows={customers}
        getKey={(c) => c.musteriID}
        onSelect={(c) => setParam('m', String(c.musteriID))}
        columns={[
          { key: 'ad', header: t('common.customer'), value: (c) => c.musteriAd },
          { key: 'ulke', header: t('common.country'), value: (c) => c.ulkeAdi },
          { key: 'vat', header: t('common.vat'), value: (c) => c.vatNumarasi },
          { key: 'tel', header: t('common.phone'), value: (c) => c.telefon },
        ]}
      />
    </div>
  )
}
