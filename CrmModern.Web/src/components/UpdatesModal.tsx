import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RELEASE_NOTES } from '@/data/changelog'
import { APP_VERSION, getLastSeenVersion, markReleaseNotesSeen, pendingNotes } from '@/lib/releaseNotes'
import { openGuide } from '@/lib/guideStore'
import { ReleaseNoteBody } from '@/components/ReleaseNoteBody'

/**
 * "Neler Yeni" — güncellemeden sonraki ilk girişte bir kez açılır.
 * Kullanıcı başına son görülen sürümden (lib/releaseNotes) bu yana yayınlanan
 * notları gösterir (atlanan sürümler dahil). Hangi düğmeyle kapanırsa kapansın
 * güncel sürüm "görüldü" sayılır; o sürüm için bir daha açılmaz.
 * Güncel sürümün notu yoksa açılmaz ve "görüldü" yazılmaz — sonraki notlu
 * sürümde kaçırılanlar da gösterilir.
 */
export function UpdatesModal() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [notes] = useState(() => pendingNotes(APP_VERSION, getLastSeenVersion(), RELEASE_NOTES))
  const [open, setOpen] = useState(notes.length > 0)

  const close = () => { markReleaseNotesSeen(); setOpen(false) }

  if (!notes.length) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close() }}>
      <DialogContent size="md" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            {t('whatsNew.title')}
            <Badge variant="neutral">v{APP_VERSION}</Badge>
          </DialogTitle>
          {notes.length > 1 && <p className="text-xs text-muted-foreground">{t('whatsNew.missed', { count: notes.length })}</p>}
        </DialogHeader>
        <div className="space-y-4">
          {notes.map((n) => <ReleaseNoteBody key={n.versiyon} note={n} lang={i18n.language} showVersion={notes.length > 1} />)}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { close(); navigate('/updates') }}>{t('whatsNew.allVersions')}</Button>
            <Button size="sm" variant="outline" onClick={() => { close(); openGuide() }}>
              <BookOpen className="h-4 w-4" /> {t('whatsNew.openGuide')}
            </Button>
          </div>
          <Button size="sm" autoFocus onClick={close}>{t('whatsNew.gotIt')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
