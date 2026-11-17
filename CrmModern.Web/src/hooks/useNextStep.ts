import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getOrderStep } from '@/api/workflow'
import { stepLabelKey } from '@/lib/workflow'

/**
 * 40+ ergonomi (3.3) — onay penceresi açılmadan hemen önce siparişin "sonraki
 * adımını" iş akışının tek tanımından (OrderWorkflow.cs → /api/workflow/order)
 * okur: "Sonraki adım: Muhasebenin cari onayı bekleniyor (1. peşinat)".
 * Sonraki adım yoksa "Sipariş tamamlanır" döner; istek başarısızsa undefined
 * (pencere yine açılır, yalnız bu satır görünmez).
 */
export function useNextStepLabel() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  return useCallback(async (no: string): Promise<string | undefined> => {
    try {
      const st = await qc.fetchQuery({ queryKey: ['workflow-step', no], queryFn: () => getOrderStep(no), staleTime: 0 })
      if (!st.stepCode) return undefined
      return st.nextStepCode ? t(stepLabelKey(st.nextStepCode)) : t('confirm.nextDone')
    } catch {
      return undefined
    }
  }, [qc, t])
}
