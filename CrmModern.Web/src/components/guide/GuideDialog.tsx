import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, BookOpen, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GuideSectionView } from '@/components/guide/GuideSectionView'
import { useAuth } from '@/hooks/useAuth'
import { closeGuide, useGuideState } from '@/lib/guideStore'
import { sectionForPath, visibleGuideSections } from '@/lib/guide'
import { pickLang } from '@/lib/releaseNotes'
import { cn } from '@/lib/utils'

/**
 * Kullanım Kılavuzu paneli — üst çubuk "Kılavuz" butonu / Shift+F1 / komut
 * paleti açar. Açılışta bulunulan ekranın bölümü seçilir (en uzun rota öneki);
 * rolün açamadığı ekranların bölümleri listelenmez. İçerik: data/guide.ts.
 */
export function GuideDialog() {
  const { t, i18n } = useTranslation()
  const { open, section: requested } = useGuideState()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { getUser } = useAuth()
  const user = getUser()
  const sections = useMemo(() => visibleGuideSections(user), [user])
  const [activeId, setActiveId] = useState<string | undefined>()

  // Her açılışta: istenen bölüm, yoksa bulunulan ekranın bölümü.
  useEffect(() => {
    if (!open) return
    const byRequest = requested ? sections.find((s) => s.id === requested) : undefined
    setActiveId((byRequest ?? sectionForPath(pathname, sections))?.id)
  }, [open, requested, pathname, sections])

  const active = sections.find((s) => s.id === activeId) ?? sections[0]
  const lang = i18n.language
  const canGo = active?.navPath && active.navPath !== pathname

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeGuide() }}>
      <DialogContent size="xl" className="max-h-[85vh] overflow-hidden" description={t('guide.hint')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> {t('guide.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Dar ekran: bölüm seçici */}
        <div className="md:hidden">
          <Select value={active?.id} onValueChange={setActiveId}>
            <SelectTrigger aria-label={t('guide.sections')}><SelectValue /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{pickLang(s.title, lang)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid min-h-0 gap-4 md:grid-cols-[13rem_1fr]">
          <nav aria-label={t('guide.sections')} className="hidden max-h-[60vh] overflow-y-auto border-r pr-2 md:block">
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={s.id === active?.id ? 'true' : undefined}
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                      s.id === active?.id && 'bg-accent font-medium',
                    )}
                  >
                    {pickLang(s.title, lang)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="max-h-[60vh] min-w-0 overflow-y-auto pr-1">
            {active && <GuideSectionView key={active.id} section={active} />}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" asChild>
            <Link to="/guide" onClick={() => closeGuide()}><ExternalLink className="h-4 w-4" /> {t('guide.fullPage')}</Link>
          </Button>
          {canGo && (
            <Button size="sm" onClick={() => { closeGuide(); navigate(active.navPath!) }}>
              {t('guide.goToScreen')} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
