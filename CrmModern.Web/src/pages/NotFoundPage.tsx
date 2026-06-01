import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-md space-y-3">
        <div className="flex justify-center text-muted-foreground">
          <Compass className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-muted-foreground">{t('notFound.description')}</p>
        <Link
          to="/dashboard"
          className="inline-block mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
        >
          {t('notFound.goHome')}
        </Link>
      </div>
    </div>
  )
}
