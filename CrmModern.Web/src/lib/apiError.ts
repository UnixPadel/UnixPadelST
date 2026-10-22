import { describeApiError } from '@/lib/axios'

type ToastFn = (t: { title: string; description?: string; variant?: 'default' | 'success' | 'warning' | 'destructive' }) => string

/**
 * QW-5 — sayfalarda ~12 kopya olan "hata toast'u" kalıbının tek hali.
 * Başlık çağıranın i18n metnidir; açıklama her zaman backend'in döndürdüğü
 * okunur mesajdır (eskiden bazı yerlerde hiç açıklama yoktu).
 */
export function toastApiError(toast: ToastFn, title: string, err: unknown): void {
  toast({ title, description: describeApiError(err), variant: 'destructive' })
}
