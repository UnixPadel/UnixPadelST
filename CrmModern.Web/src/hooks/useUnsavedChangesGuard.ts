import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useConfirm } from '@/components/ui/confirm-dialog'

/**
 * SR-9 — kaydedilmemiş değişiklik koruması. `dirty` true iken:
 *  • uygulama içi navigasyon (sidebar, geri tuşu, palet) onay ister,
 *  • pencere kapatma/yenileme `beforeunload` ile uyarır.
 * useBlocker yalnız data router altında çalışır (App.tsx createHashRouter).
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const { t } = useTranslation()
  const { confirm } = useConfirm()
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    let active = true
    confirm({
      title: t('unsaved.title'),
      description: t('unsaved.description'),
      confirmLabel: t('unsaved.leave'),
      cancelLabel: t('unsaved.stay'),
      destructive: true,
    }).then((ok) => {
      if (!active) return
      if (ok) blocker.proceed()
      else blocker.reset()
    })
    return () => { active = false }
  }, [blocker, confirm, t])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
