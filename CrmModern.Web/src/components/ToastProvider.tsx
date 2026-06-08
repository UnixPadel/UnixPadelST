import { createContext, useContext, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
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
  variant?: 'default' | 'destructive'
  persistent?: boolean
}

interface ToastContextValue {
  /** Toast oluşturur; oluşturulan toast'un id'sini döner (dismiss/update için). */
  toast: (t: ToastInput) => string
  /** Verilen id'li toast'u hemen kapatır. */
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => '',
  dismiss: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

let _id = 0
const DEFAULT_TTL = 4500

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput): string => {
    const id = String(++_id)
    setToasts((prev) => [...prev, { ...input, id }])
    // persistent: otomatik kapanmaz — caller dismiss(id) çağırmalı.
    if (!input.persistent) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id))
      }, DEFAULT_TTL)
    }
    return id
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-background',
              t.variant === 'destructive' && 'border-destructive bg-destructive/10'
            )}
          >
            <div className="flex-1">
              <p className={cn('text-sm font-semibold', t.variant === 'destructive' && 'text-destructive')}>
                {t.title}
              </p>
              {t.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
