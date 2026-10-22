import { useQuery } from '@tanstack/react-query'
import { getDashboardKpis } from '@/api/reporting'
import type { DashboardKpi } from '@/types'

/**
 * SR-10 / E-10 — kuyruk sayaçları (sidebar rozetleri, Bekleyen İşler). Dashboard KPI
 * uç noktası yeniden kullanılır; dakikada bir ve odak dönüşünde tazelenir.
 * Hata sessizdir (rozet görünmez) — menü asla bu sorguya bağımlı değildir.
 */
export function useNavCounts(): DashboardKpi | undefined {
  const { data } = useQuery({
    queryKey: ['nav-counts'],
    queryFn: getDashboardKpis,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
  return data
}
