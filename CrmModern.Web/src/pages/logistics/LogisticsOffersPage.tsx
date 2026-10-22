import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Eye } from 'lucide-react'
import { getOfferQueue } from '@/api/logisticsOffers'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilterBar, FilterField, useFilterState } from '@/components/FilterBar'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { trLower } from '@/components/ui/combobox'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { LogisticsOfferForm } from '@/components/LogisticsOfferForm'
import { LogisticsOffersList } from '@/components/LogisticsOffersList'

const FILTER_DEFAULTS = { siparisNo: '', musteri: '' }

/**
 * "Lojistik Teklif" ekranı — yalnız Lojistik + Yönetici. Sipariş üretime alınınca
 * kuyruğa düşer, tamamlanana kadar kalır. Satır açılınca teklifler + (Yönetici)
 * onay/red + yeni teklif formu görünür. Akordeon başlıkları klavye/ekran okuyucu
 * uyumlu (aria-expanded); detay her yerde açılan sipariş panelinde (?order=).
 */
export function LogisticsOffersPage() {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const [, setParams] = useSearchParams()
  // Onay/red yalnız Yönetici; teklif oluşturma yalnız Lojistik.
  const canApprove = !!user && (user.yetkiTuru === 'Yonetici' || isSuperAdmin(user))
  const canCreate = !!user && (user.yetkiTuru === 'Lojistik' || isSuperAdmin(user))

  const [expanded, setExpanded] = useState<string | null>(null)
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['logistics-offer-queue'], queryFn: getOfferQueue,
  })

  const filtered = useMemo(() => {
    const no = trLower(f.siparisNo), mu = trLower(f.musteri)
    return queue.filter((r) => (!no || trLower(r.siparisNo).includes(no)) && (!mu || trLower(r.musteriAd ?? '').includes(mu)))
  }, [queue, f])

  const openDetail = (no: string) => setParams((p) => { const np = new URLSearchParams(p); np.set('order', no); return np })

  return (
    <div>
      <PageHeader title={t('logisticsOffer.title')} meta={!isLoading ? <Badge variant="neutral">{t('table.rowCount', { count: filtered.length })}</Badge> : undefined} />
      <div className="space-y-3 p-4 lg:p-6">
        <FilterBar onReset={reset} tableId="logistics-offers" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}>
          <FilterField label={t('common.orderNo')}>
            <Input inputSize="sm" value={f.siparisNo} onChange={(e) => set('siparisNo', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.customer')}>
            <Input inputSize="sm" value={f.musteri} onChange={(e) => set('musteri', e.target.value)} />
          </FilterField>
        </FilterBar>

        {/* İç denetim — teklif kuyruğu Üretim'den başlar: henüz üretime alınmamış (Planlama) siparişler. */}
        <WaitingUpstreamPanel screen="logistics-offers" />

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{t('logisticsOffer.queueEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const open = expanded === r.siparisNo
              const panelId = `offer-panel-${r.siparisNo}`
              return (
                <div key={r.siparisNo} className="rounded-md border bg-card">
                  <div className="flex items-center gap-2 pr-2">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => setExpanded(open ? null : r.siparisNo)}
                    >
                      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')} />
                      <span className="font-mono text-sm font-medium">{r.siparisNo}</span>
                      <span>{r.musteriAd}</span>
                      {r.mUlke && <span className="text-xs text-muted-foreground">{r.mUlke}</span>}
                      {/* Üretimdeki sipariş "Hazırlanıyor" rozetiyle gösterilir (gerçek aşama 'Uretim'). */}
                      {r.siparisMiTeklifMi === 'Uretim'
                        ? <Badge variant="progress">{t('logistics.preparing')}</Badge>
                        : <StatusBadge value={r.siparisMiTeklifMi} context="stage" />}
                      <span className="ml-auto flex items-center gap-2">
                        {r.onayliFirma
                          ? <Badge variant="success">{r.onayliFirma}{r.onayliFiyat != null ? ` · ${formatCurrency(r.onayliFiyat, r.onayliParaBirimi ?? undefined)}` : ''}</Badge>
                          : <span className="text-xs text-muted-foreground">{t('logisticsOffer.noApproved')}</span>}
                        <Badge variant={r.teklifSayisi > 0 ? 'info' : 'neutral'}>{t('logisticsOffer.count', { n: r.teklifSayisi })}</Badge>
                      </span>
                    </button>
                    <Button size="icon-sm" variant="ghost" aria-label={t('common.details')} onClick={() => openDetail(r.siparisNo)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  {open && (
                    <div id={panelId} className="space-y-3 border-t p-4">
                      <LogisticsOffersList siparisNo={r.siparisNo} canApprove={canApprove} />
                      {canCreate && <LogisticsOfferForm siparisNo={r.siparisNo} />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
