import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Search } from 'lucide-react'
import { usePanelHeaderSlot } from '@/components/MasterDetailLayout'
import { OrderLocationCard } from '@/components/order/OrderLocationCard'
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { KeyValue } from '@/components/ui/key-value'
import { SectionTitle } from '@/components/ui/section-title'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { hideMoneyFor } from '@/lib/visibility'
import type { OrderSearchHit } from '@/types'

/** Arama sonucunun özeti. Tüm ayrıntı "Siparişi Aç" penceresindedir. */
export function SearchResultPanel({ row, emptyText, onOpen }: {
  row: OrderSearchHit | null
  emptyText: string
  onOpen: (siparisNo: string) => void
}) {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const hideMoney = hideMoneyFor(getUser())
  const headerSlot = usePanelHeaderSlot()

  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
        <Search className="h-8 w-8" aria-hidden />
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }

  const money = (value: number | null) => (value == null ? null : formatCurrency(value, row.paraTipi))
  const matched = row.eslesen.map((code) => t(`search.fields.${code}`)).join(', ')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {headerSlot && createPortal(
        <>
          <StatusBadge value={row.tur} context="stage" />
          <OrderStatusBadge order={row} />
        </>,
        headerSlot,
      )}

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-2">
        <p className="break-words text-base font-semibold">{row.musteriAd}</p>
        <OrderLocationCard order={row} />
        {matched && <p className="text-xs text-muted-foreground">{t('search.matchedBy', { fields: matched })}</p>}

        <section className="space-y-1">
          <SectionTitle>{t('search.sections.customer')}</SectionTitle>
          <KeyValue label={t('common.country')} value={row.ulke} />
          <KeyValue label={t('common.phone')} value={row.telefon} />
          <KeyValue label={t('common.email')} value={row.eposta} valueClassName="min-w-0" />
          <KeyValue label={t('common.vat')} value={row.vergiNo} />
          <KeyValue label={t('common.address')} value={row.adres} valueClassName="min-w-0" />
        </section>

        {!hideMoney && (
          <section className="space-y-1">
            <SectionTitle>{t('search.sections.amounts')}</SectionTitle>
            <KeyValue label={t('common.totalAmount')} value={money(row.toplamFiyat)} emphasis valueClassName="tabular-nums" />
            <KeyValue label={t('orderDetail.brut')} value={money(row.brutToplamFiyat)} valueClassName="tabular-nums" />
            <KeyValue label={t('search.paid')} value={money(row.odenenMiktar)} valueClassName="tabular-nums" />
            <KeyValue label={t('search.remaining')} value={money(row.kalanBakiye)} valueClassName="tabular-nums" />
            <KeyValue label={t('orderDetail.pesinYuzde')} value={row.pesinYuzde == null ? null : `%${row.pesinYuzde}`} valueClassName="tabular-nums" />
            <KeyValue label={t('search.paymentStatus')} value={row.odemeDurum ? <StatusBadge value={row.odemeDurum} context="odeme" /> : null} />
          </section>
        )}

        <section className="space-y-1">
          <SectionTitle>{t('search.sections.document')}</SectionTitle>
          {row.teklifNo && row.teklifNo !== row.belgeNo && (
            <KeyValue label={t('common.quoteNo')} value={row.teklifNo} valueClassName="font-mono text-xs" />
          )}
          {row.siparisNo !== row.belgeNo && (
            <KeyValue label={t('common.orderNo')} value={row.siparisNo} valueClassName="font-mono text-xs" />
          )}
          <KeyValue label={t('common.representative')} value={row.temsilci} />
          <KeyValue label={t('common.date')} value={formatDate(row.tarih)} />
          <KeyValue label={t('search.company')} value={row.sirket} />
        </section>
      </div>

      <div className="shrink-0 space-y-2 border-t bg-card px-4 py-2">
        <Button size="lg" className="w-full" onClick={() => onOpen(row.siparisNo)}>
          <Eye className="h-4 w-4" aria-hidden /> {t('common.openOrder')}
        </Button>
      </div>
    </div>
  )
}
