import { MousePointerClick } from 'lucide-react'
import { OrderDetailPanel } from '@/components/OrderDetailModal'
import type { RowAction } from '@/components/ContextMenu'

/**
 * Liste ekranlarının sağ paneli (40+ ergonomi, 2026-11 sadeleştirmesi):
 *   üstte (kayar)  : siparişin kendisi (genel, kalemler, şartlar, geçmiş)
 *   altta (sabit)  : o ekranda bu siparişle yapılacak iş — tek ana buton
 * Satır başına buton yığını yerine işlem tek yerde durur; liste yalnız seçim
 * içindir. Sipariş seçili değilken ne yapılacağını söyleyen boş durum gösterilir.
 *
 * `footer` verilmezse (bu siparişte yapılacak iş yoksa) alt bölge çizilmez.
 */
export function OrderWorkPanel({
  siparisNo, emptyText, footer, hideNotes, logisticsView, factoryView, extraActions,
}: {
  siparisNo: string | null
  emptyText: string
  footer?: React.ReactNode
  hideNotes?: boolean
  logisticsView?: boolean
  factoryView?: boolean
  /** Ekrana özel işlemler; sipariş detayının "Diğer işlemler" menüsüne eklenir. */
  extraActions?: RowAction<unknown>[]
}) {
  if (!siparisNo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
        <MousePointerClick className="h-8 w-8" aria-hidden />
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OrderDetailPanel key={siparisNo} embedded siparisNo={siparisNo}
        hideNotes={hideNotes} logisticsView={logisticsView} factoryView={factoryView} extraActions={extraActions} />
      {footer && <div className="shrink-0 space-y-2 border-t bg-card px-4 py-2">{footer}</div>}
    </div>
  )
}
