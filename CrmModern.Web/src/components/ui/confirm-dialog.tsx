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
  /**
   * 40+ ergonomi (3.3) — "Ne olacak?" etki önizlemesi: kullanıcı butona basmadan
   * işlemin sonuçlarını madde madde görür (ör. "Sipariş Muhasebe'ye geçer").
   */
  impact?: React.ReactNode[]
  /** Dikkat edilecekler (ör. "peşinat girilmedi"); etki listesinin üstünde sarı kutuda, aynı pencerede. */
  warnings?: React.ReactNode[]
  /** "Sonraki adım: Muhasebe · Cari onayı" — iş akışı zincirinden (OrderWorkflow.cs). */
  nextStep?: React.ReactNode
  /** İkinci onay butonu (ör. "Onayla ve sonrakine geç"); yalnız confirmChoice ile anlamlıdır. */
  altLabel?: string
  /** Enter hangi butonu tetikler; varsayılan 'ok'. */
  primary?: 'ok' | 'alt'
}

export type ConfirmChoice = 'ok' | 'alt' | null

export interface ReasonOptions extends ConfirmOptions {
  label?: string
  placeholder?: string
  /** false → gerekçe isteğe bağlı. Varsayılan: zorunlu. */
  required?: boolean
  defaultValue?: string
}

type CloseResult = 'ok' | 'alt' | 'cancel'
type Pending =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: CloseResult) => void }
  | { kind: 'reason'; opts: ReasonOptions; resolve: (v: string | null) => void }

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  /** İki onay butonlu pencere: 'ok' | 'alt' | null (vazgeçildi). */
  confirmChoice: (opts: ConfirmOptions) => Promise<ConfirmChoice>
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
    new Promise<boolean>((resolve) => setPending({ kind: 'confirm', opts, resolve: (v) => resolve(v !== 'cancel') })), [])
  const confirmChoice = React.useCallback((opts: ConfirmOptions) =>
    new Promise<ConfirmChoice>((resolve) => setPending({ kind: 'confirm', opts, resolve: (v) => resolve(v === 'cancel' ? null : v) })), [])
  const askReason = React.useCallback((opts: ReasonOptions) =>
    new Promise<string | null>((resolve) => {
      setReason(opts.defaultValue ?? '')
      setTouched(false)
      setPending({ kind: 'reason', opts, resolve })
    }), [])

  const close = (result: CloseResult) => {
    if (!pending) return
    if (pending.kind === 'confirm') pending.resolve(result)
    else pending.resolve(result === 'cancel' ? null : reason.trim())
    setPending(null)
  }

  const reasonRequired = pending?.kind === 'reason' && pending.opts.required !== false
  const reasonInvalid = reasonRequired && !reason.trim()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pending?.kind === 'reason' && reasonInvalid) { setTouched(true); return }
    close(pending?.kind === 'confirm' && pending.opts.altLabel && pending.opts.primary === 'alt' ? 'alt' : 'ok')
  }

  const opts = pending?.opts
  return (
    <ConfirmContext.Provider value={{ confirm, confirmChoice, askReason }}>
      {children}
      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) close('cancel') }}>
        <DialogContent size={opts?.impact?.length || opts?.nextStep || opts?.altLabel || opts?.warnings?.length ? 'md' : 'sm'}>
          {opts && (
            <form onSubmit={onSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{opts.title}</DialogTitle>
                {opts.description && <DialogDescription asChild><div className="text-sm text-foreground">{opts.description}</div></DialogDescription>}
              </DialogHeader>
              {!!opts.warnings?.length && (
                <div role="alert" className="space-y-1 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-warning-soft-foreground">
                  {opts.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              )}
              {(!!opts.impact?.length || opts.nextStep) && (
                <div className="rounded-md border bg-muted p-3 text-sm">
                  {!!opts.impact?.length && (
                    <>
                      <p className="font-semibold">{t('confirm.impactTitle')}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {opts.impact.map((line, i) => <li key={i}>{line}</li>)}
                      </ul>
                    </>
                  )}
                  {opts.nextStep && (
                    <p className={opts.impact?.length ? 'mt-2' : undefined}>
                      <span className="font-semibold">{t('confirm.nextStep')}:</span> {opts.nextStep}
                    </p>
                  )}
                </div>
              )}
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
              {/* 2.5 — "Vazgeç" solda, onay sağda: zıt butonlar fiziksel olarak ayrı. */}
              <DialogFooter className="gap-2 sm:justify-between">
                {/* Yıkıcı onaylarda varsayılan odak "Vazgeç"te: Enter yanlışlıkla
                    silme/veri kaybı yaptırmasın. Diğerlerinde Enter onaylar. */}
                <Button type="button" variant="outline" onClick={() => close('cancel')}
                  autoFocus={pending?.kind === 'confirm' && !!opts.destructive}>
                  {opts.cancelLabel ?? t('common.cancel')}
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  {opts.altLabel && (
                    <Button
                      type={opts.primary === 'alt' ? 'submit' : 'button'}
                      variant={opts.primary === 'alt' ? 'default' : 'outline'}
                      onClick={opts.primary === 'alt' ? undefined : () => close('alt')}
                      autoFocus={pending?.kind === 'confirm' && !opts.destructive && opts.primary === 'alt'}
                    >
                      {opts.altLabel}
                    </Button>
                  )}
                  <Button
                    type={opts.altLabel && opts.primary === 'alt' ? 'button' : 'submit'}
                    variant={opts.destructive ? 'destructive' : opts.altLabel && opts.primary === 'alt' ? 'outline' : 'default'}
                    onClick={opts.altLabel && opts.primary === 'alt' ? () => close('ok') : undefined}
                    autoFocus={pending?.kind === 'confirm' && !opts.destructive && !(opts.altLabel && opts.primary === 'alt')}
                  >
                    {opts.confirmLabel ?? t('common.yes')}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
