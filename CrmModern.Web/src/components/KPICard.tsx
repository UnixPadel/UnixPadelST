import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  baslik: string
  deger: string | number
  altMetin?: string
  ikon?: ReactNode
  /** Eski tailwind text-* renk sınıfı — QW-11 ile modül ikonları nötr; yalnız geriye uyum. */
  renk?: string
  vurgu?: 'normal' | 'uyari' | 'basari'
  /** QW-11 — verilirse kart ilgili kuyruğa giden bir bağlantı olur. */
  to?: string
}

/**
 * Dashboard KPI kartı — sayı + başlık + ikon. QW-11: kart tıklanabilir
 * (ör. "Bekleyen Kontrol: 7" → Kontrol ekranı); vurgu semantik tonlarla.
 */
export function KPICard({ baslik, deger, altMetin, ikon, renk, vurgu = 'normal', to }: KPICardProps) {
  const vurguClass =
    vurgu === 'uyari'  ? 'border-warning/50 bg-warning-soft/30' :
    vurgu === 'basari' ? 'border-success/40' :
                         ''

  const body = (
    <Card className={cn(vurguClass, to && 'transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{baslik}</p>
            <p className="mt-1 truncate text-2xl font-bold tabular-nums">{deger}</p>
            {altMetin && <p className="mt-1 truncate text-xs text-muted-foreground">{altMetin}</p>}
          </div>
          {ikon && <div className={cn(renk ?? 'text-muted-foreground', vurgu === 'uyari' && 'text-warning')}>{ikon}</div>}
        </div>
        {to && <ArrowRight className="mt-1 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
      </CardContent>
    </Card>
  )
  return to ? <Link to={to} className="group block rounded-lg focus-visible:outline-none" aria-label={`${baslik}: ${deger}`}>{body}</Link> : body
}
