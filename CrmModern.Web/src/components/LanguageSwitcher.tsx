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
      className="flex items-center gap-1 rounded-md border px-1 py-0.5"
      role="group"
      aria-label={t('topbar.language')}
    >
      <Globe className="h-3.5 w-3.5 text-muted-foreground ml-1" />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium transition-colors',
            current === l.code
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
