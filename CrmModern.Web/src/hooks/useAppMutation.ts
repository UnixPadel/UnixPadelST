import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { invalidateOrderGraph } from '@/lib/queryKeys'

/**
 * SR-7 — sipariş akışı mutasyonları için standart sarmalayıcı:
 *  • başarıda `successTitle` (durum çubuğu; `notify: 'toast'` ile açılır mesaj) + `invalidateOrderGraph`
 *  • hatada `errorTitle` + backend mesajı (describeApiError)
 *  • `isPendingFor(vars)` → satır bazlı bekleme: yalnız tıklanan satırın
 *    butonu spinner gösterir (önceden tek mutasyon tüm satırları kilitliyordu).
 */
export function useAppMutation<TData, TVars>(
  options: Omit<UseMutationOptions<TData, unknown, TVars>, 'onError'> & {
    successTitle?: string | ((data: TData, vars: TVars) => string)
    /**
     * K6 — 'inline' (varsayılan): başarı mesajı yalnız durum çubuğuna yazılır.
     * 'toast': sonucu ekrandan çıkan işlemler için açılır mesaj (ör. onaylanan sipariş listeden kaybolur).
     */
    notify?: 'inline' | 'toast'
    successDescription?: (data: TData, vars: TVars) => string | undefined
    errorTitle?: string
    /** false → order graph tazelenmez (yalnız kendi onSuccess'i çalışır). */
    invalidate?: boolean
    onError?: (err: unknown, vars: TVars) => void
  },
) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { successTitle, successDescription, notify = 'inline', errorTitle, invalidate = true, onSuccess, onError, ...rest } = options

  const m = useMutation<TData, unknown, TVars>({
    ...rest,
    onSuccess: async (data, vars, ctx) => {
      if (invalidate) void invalidateOrderGraph(qc)
      if (successTitle) {
        toast({
          title: typeof successTitle === 'function' ? successTitle(data, vars) : successTitle,
          description: successDescription?.(data, vars),
          variant: 'success',
          popup: notify === 'toast',
        })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (onSuccess as any)?.(data, vars, ctx)
    },
    onError: (err, vars) => {
      toastApiError(toast, errorTitle ?? t('common.operationFailed'), err)
      onError?.(err, vars)
    },
  })

  const isPendingFor = (match: (vars: TVars) => boolean): boolean =>
    m.isPending && m.variables !== undefined && match(m.variables as TVars)

  return Object.assign(m, { isPendingFor })
}
