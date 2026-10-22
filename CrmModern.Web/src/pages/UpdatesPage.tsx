import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { CollapsibleSection } from '@/components/ui/accordion'
import { ReleaseNoteBody } from '@/components/ReleaseNoteBody'
import { LEGACY_CHANGELOG, RELEASE_NOTES } from '@/data/changelog'
import { APP_VERSION, compareVersions } from '@/lib/releaseNotes'
import { cn } from '@/lib/utils'

/**
 * "Neler Yeni" geçmişi — tüm sürüm notları (yeniden eskiye), güncel sürüm
 * vurgulu; eski "Faz" kayıtları ayrı, kapalı bölümde. Veri: data/changelog.ts.
 */
export function UpdatesPage() {
  const { t, i18n } = useTranslation()
  // Henüz yayınlanmamış (uygulama sürümünden yeni) notlar geçmişte gösterilmez.
  const notes = RELEASE_NOTES.filter((n) => compareVersions(n.versiyon, APP_VERSION) <= 0)
  return (
    <div>
      <PageHeader title={t('updates.title')} description={t('whatsNew.currentVersion', { version: APP_VERSION })} />
      <div className="max-w-3xl space-y-3 p-4 lg:p-6">
        {notes.map((n) => (
          <Card key={n.versiyon} className={cn(n.versiyon === APP_VERSION && 'border-warning/60')}>
            <CardContent className="pt-4">
              <ReleaseNoteBody note={n} lang={i18n.language} />
            </CardContent>
          </Card>
        ))}
        <CollapsibleSection title={t('whatsNew.legacyTitle')} summary={t('whatsNew.legacyHint')}>
          <div className="space-y-4 px-3 pb-3">
            {LEGACY_CHANGELOG.map((e) => (
              <section key={e.versiyon} className="space-y-1">
                <h3 className="text-sm font-semibold">{e.baslik} <span className="text-xs font-normal text-muted-foreground">· {e.tarih}</span></h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                  {e.maddeler.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </section>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
