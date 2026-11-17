import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContextMenu, type RowAction } from '@/components/ContextMenu'

/**
 * Satırın işlem menüsü (sağ tık ile aynı RowAction kaydı). 40+ ergonomi (2.2) —
 * önceden 28px'lik etiketsiz "⋯" ikonuydu; artık görünür metinli "İşlemler ▾"
 * butonu. Menü tıklamayla açılır (üzerine gelince değil).
 */
export function RowActionsMenu<T>({ row, actions, label }: { row: T; actions: RowAction<T>[]; label?: string }) {
  const { t } = useTranslation()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  return (
    <>
      <Button
        size="xs"
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPos({ x: r.left, y: r.bottom + 4 })
        }}
      >
        {label ?? t('table.actions')} <ChevronDown className="h-4 w-4" aria-hidden />
      </Button>
      {pos && <ContextMenu x={pos.x} y={pos.y} row={row} actions={actions} onClose={() => setPos(null)} />}
    </>
  )
}
