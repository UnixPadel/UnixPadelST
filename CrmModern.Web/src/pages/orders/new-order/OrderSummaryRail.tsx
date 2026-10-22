import { useTranslation } from 'react-i18next'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { KeyValue } from '@/components/ui/key-value'
import { formatNumberTR } from '@/lib/number'
import type { OrderIssue, OrderTotals } from '@/lib/orderForm'
import { cn } from '@/lib/utils'

/**
 * E-11 — LOGO/ETA fiş ekranındaki sabit alt toplam paneli / Fiori özet: toplamın
 * nasıl oluştuğu tek bakışta + kaydetmeden önce eksikler listesi (tıklayınca
 * ilgili alana gider). Sağ kolonda yapışkan durur.
 */
const ISSUE_TARGET: Record<OrderIssue, string> = {
  musteriAd: 'order-musteriAd',
  lineItems: 'order-sets',
  pesinYuzde: 'order-pesinYuzde',
  amendReason: 'order-amendReason',
}

export function focusIssue(issue: OrderIssue) {
  const el = document.getElementById(ISSUE_TARGET[issue])
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  const focusable = el.matches('input,textarea,[role="combobox"]') ? el : el.querySelector<HTMLElement>('input,textarea,[role="combobox"],button')
  focusable?.focus({ preventScroll: true })
}

export function OrderSummaryRail({
  totals, sym, pesinYuzde, indirim, kdv, issues, setCount, freeCount, docNo,
}: {
  totals: OrderTotals
  sym: string
  pesinYuzde: number | null
  indirim: number | null
  kdv: number | null
  issues: OrderIssue[]
  setCount: number
  freeCount: number
  docNo?: string | null
}) {
  const { t } = useTranslation()
  const m = (n: number) => `${formatNumberTR(n)} ${sym}`
  return (
    <aside aria-label={t('orders.summary.title')} className="space-y-3 rounded-md border bg-card p-3 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t('orders.summary.title')}</h2>
        {docNo && <span className="font-mono text-xs text-muted-foreground">{docNo}</span>}
      </div>
      <div className="space-y-1">
        <KeyValue label={t('orders.summary.sets', { count: setCount })} value={<span className="tabular-nums">{m(totals.setsTotal)}</span>} />
        {totals.montaj > 0 && <KeyValue label={t('orders.form.montaj')} value={<span className="tabular-nums">{m(totals.montaj)}</span>} />}
        {totals.teslimat > 0 && <KeyValue label={t('orders.form.teslimat')} value={<span className="tabular-nums">{m(totals.teslimat)}</span>} />}
        <KeyValue className="border-t pt-1" label={t('orders.form.previewBrut')} value={<span className="tabular-nums">{m(totals.brut)}</span>} />
        {(indirim ?? 0) > 0 && <KeyValue label={`${t('orders.form.indirim')}`} value={<span className="tabular-nums">−{m(totals.indirimTutar)} <span className="text-muted-foreground">(%{indirim})</span></span>} />}
        {(kdv ?? 0) > 0 && <KeyValue label={t('orders.form.kdv')} value={<span className="tabular-nums">+{m(totals.kdvTutar)} <span className="text-muted-foreground">(%{kdv})</span></span>} />}
        {totals.extra > 0 && <KeyValue label={t('orders.form.ekstraMaliyet')} value={<span className="tabular-nums">+{m(totals.extra)}</span>} />}
      </div>
      <div className="flex items-baseline justify-between rounded-md bg-primary/10 px-3 py-2">
        <span className="text-sm font-semibold">{t('orders.form.toplamFiyatLabel')}</span>
        <span className="text-lg font-bold tabular-nums">{m(totals.toplam)}</span>
      </div>
      <KeyValue
        label={`${t('orders.form.kaporaMiktari')}${pesinYuzde ? ` (%${pesinYuzde})` : ''}`}
        value={<span className="font-medium tabular-nums">{m(totals.kapora)}</span>}
      />
      {freeCount > 0 && (
        <p className="text-[11px] text-muted-foreground">{t('orders.summary.freeItemsNote', { count: freeCount })}</p>
      )}

      <div className="border-t pt-2">
        {issues.length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> {t('orders.summary.ready')}</p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t('orders.summary.missing')}</p>
            <ul className="space-y-0.5">
              {issues.map((i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => focusIssue(i)}
                    className={cn('flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs text-warning-soft-foreground hover:bg-warning-soft')}
                  >
                    <CircleAlert className="h-3.5 w-3.5 shrink-0 text-warning" /> {t(`orders.issues.${i}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}
