import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  /**
   * Faz-fix 2.6 — true ise toast otomatik kapanmaz; manuel `dismiss(id)`
   * çağrılana kadar görünür kalır. Excel "İndiriliyor..." gibi async
   * işlemlerin progress göstergesi için kullanılır.
   */
  persistent?: boolean
  action?: ToastAction
}

interface ToastAction { label: string; onClick: () => void }

interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  persistent?: boolean
  /**
   * 40+ ergonomi (K6) — başarı mesajları varsayılan olarak açılır pencere DEĞİL,
   * yalnız alt durum çubuğuna yazılır (kullanıcının odağı bölünmez). Sonucu
   * ekrandan çıkan işlemler (onaylanan sipariş listeden kaybolur, silme) `popup: true` verir.
   */
  popup?: boolean
  /** Toast içinde buton (ör. "Geri al"); verilince toast 10 sn görünür. */
  action?: ToastAction
}

/** E-5 — SAP durum çubuğu: oturumdaki tüm mesajlar (toast kaybolsa da okunabilir). */
export interface LoggedMessage {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  at: Date
}

interface ToastContextValue {
  /** Toast oluşturur; oluşturulan toast'un id'sini döner (dismiss/update için). */
  toast: (t: ToastInput) => string
  /** Verilen id'li toast'u hemen kapatır. */
  dismiss: (id: string) => void
  /** Oturum mesaj günlüğü (en yeni başta, en fazla 100). */
  messages: LoggedMessage[]
  clearMessages: () => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => '',
  dismiss: () => {},
  messages: [],
  clearMessages: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

let _id = 0
// QW-5 — üzerine gelince durur. 40+ ergonomi: hata toast'u kendiliğinden kapanmaz
// (okunmadan kaybolmasın); aynı anda en fazla 3 toast görünür.
const TTL: Record<ToastVariant, number> = { default: 6000, success: 6000, warning: 9000, destructive: Infinity }
const ACTION_TTL = 10_000
const MAX_VISIBLE = 3
const LOG_MAX = 100

const ICON: Record<ToastVariant, React.ReactNode> = {
  default:     <Info className="h-4 w-4 text-info" />,
  success:     <CheckCircle2 className="h-4 w-4 text-success" />,
  warning:     <AlertTriangle className="h-4 w-4 text-warning" />,
  destructive: <XCircle className="h-4 w-4 text-danger" />,
}

/** Tek toast: kendi zamanlayıcısını tutar, üzerine gelinince kalan süreyi dondurur. */
function ToastItem({ t, onDismiss, closeLabel }: { t: Toast; onDismiss: (id: string) => void; closeLabel: string }) {
  const variant = t.variant ?? 'default'
  const [paused, setPaused] = useState(false)
  const remaining = useRef(t.action ? ACTION_TTL : TTL[variant])
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (t.persistent || paused || !Number.isFinite(remaining.current)) return
    startedAt.current = Date.now()
    const h = setTimeout(() => onDismiss(t.id), remaining.current)
    return () => {
      clearTimeout(h)
      remaining.current -= Date.now() - startedAt.current
    }
  }, [paused, t.id, t.persistent, onDismiss])

  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg bg-background animate-in fade-in-0 duration-150',
        variant === 'destructive' && 'border-destructive/50 bg-danger-soft',
        variant === 'success' && 'border-success/40',
        variant === 'warning' && 'border-warning/50 bg-warning-soft',
      )}
    >
      <span className="mt-0.5 shrink-0">{ICON[variant]}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold break-words', variant === 'destructive' && 'text-danger-soft-foreground')}>
          {t.title}
        </p>
        {t.description && (
          <p className="mt-0.5 break-words text-sm text-foreground">{t.description}</p>
        )}
        {t.action && (
          <button type="button" onClick={() => { t.action!.onClick(); onDismiss(t.id) }}
            className="mt-2 inline-flex min-h-ctl-xs items-center rounded-md border border-border-strong bg-card px-3 text-sm font-semibold hover:bg-accent">
            {t.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="-m-1 flex h-ctl-xs w-ctl-xs shrink-0 items-center justify-center rounded text-foreground hover:bg-accent"
        aria-label={closeLabel}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [messages, setMessages] = useState<LoggedMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput): string => {
    const id = String(++_id)
    // K6 — başarı (ve bilgi) mesajı yalnız durum çubuğuna; popup/action isteyenler açılır.
    const silent = !input.persistent && !input.popup && !input.action && (input.variant === 'success' || input.variant === 'default' || !input.variant)
    if (!silent) setToasts((prev) => [...prev, { ...input, id }].slice(-MAX_VISIBLE))
    // persistent (ilerleme) toast'ları günlüğe yazılmaz — sonuç mesajı yazılır.
    if (!input.persistent) {
      setMessages((prev) => [
        { id, title: input.title, description: input.description, variant: input.variant ?? 'default', at: new Date() },
        ...prev,
      ].slice(0, LOG_MAX))
    }
    return id
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return (
    <ToastContext.Provider value={{ toast, dismiss, messages, clearMessages }}>
      {children}
      <div
        aria-live="polite"
        // Üst sağ: formların yapışkan alt aksiyon çubuğunu kapatmasın.
        className="pointer-events-none fixed right-4 top-16 z-[60] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((x) => (
          <ToastItem key={x.id} t={x} onDismiss={dismiss} closeLabel={t('common.close')} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
