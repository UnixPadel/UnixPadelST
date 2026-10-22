import { Badge } from '@/components/ui/badge'
import { pickLang } from '@/lib/releaseNotes'
import { formatDateShort } from '@/lib/utils'
import type { ReleaseNote } from '@/types'

/** Tek sürüm notunun gövdesi — "Neler Yeni" penceresi, geçmiş sayfası ve kılavuz ortak kullanır. */
export function ReleaseNoteBody({ note, lang, showVersion = true }: { note: ReleaseNote; lang: string; showVersion?: boolean }) {
  return (
    <section className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {showVersion && <Badge variant="info">v{note.versiyon}</Badge>}
        <h3 className="text-sm font-semibold">{pickLang(note.baslik, lang)}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{formatDateShort(note.tarih)}</span>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {pickLang(note.maddeler, lang).map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </section>
  )
}
