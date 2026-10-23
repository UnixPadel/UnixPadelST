import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelRightClose, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrderDetailModal, OrderDetailPanel } from '@/components/OrderDetailModal'
import { cn } from '@/lib/utils'

/**
 * E-9 — Fiori Flexible Column Layout: liste solda, sipariş detayı sağda.
 * Detay için modal açıp kapamak yerine ↑/↓ ile satır değiştikçe sağ panel
 * güncellenir. Dar alanda aynı detay modal olarak açılır.
 * Scaling Faz 2 — "dar/geniş" kararı pencereye değil kabın kendi genişliğine
 * göre (sidebar açık/kapalı, zoom fark etmez). `fill` → FillRegion içinde liste
 * ve panel kalan yüksekliği doldurur, ikisi de kendi içinde kayar.
 */
const WIDE_MIN = 960

function useElementWidth(ref: React.RefObject<HTMLElement>) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [ref])
  return w
}

export function MasterDetailLayout({
  children, siparisNo, onClose, factoryView, logisticsView, hideNotes, className, fill,
}: {
  children: React.ReactNode
  siparisNo: string | null
  onClose: () => void
  factoryView?: boolean
  logisticsView?: boolean
  hideNotes?: boolean
  className?: string
  fill?: boolean
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const width = useElementWidth(ref)
  const wide = width >= WIDE_MIN
  const [modalNo, setModalNo] = useState<string | null>(null)
  const viewProps = { factoryView, logisticsView, hideNotes }
  const side = wide && !!siparisNo

  return (
    <div
      ref={ref}
      className={cn(
        side ? 'grid grid-cols-[minmax(0,1fr)_minmax(360px,32%)] gap-4' : 'grid grid-cols-1',
        fill && 'h-full min-h-0 grid-rows-[minmax(0,1fr)]',
        className,
      )}
    >
      <div className={cn('min-w-0', fill && 'min-h-0')}>{children}</div>
      {side && (
        <aside
          aria-label={t('orderDetail.title', { no: siparisNo })}
          className={cn(
            'min-w-0 overflow-y-auto rounded-md border bg-card p-3 shadow-sm',
            fill ? 'min-h-0' : 'sticky top-2 max-h-[calc(100vh-8rem)] self-start',
          )}
        >
          <div className="mb-2 flex items-center justify-end gap-1">
            <Button size="icon-sm" variant="ghost" aria-label={t('masterDetail.expand')} title={t('masterDetail.expand')} onClick={() => setModalNo(siparisNo)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label={t('masterDetail.close')} title={`${t('masterDetail.close')} (Esc)`} onClick={onClose}>
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          <OrderDetailPanel siparisNo={siparisNo} embedded {...viewProps} />
        </aside>
      )}
      {/* Dar alanda detay modalda; genişte "büyüt" düğmesi aynı modalı açar. */}
      <OrderDetailModal siparisNo={side ? modalNo : (width ? siparisNo : null)} onClose={side ? () => setModalNo(null) : onClose} {...viewProps} />
    </div>
  )
}
