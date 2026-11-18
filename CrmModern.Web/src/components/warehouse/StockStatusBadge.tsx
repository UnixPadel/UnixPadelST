import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Circle, CircleDot, CheckCircle2 } from 'lucide-react'

interface StockStatusBadgeProps {
  status: 'Bekliyor' | 'Kismen' | 'Tamam' | string
  exitedQuantity?: number
  unit?: string
}

export function StockStatusBadge({ status, exitedQuantity, unit }: StockStatusBadgeProps) {
  const { t } = useTranslation()

  if (status === 'Tamam') {
    return (
      <Badge variant="success" className="gap-1 font-medium text-2xs">
        <CheckCircle2 className="h-3 w-3" />
        {t('warehouse.status.done')}
      </Badge>
    )
  }

  if (status === 'Kismen') {
    const qtyText = exitedQuantity != null && exitedQuantity > 0 ? `${exitedQuantity} ${unit ?? ''}`.trim() : null
    return (
      <Badge variant="warning" className="gap-1 font-medium text-2xs">
        <CircleDot className="h-3 w-3" />
        {qtyText ? t('warehouse.status.partialQuantity', { quantity: qtyText }) : t('warehouse.status.partial')}
      </Badge>
    )
  }

  return (
    <Badge variant="neutral" className="gap-1 font-medium text-2xs">
      <Circle className="h-3 w-3" />
      {t('warehouse.status.waiting')}
    </Badge>
  )
}
