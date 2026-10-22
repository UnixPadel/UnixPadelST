import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { GuideSectionView } from '@/components/guide/GuideSectionView'
import { useAuth } from '@/hooks/useAuth'
import { visibleGuideSections } from '@/lib/guide'
import { pickLang } from '@/lib/releaseNotes'

/** Kullanım Kılavuzu — tüm bölümler tek sayfada (içindekiler + yazdırma). Panelle aynı içerik. */
export function GuidePage() {
  const { t, i18n } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const sections = useMemo(() => visibleGuideSections(user), [user])
  const lang = i18n.language

  return (
    <div>
      <PageHeader
        title={t('guide.title')}
        description={t('guide.pageDescription')}
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> {t('guide.print')}</Button>}
      />
      <div className="max-w-3xl space-y-6 p-4 lg:p-6">
        <nav aria-label={t('guide.sections')} className="rounded-md border bg-muted/30 p-3">
          <ol className="grid list-decimal gap-1 pl-5 text-sm sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}><a href={`#guide-${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`guide-${s.id}`)?.scrollIntoView({ behavior: 'smooth' }) }} className="text-primary hover:underline">{pickLang(s.title, lang)}</a></li>
            ))}
          </ol>
        </nav>
        {sections.map((s) => (
          <section key={s.id} id={`guide-${s.id}`} className="scroll-mt-4 border-t pt-4">
            <GuideSectionView section={s} />
          </section>
        ))}
      </div>
    </div>
  )
}
