import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, AlertTriangle, XCircle, Info, MessageSquare, Keyboard } from 'lucide-react'
import { useToast, type LoggedMessage, type ToastVariant } from '@/components/ToastProvider'
import { Popover } from '@/components/ui/popover'
import { usePreferences, setPreferences } from '@/lib/preferences'
import { cn } from '@/lib/utils'

/**
 * E-5 — SAP GUI durum çubuğu: ekranın altında son mesaj + oturum mesaj günlüğü
 * (toast kaybolsa da hata okunabilir) ve sağda bağlama göre kısayol ipuçları
 * (E-2, ETA/LOGO tuş şeridi). Sayfalar ipuçlarını `useShortcutHints` ile verir.
 */
const ICON: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-3.5 w-3.5 text-info" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  destructive: <XCircle className="h-3.5 w-3.5 text-danger" />,
}

export interface ShortcutHint { keys: string; label: string }

type HintListener = (hints: ShortcutHint[]) => void
const hintListeners = new Set<HintListener>()
let currentHints: ShortcutHint[] = []

function publishShortcutHints(hints: ShortcutHint[]) {
  currentHints = hints
  hintListeners.forEach((l) => l(hints))
}

/** Sayfa bileşeni kendi kısayollarını durum çubuğuna yazar (unmount'ta temizlenir). */
export function useShortcutHints(hints: ShortcutHint[]) {
  const key = hints.map((h) => `${h.keys}:${h.label}`).join('|')
  useEffect(() => {
    publishShortcutHints(hints)
    return () => publishShortcutHints([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

export function StatusBar({ onShowHelp }: { onShowHelp: () => void }) {
  const { t } = useTranslation()
  const { messages, clearMessages } = useToast()
  const prefs = usePreferences()
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const [hints, setHints] = useState<ShortcutHint[]>(currentHints)
  useEffect(() => {
    hintListeners.add(setHints)
    return () => { hintListeners.delete(setHints) }
  }, [])

  const last: LoggedMessage | undefined = messages[0]
  const errors = messages.filter((m) => m.variant === 'destructive').length
  // K6 — başarı mesajları artık açılır pencere değil; yeni mesaj 6 sn vurgulanır ki fark edilsin.
  const [fresh, setFresh] = useState(false)
  useEffect(() => {
    if (!last) return
    setFresh(true)
    const h = setTimeout(() => setFresh(false), 6000)
    return () => clearTimeout(h)
  }, [last?.id])

  return (
    <footer className="flex min-h-ctl-xs shrink-0 items-center gap-3 border-t bg-muted px-3 text-xs text-foreground">
      {/* K6 — durum çubuğu mesajları ekran okuyucuya da duyurulur. */}
      <span className="sr-only" aria-live="polite">{last && last.variant !== 'destructive' ? last.title : ''}</span>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn('flex min-h-ctl-xs min-w-0 items-center gap-1.5 rounded px-1.5 transition-colors hover:bg-accent',
          fresh && last?.variant === 'success' && 'bg-success-soft font-semibold text-success-soft-foreground',
          fresh && last?.variant === 'destructive' && 'bg-danger-soft font-semibold text-danger-soft-foreground')}
        aria-label={t('statusBar.messages')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {last ? ICON[last.variant] : <MessageSquare className="h-3.5 w-3.5" />}
        <span className={cn('truncate', last?.variant === 'destructive' && 'text-danger')}>
          {last ? `${last.at.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · ${last.title}${last.description ? ` — ${last.description}` : ''}` : t('statusBar.ready')}
        </span>
        {messages.length > 0 && (
          <span className={cn('rounded-full px-1.5 tabular-nums', errors ? 'bg-danger-soft text-danger-soft-foreground' : 'bg-muted')}>
            {messages.length}
          </span>
        )}
      </button>
      <Popover open={open} onOpenChange={setOpen} anchorRef={btn} className="w-[28rem] max-w-[90vw]">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold">{t('statusBar.log')}</span>
          {messages.length > 0 && (
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={clearMessages}>{t('common.clear')}</button>
          )}
        </div>
        {messages.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">{t('statusBar.empty')}</p>}
        <ul className="space-y-0.5">
          {messages.map((m) => (
            <li key={m.id} className="flex items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent">
              <span className="mt-0.5">{ICON[m.variant]}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{m.title}</span>
                {m.description && <span className="block break-words text-muted-foreground">{m.description}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{m.at.toLocaleTimeString('tr-TR')}</span>
            </li>
          ))}
        </ul>
      </Popover>

      {prefs.showShortcutHints && (
        <div className="ml-auto hidden min-w-0 items-center gap-3 overflow-hidden md:flex">
          {[...hints, { keys: 'Ctrl+K', label: t('shortcuts.palette') }, { keys: 'F1', label: t('shortcuts.help') }].map((h) => (
            <span key={h.keys + h.label} className="flex shrink-0 items-center gap-1">
              <kbd className="rounded border bg-background px-1 font-mono text-2xs">{h.keys}</kbd>
              {h.label}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => (prefs.showShortcutHints ? onShowHelp() : setPreferences({ showShortcutHints: true }))}
        className={cn('flex min-h-ctl-xs items-center gap-1.5 rounded px-1.5 hover:bg-accent', !prefs.showShortcutHints && 'ml-auto')}
        title="F1"
      >
        <Keyboard className="h-4 w-4" aria-hidden /> {t('shortcuts.help')}
      </button>
    </footer>
  )
}
