import api from '@/lib/axios'
import type { ApiResponse } from '@/types'
import type { QueueId } from '@/hooks/useWorkQueues'

/** GET /api/inbox/summary — kullanıcıya düşen kuyruklar (sabit iş akışı sırası). */
export interface InboxQueueSummary {
  queueId: QueueId
  count: number
  oldestSince: string | null
  /** Kaynak liste yüklenemedi — "iş yok" ile karıştırılmasın. */
  error: boolean
}

export interface InboxSummary {
  queues: InboxQueueSummary[]
  total: number
}

export const getInboxSummary = async (): Promise<InboxSummary> => {
  const res = await api.get<ApiResponse<InboxSummary>>('/api/inbox/summary')
  return res.data.data
}
