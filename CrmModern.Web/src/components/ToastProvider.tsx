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
}

interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  persistent?: boolean
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
// QW-5 — hatalar daha uzun görünür (okunmadan kaybolmasın); üzerine gelince durur.
const TTL: Record<ToastVariant, number> = { default: 4500, success: 4500, warning: 7000, destructive: 8000 }
const LOG_MAX = 100

const ICON: Record<ToastVariant, React.ReactNode> = {
  default:     <Info className="h-4 w-4 text-info" />,
  success:     <CheckCircle2 className="h-4 w-4 text-success" />,
  warning:     <AlertTriangle className="h-4 w-4 text-warning" />,
  destructive: <XCircle className="h-4 w-4 text-destructive" />,
}

/** Tek toast: kendi zamanlayıcısını tutar, üzerine gelinince kalan süreyi dondurur. */
function ToastItem({ t, onDismiss, closeLabel }: { t: Toast; onDismiss: (id: string) => void; closeLabel: string }) {
  const variant = t.variant ?? 'default'
  const [paused, setPaused] = useState(false)
  const remaining = useRef(TTL[variant])
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (t.persistent || paused) return
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
        'pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg bg-background animate-in fade-in-0 slide-in-from-top-2',
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
          <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="text-muted-foreground hover:text-foreground"
        aria-label={closeLabel}
      >
        <X className="h-4 w-4" />
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
    setToasts((prev) => [...prev, { ...input, id }])
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
        className="pointer-events-none fixed right-4 top-16 z-[60] flex w-80 flex-col gap-2"
      >
        {toasts.map((x) => (
          <ToastItem key={x.id} t={x} onDismiss={dismiss} closeLabel={t('common.close')} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
