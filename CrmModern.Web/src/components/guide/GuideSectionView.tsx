import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import { ShortcutTable } from '@/components/ShortcutHelpDialog'
import { ReleaseNoteBody } from '@/components/ReleaseNoteBody'
import { RELEASE_NOTES } from '@/data/changelog'
import { APP_VERSION, compareVersions, pickLang } from '@/lib/releaseNotes'
import type { GuideSection } from '@/data/guide'

/** Tek kılavuz bölümünün gövdesi (panel ve tam sayfa ortak). */
export function GuideSectionView({ section, headingLevel = 'h2' }: { section: GuideSection; headingLevel?: 'h2' | 'h3' }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const H = headingLevel
  // Güncel sürümün notu; yoksa yayınlanmış en yeni not.
  const note = section.special === 'whatsNew'
    ? RELEASE_NOTES.find((n) => compareVersions(n.versiyon, APP_VERSION) <= 0)
    : undefined

  return (
    <article className="space-y-3">
      <H className="text-base font-semibold">{pickLang(section.title, lang)}</H>
      <p className="text-sm text-muted-foreground">{pickLang(section.intro, lang)}</p>
      {section.steps && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('guide.steps')}</h4>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {section.steps.map((s, i) => <li key={i}>{pickLang(s, lang)}</li>)}
          </ol>
        </div>
      )}
      {section.tips && (
        <div className="space-y-1.5 rounded-md border border-info/30 bg-info-soft p-3 text-info-soft-foreground">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <Lightbulb className="h-3.5 w-3.5" /> {t('guide.tips')}
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {section.tips.map((s, i) => <li key={i}>{pickLang(s, lang)}</li>)}
          </ul>
        </div>
      )}
      {section.special === 'shortcuts' && <ShortcutTable />}
      {note && <ReleaseNoteBody note={note} lang={lang} />}
    </article>
  )
}
