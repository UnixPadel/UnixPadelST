import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { desktop, nextZoomStep, useDesktopZoom } from '@/lib/desktop'
import { cn } from '@/lib/utils'

/**
 * Topbar yakınlaştırma: − / %değer / +. Ortadaki değere tıklamak %100'e döner
 * (Ctrl+0). Yalnız masaüstü uygulamasında (Electron zoomFactor) görünür.
 * 40+ ergonomi — butonlar 22px'ten ölçek tokenına (32/36px) büyütüldü.
 */
export function ZoomControl() {
  const { t } = useTranslation()
  const zoom = useDesktopZoom()
  if (!desktop || !zoom) return null

  const down = nextZoomStep(zoom.factor, -1)
  const up = nextZoomStep(zoom.factor, 1)
  const pct = Math.round(zoom.factor * 100)
  const btn = 'flex h-ctl-xs w-ctl-xs items-center justify-center rounded text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:text-muted-foreground'

  return (
    <div className="flex items-center gap-0.5 rounded-md border px-1 py-0.5" role="group" aria-label={t('topbar.zoom')}>
      <button
        className={btn}
        disabled={down === null}
        onClick={() => down !== null && void desktop!.setZoom(down)}
        aria-label={t('topbar.zoomOut')}
        title={`${t('topbar.zoomOut')} (Ctrl −)`}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <button
        className={cn(
          'h-ctl-xs min-w-[3.5rem] rounded px-1.5 text-sm font-medium tabular-nums text-foreground transition-colors hover:bg-accent',
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
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
