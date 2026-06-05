import { useTranslation } from 'react-i18next'
import { formatDate } from '@/lib/utils'

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

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{t('orderStage.title')}</h4>
      <ol className="relative border-l ml-2 pl-4 space-y-3">
        {tarih && (
          <li className="text-sm">
            <span className="inline-block px-2 py-0.5 text-xs rounded mr-2 bg-blue-100 text-blue-700">
              {t('orderStage.created')}
            </span>
            <span className="text-muted-foreground">{formatDate(tarih)}</span>
          </li>
        )}
        {sTarih && lastEventKey && (
          <li className="text-sm">
            <span className="inline-block px-2 py-0.5 text-xs rounded mr-2 bg-orange-100 text-orange-700">
              {t(lastEventKey)}
            </span>
            <span className="text-muted-foreground">{formatDate(sTarih)}</span>
          </li>
        )}
        <li className="text-sm">
          <span className="inline-block px-2 py-0.5 text-xs rounded mr-2 bg-green-100 text-green-700">
            {t('orderStage.current')}
          </span>
          <span className="font-medium">{currentStage}</span>
        </li>
      </ol>
      {!sTarih && (
        <p className="text-xs text-muted-foreground italic">
          {t('orderStage.noHistoryNote')}
        </p>
      )}
    </div>
  )
}
