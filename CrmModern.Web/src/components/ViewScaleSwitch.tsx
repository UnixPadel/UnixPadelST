import { useTranslation } from 'react-i18next'
import { applyUiScale, setPreferences, usePreferences, type UiScale } from '@/lib/preferences'
import { cn } from '@/lib/utils'

/**
 * 40+ ergonomi (1.3) — üst çubukta tek tıkla "Görünüm: Rahat | Standart".
 * Rahat varsayılandır (K1); seçim kullanıcı tercihine yazılır ve tüm ekranlara
 * hemen uygulanır (index.css ölçek tokenları).
 */
export function ViewScaleSwitch() {
  const { t } = useTranslation()
  const { uiScale } = usePreferences()
  const choose = (s: UiScale) => { setPreferences({ uiScale: s }); applyUiScale(s) }
  const opt = (s: UiScale, label: string) => (
    <button
      type="button"
      aria-pressed={uiScale === s}
      onClick={() => choose(s)}
      className={cn(
        'h-ctl-xs rounded px-2.5 text-sm font-medium transition-colors',
        uiScale === s ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
      )}
    >
      {label}
    </button>
  )
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('topbar.view')} title={t('topbar.view')}>
      {/* Etiket yalnız geniş ekranda: dar ekranda üst çubuk tek satırda kalsın. */}
      <span className="hidden text-sm text-muted-foreground 2xl:inline">{t('topbar.view')}:</span>
      <div className="flex items-center gap-0.5 rounded-md border p-0.5">
        {opt('rahat', t('topbar.viewRahat'))}
        {opt('standart', t('topbar.viewStandart'))}
      </div>
    </div>
  )
}
