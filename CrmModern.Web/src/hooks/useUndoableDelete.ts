import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'

/**
 * 40+ ergonomi (K5) — silmeden sonra 10 sn görünen "Geri al" butonlu mesaj.
 * Kayıt ekrandan çıktığı için açılır mesaj kullanılır (K6). Silmeler backend'de
 * yumuşaktır; "Geri al" restore ucunu çağırır, ardından listeyi tazeler.
 *
 *   const undoable = useUndoableDelete()
 *   undoable({ name: no, restore: () => restoreOrder(no), onRestored: refetch })
 */
export function useUndoableDelete() {
  const { t } = useTranslation()
  const { toast } = useToast()
  return useCallback((opts: {
    /** Silinen kaydın görünen adı (mesaj açıklaması). */
    name: string
    /** Mesaj başlığı; varsayılan "Silindi." */
    title?: string
    restore: () => Promise<unknown>
    onRestored?: () => void | Promise<unknown>
  }) => {
    toast({
      title: opts.title ?? t('undo.deleted'),
      description: opts.name,
      variant: 'success',
      action: {
        label: t('undo.action'),
        onClick: () => {
          void (async () => {
            try {
              await opts.restore()
              await opts.onRestored?.()
              toast({ title: t('undo.restored'), description: opts.name, variant: 'success' })
            } catch (e) {
              toastApiError(toast, t('undo.failed'), e)
            }
          })()
        },
      },
    })
  }, [t, toast])
}
