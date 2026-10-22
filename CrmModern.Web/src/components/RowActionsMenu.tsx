import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContextMenu, type RowAction } from '@/components/ContextMenu'

/**
 * "⋯" butonu — satırın bağlam menüsünü (sağ tık ile aynı RowAction kaydı)
 * butonun altında açar. Satır başına 6 eş ağırlıklı buton yerine tek birincil
 * aksiyon + bu menü kullanılır (QW: hiyerarşi).
 */
export function RowActionsMenu<T>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  const { t } = useTranslation()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={t('table.moreActions')}
        title={t('table.moreActions')}
        aria-haspopup="menu"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPos({ x: r.left, y: r.bottom + 4 })
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {pos && <ContextMenu x={pos.x} y={pos.y} row={row} actions={actions} onClose={() => setPos(null)} />}
    </>
  )
}
