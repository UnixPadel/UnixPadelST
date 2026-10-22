import type { WorkflowDepartment, WorkflowScreen, WorkflowStepCode } from '@/types'

/**
 * İç denetim — sipariş akışı adımları backend'deki tek tanımdan
 * (CrmModern.Core/Workflow/OrderWorkflow.cs) gelir; burada yalnız etiketler.
 * Her ekran yalnız bir önceki adımı gösterir (WaitingUpstreamPanel).
 */
export const stepLabelKey = (code: WorkflowStepCode): string => `workflow.steps.${code}`

export const departmentLabelKey = (d: WorkflowDepartment): string => `workflow.departments.${d}`

/** Muhasebe Onay ekranının kuyruk görünümü → önceki aşama ekran anahtarı. */
export const ACCOUNTING_VIEW_SCREEN: Partial<Record<string, WorkflowScreen>> = {
  cariQueue: 'accounting-cari',
  lojistikQueue: 'accounting-lojistik',
  tamamlanmaQueue: 'accounting-tamamlanma',
}

/**
 * Sipariş no filtresi tam numara gibi mi — "bu ekranda değil" ipucu için.
 * Biçim (OrderService): S/T + Ad[0:2] + Soyad[0:2] + ddMMyyyy + sıra, ör. SELRA210920261234.
 */
export const looksLikeOrderNo = (s: string): boolean => /^[ST][^\d\s]{2,4}\d{9,}/i.test(s.trim())
