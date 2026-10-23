import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  /** QW-4 — yoğun ekranlar (QC, Muhasebe Onay) için ince başlık. */
  density?: 'normal' | 'compact'
  /** Başlığın yanında küçük bilgi (sayaç, rozet). */
  meta?: React.ReactNode
}

// QW-4 — tipografi ölçeği: sayfa başlığı text-lg/semibold (tüm sayfalarda tek stil).
export function PageHeader({ title, description, actions, density = 'normal', meta }: PageHeaderProps) {
  const compact = density === 'compact'
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 border-b bg-card', compact ? 'px-4 py-2' : 'px-6 py-4')}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className={cn('font-semibold truncate', compact ? 'text-base' : 'text-lg')}>{title}</h1>
          {meta}
        </div>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
