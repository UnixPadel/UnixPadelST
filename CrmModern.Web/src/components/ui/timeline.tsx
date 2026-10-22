import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { StatusTone } from '@/lib/status'

/**
 * SR-6 — dikey zaman çizelgesi (OrderStageTimeline / OrderApprovalTimeline /
 * DocumentFlow ortak işaretlemesi; önceden iki dosyada birebir kopyaydı).
 */
export interface TimelineItem {
  key: string | number
  label: React.ReactNode
  tone?: StatusTone
  date?: React.ReactNode
  meta?: React.ReactNode
  body?: React.ReactNode
  icon?: React.ReactNode
  muted?: boolean
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('relative ml-2 space-y-3 border-l pl-4', className)}>
      {items.map((it) => (
        <li key={it.key} className={cn('relative text-sm', it.muted && 'opacity-60')}>
          <span className="absolute -left-[1.4rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-border">
            {it.icon}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant={it.tone ?? 'neutral'}>{it.label}</Badge>
            {it.date && <span className="text-xs text-muted-foreground tabular-nums">{it.date}</span>}
            {it.meta && <span className="text-xs text-muted-foreground">{it.meta}</span>}
          </div>
          {it.body && <div className="mt-1 text-xs">{it.body}</div>}
        </li>
      ))}
    </ol>
  )
}
