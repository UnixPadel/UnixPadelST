import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Tek tutarlı loader — beyaz ekran yerine spinner + metin.
// Layout bootstrap, route Suspense fallback ve uzun-süreli sayfa fetch'leri için.
export function PageLoader() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full w-full min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t('common.loading')}</span>
      </div>
    </div>
  )
}
