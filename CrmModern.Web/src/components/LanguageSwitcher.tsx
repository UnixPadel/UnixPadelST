import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const LANGS = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.language?.startsWith('en') ? 'en' : 'tr'

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border p-0.5"
      role="group"
      aria-label={t('topbar.language')}
    >
      <Globe className="ml-1 h-4 w-4 text-muted-foreground" aria-hidden />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          aria-pressed={current === l.code}
          // 40+ ergonomi — 20px'lik düğmeler ölçek tokenına (32/36px) büyütüldü.
          className={cn(
            'h-ctl-xs min-w-[2.75rem] rounded px-2 text-sm font-medium transition-colors',
            current === l.code
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-accent',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
