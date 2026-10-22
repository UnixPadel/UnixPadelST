import { useTranslation } from 'react-i18next'
import { formatDate } from '@/lib/utils'
import { stageLabel, statusTone } from '@/lib/status'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import { SectionTitle } from '@/components/ui/section-title'

interface Props {
  tarih?: string                // sipariş oluşturma tarihi
  sTarih?: string               // son fabrika işlem tarihi (MoveToProduction tarafından
                                // seçilen üretim tarihi, MarkAsReady tarafından "now")
  currentStage: string          // SiparisMiTeklifMi enum değeri
}

/**
 * 2.5 — Aşama Geçmişi.
 *
 * Backend'de aşama-geçiş history tablosu YOK; sadece iki timestamp var
 * (Tarih = oluşturma, STarih = son fabrika işlem zamanı).
 * Bu komponent bu iki noktayla bir mini-timeline kurar:
 *   • "Sipariş oluşturuldu" — Tarih
 *   • Mevcut aşama (Üretim/Hazır/Lojistik/Tamamlandi) — STarih
 *
 * Hazır/Lojistik/Tamamlandi aşamalarına geçildiğinde her birinin ayrı
 * timestamp'i tutulmadığı için yalnız EN SON aşama görünür.
 * QW-12 — mevcut aşama ham enum yerine çevrilmiş etiketle gösterilir.
 */
export function OrderStageTimeline({ tarih, sTarih, currentStage }: Props) {
  const { t } = useTranslation()

  // Son aşama için açıklayıcı satır — sadece factory-side stage'lerde anlamlı
  const stageMessageKey: Record<string, string> = {
    Uretim:     'orderStage.movedToProduction',
    Hazir:      'orderStage.markedReady',
    Lojistik:   'orderStage.movedToLogistics',
    Tamamlandi: 'orderStage.completed',
    Planlama:   'orderStage.planning',
  }
  const lastEventKey = stageMessageKey[currentStage]

  const items: TimelineItem[] = []
  if (tarih) items.push({ key: 'created', label: t('orderStage.created'), tone: 'info', date: formatDate(tarih) })
  if (sTarih && lastEventKey) items.push({ key: 'last', label: t(lastEventKey), tone: 'progress', date: formatDate(sTarih) })
  items.push({
    key: 'current',
    label: t('orderStage.current'),
    tone: statusTone(currentStage, 'stage'),
    meta: <span className="font-medium text-foreground">{stageLabel(t, currentStage)}</span>,
  })

  return (
    <div className="space-y-2">
      <SectionTitle as="h4">{t('orderStage.title')}</SectionTitle>
      <Timeline items={items} />
      {!sTarih && (
        <p className="text-xs text-muted-foreground italic">
          {t('orderStage.noHistoryNote')}
        </p>
      )}
    </div>
  )
}
