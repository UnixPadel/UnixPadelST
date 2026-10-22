import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelRightClose, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrderDetailModal, OrderDetailPanel } from '@/components/OrderDetailModal'
import { cn } from '@/lib/utils'

/**
 * E-9 — Fiori Flexible Column Layout: liste solda, sipariş detayı sağda.
 * Detay için modal açıp kapamak yerine ↑/↓ ile satır değiştikçe sağ panel
 * güncellenir. Dar ekranlarda (<1280px) aynı detay modal olarak açılır.
 * Panel genişliği kullanıcı tercihi olarak hatırlanır.
 */
const WIDE = '(min-width: 1280px)'

function useIsWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function MasterDetailLayout({
  children, siparisNo, onClose, factoryView, logisticsView, hideNotes, className,
}: {
  children: React.ReactNode
  siparisNo: string | null
  onClose: () => void
  factoryView?: boolean
  logisticsView?: boolean
  hideNotes?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const wide = useIsWide()
  const [modalNo, setModalNo] = useState<string | null>(null)
  const viewProps = { factoryView, logisticsView, hideNotes }

  if (!wide) {
    return (
      <>
        {children}
        <OrderDetailModal siparisNo={siparisNo} onClose={onClose} {...viewProps} />
      </>
    )
  }

  return (
    <div className={cn('grid gap-4', siparisNo ? 'grid-cols-[minmax(0,1fr)_minmax(420px,38%)]' : 'grid-cols-1', className)}>
      <div className="min-w-0">{children}</div>
      {siparisNo && (
        <aside
          aria-label={t('orderDetail.title', { no: siparisNo })}
          className="sticky top-2 max-h-[calc(100vh-8rem)] min-w-0 self-start overflow-y-auto rounded-md border bg-card p-3 shadow-sm"
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
      <OrderDetailModal siparisNo={modalNo} onClose={() => setModalNo(null)} {...viewProps} />
    </div>
  )
}
