import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getOrderStep } from '@/api/workflow'
import { looksLikeOrderNo, stepLabelKey } from '@/lib/workflow'
import { statusLabel } from '@/lib/status'

/**
 * İç denetim — sipariş no ile arandı ama liste boş: "bu ekranda değil:
 * Muhasebe lojistik onayı bekleniyor (2. peşinat)". Açık bir sorgu olduğu için
 * siparişin güncel adımı gösterilir (birkaç adım geride olsa da).
 * DataTable `emptyMessage` olarak kullanılır; ipucu yoksa undefined.
 */
export function useNotHereHint(orderNo: string, listEmpty: boolean): string | undefined {
  const { t } = useTranslation()
  const no = orderNo.trim()
  const enabled = listEmpty && looksLikeOrderNo(no)
  const q = useQuery({
    queryKey: ['workflow-step', no],
    queryFn: () => getOrderStep(no),
    enabled,
    retry: false,
    staleTime: 30_000,
  })
  if (!enabled) return undefined
  if (q.isError) return t('workflow.notFound', { no })
  if (!q.data) return undefined
  if (!q.data.stepCode) return t('workflow.notHereDone', { no: q.data.siparisNo, stage: statusLabel(t, q.data.asama) })
  return t('workflow.notHere', { no: q.data.siparisNo, reason: t(stepLabelKey(q.data.stepCode)) })
}
