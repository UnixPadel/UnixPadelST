import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getApprovals } from '@/api/orders'
import { formatDate } from '@/lib/utils'
import { Timeline } from '@/components/ui/timeline'
import { SectionTitle } from '@/components/ui/section-title'
import { approvalLabel, approvalTone } from '@/components/order/DocumentFlow'

interface Props { siparisNo: string | null }

// QW-12 — başlık/yükleniyor/boş metinleri i18n; durum ham değer yerine etiket + ton.
export function OrderApprovalTimeline({ siparisNo }: Props) {
  const { t } = useTranslation()
  const { data = [], isLoading } = useQuery({
    queryKey: ['approvals', siparisNo],
    queryFn: () => getApprovals(siparisNo!),
    enabled: !!siparisNo,
  })

  if (!siparisNo) return null
  if (isLoading) return <div className="text-sm text-muted-foreground">{t('approvalTimeline.loading')}</div>
  if (data.length === 0) return <div className="text-sm text-muted-foreground">{t('approvalTimeline.empty')}</div>

  return (
    <div className="space-y-2">
      <SectionTitle as="h4">{t('approvalTimeline.title')}</SectionTitle>
      <Timeline
        items={data.map((a) => ({
          key: a.onayID,
          label: approvalLabel(t, a.onayDurumu),
          tone: approvalTone(a.onayDurumu),
          meta: a.kullaniciAdi ?? `#${a.kullaniciID}`,
          date: a.onayTarih ? formatDate(a.onayTarih) : undefined,
          body: a.aciklama,
        }))}
      />
    </div>
  )
}
