import { Card, CardContent } from '@/components/ui/card'
import type { ReactNode } from 'react'

interface KPICardProps {
  baslik: string
  deger: string | number
  altMetin?: string
  ikon?: ReactNode
  renk?: string  // tailwind text-* color
  vurgu?: 'normal' | 'uyari' | 'basari'
}

/**
 * Dashboard KPI kartı — sayı + başlık + ikon.
 * WinForms'ta karşılığı yoktu (Form3 dashboard yorum satırı); minimum dashboard için eklendi.
 */
export function KPICard({ baslik, deger, altMetin, ikon, renk, vurgu = 'normal' }: KPICardProps) {
  const vurguClass =
    vurgu === 'uyari'  ? 'border-amber-300 dark:border-amber-700' :
    vurgu === 'basari' ? 'border-green-300 dark:border-green-700' :
                         ''

  return (
    <Card className={vurguClass}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {baslik}
            </p>
            <p className="text-2xl font-bold mt-1 truncate">{deger}</p>
            {altMetin && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{altMetin}</p>
            )}
          </div>
          {ikon && (
            <div className={renk ?? 'text-muted-foreground'}>
              {ikon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
