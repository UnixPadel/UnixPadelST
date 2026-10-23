import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { desktop, nextZoomStep, useDesktopZoom } from '@/lib/desktop'
import { cn } from '@/lib/utils'

/**
 * Topbar arayüz ölçeği: − / %değer / +. Ortadaki değere tıklamak otomatiğe döner
 * (Ctrl+0). Yalnız masaüstü uygulamasında (Electron zoomFactor) görünür.
 */
export function ZoomControl() {
  const { t } = useTranslation()
  const zoom = useDesktopZoom()
  if (!desktop || !zoom) return null

  const down = nextZoomStep(zoom.factor, -1)
  const up = nextZoomStep(zoom.factor, 1)
  const pct = Math.round(zoom.factor * 100)
  const btn = 'rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40'

  return (
    <div className="flex items-center gap-0.5 rounded-md border px-1 py-0.5" role="group" aria-label={t('topbar.zoom')}>
      <button
        className={btn}
        disabled={down === null}
        onClick={() => down !== null && void desktop!.setZoom(down)}
        aria-label={t('topbar.zoomOut')}
        title={`${t('topbar.zoomOut')} (Ctrl −)`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        className={cn(
          'min-w-[3rem] rounded px-1 py-0.5 text-xs font-medium tabular-nums transition-colors hover:bg-accent',
          zoom.setting === 'auto' ? 'text-muted-foreground' : 'text-foreground',
        )}
        onClick={() => void desktop!.setZoom('auto')}
        aria-label={t('topbar.zoomReset')}
        title={`${t('topbar.zoomReset')} (Ctrl+0)`}
      >
        %{pct}
      </button>
      <button
        className={btn}
        disabled={up === null}
        onClick={() => up !== null && void desktop!.setZoom(up)}
        aria-label={t('topbar.zoomIn')}
        title={`${t('topbar.zoomIn')} (Ctrl +)`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
