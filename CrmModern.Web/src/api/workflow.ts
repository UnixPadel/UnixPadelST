import api from '@/lib/axios'
import type { ApiResponse, OrderWorkflowStatusDto, WaitingOrderDto, WorkflowScreen } from '@/types'

/** İç denetim — ekranın bir önceki adımında bekleyen siparişler. */
export const getWaiting = async (screen: WorkflowScreen): Promise<WaitingOrderDto[]> => {
  const res = await api.get<ApiResponse<WaitingOrderDto[]>>(`/api/workflow/waiting/${screen}`)
  return res.data.data
}

/** Siparişin şu an beklediği adım (stepCode null = Tamamlandı / İptal). */
export const getOrderStep = async (no: string): Promise<OrderWorkflowStatusDto> => {
  const res = await api.get<ApiResponse<OrderWorkflowStatusDto>>(`/api/workflow/order/${encodeURIComponent(no)}`)
  return res.data.data
}
