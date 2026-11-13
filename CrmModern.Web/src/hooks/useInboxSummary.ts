import { useQuery } from '@tanstack/react-query'
import { getInboxSummary } from '@/api/inbox'

/**
 * Bekleyen İşler özeti (Ana Sayfa paneli + menü rozeti) — tek istek, aynı
 * önbellek anahtarı: panel ve rozet aynı yanıtı paylaşır. Dakikada bir ve odak
 * dönüşünde tazelenir; hata sessizdir (rozet görünmez, panel hata satırı çizer).
 */
export function useInboxSummary(enabled = true) {
  return useQuery({
    queryKey: ['inbox-summary'],
    queryFn: getInboxSummary,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
