import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/FieldError'

/**
 * QW-6 — window.confirm / window.prompt yerine uygulama içi, i18n'li,
 * klavye dostu onay ve gerekçe pencereleri (Promise tabanlı).
 *
 *   const { confirm, askReason } = useConfirm()
 *   if (!(await confirm({ title, description, destructive: true }))) return
 *   const sebep = await askReason({ title, label })   // null → vazgeçildi
 *
 * Enter onaylar (form submit), Esc vazgeçer. Gerekçe boşken gönderilirse
 * satır içi hata gösterilir (sessizce kapanmaz).
 */
export interface ConfirmOptions {
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export interface ReasonOptions extends ConfirmOptions {
  label?: string
  placeholder?: string
  /** false → gerekçe isteğe bağlı. Varsayılan: zorunlu. */
  required?: boolean
  defaultValue?: string
}

type Pending =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'reason'; opts: ReasonOptions; resolve: (v: string | null) => void }

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  askReason: (opts: ReasonOptions) => Promise<string | null>
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null)

export function useConfirm(): ConfirmContextValue {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [pending, setPending] = React.useState<Pending | null>(null)
  const [reason, setReason] = React.useState('')
  const [touched, setTouched] = React.useState(false)

  const confirm = React.useCallback((opts: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setPending({ kind: 'confirm', opts, resolve })), [])
  const askReason = React.useCallback((opts: ReasonOptions) =>
    new Promise<string | null>((resolve) => {
      setReason(opts.defaultValue ?? '')
      setTouched(false)
      setPending({ kind: 'reason', opts, resolve })
    }), [])

  const close = (result: 'ok' | 'cancel') => {
    if (!pending) return
    if (pending.kind === 'confirm') pending.resolve(result === 'ok')
    else pending.resolve(result === 'ok' ? reason.trim() : null)
    setPending(null)
  }

  const reasonRequired = pending?.kind === 'reason' && pending.opts.required !== false
  const reasonInvalid = reasonRequired && !reason.trim()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pending?.kind === 'reason' && reasonInvalid) { setTouched(true); return }
    close('ok')
  }

  const opts = pending?.opts
  return (
    <ConfirmContext.Provider value={{ confirm, askReason }}>
      {children}
      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) close('cancel') }}>
        <DialogContent size="sm">
          {opts && (
            <form onSubmit={onSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{opts.title}</DialogTitle>
                {opts.description && <DialogDescription asChild><div>{opts.description}</div></DialogDescription>}
              </DialogHeader>
              {pending?.kind === 'reason' && (
                <div className="space-y-1">
                  {pending.opts.label && <Label htmlFor="confirm-reason">{pending.opts.label}{reasonRequired && ' *'}</Label>}
                  <Textarea
                    id="confirm-reason"
                    autoFocus
                    rows={3}
                    value={reason}
                    placeholder={pending.opts.placeholder}
                    aria-invalid={touched && reasonInvalid}
                    onChange={(e) => setReason(e.target.value)}
                    onKeyDown={(e) => {
                      // Ctrl+Enter gönderir (Enter tek başına yeni satır).
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit(e as unknown as React.FormEvent)
                    }}
                  />
                  {touched && reasonInvalid && <FieldError message={t('validation.required')} />}
                </div>
              )}
              <DialogFooter className="gap-2">
                {/* Yıkıcı onaylarda varsayılan odak "Vazgeç"te: Enter yanlışlıkla
                    silme/veri kaybı yaptırmasın. Diğerlerinde Enter onaylar. */}
                <Button type="button" variant="outline" onClick={() => close('cancel')}
                  autoFocus={pending?.kind === 'confirm' && !!opts.destructive}>
                  {opts.cancelLabel ?? t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant={opts.destructive ? 'destructive' : 'default'}
                  autoFocus={pending?.kind === 'confirm' && !opts.destructive}
                >
                  {opts.confirmLabel ?? t('common.yes')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
