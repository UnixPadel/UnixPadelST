import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getOfferQueue } from '@/api/logisticsOffers'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { LogisticsOfferForm } from '@/components/LogisticsOfferForm'
import { LogisticsOffersList } from '@/components/LogisticsOffersList'

/**
 * "Lojistik Teklif" ekranı — yalnız Lojistik + Yönetici. Sipariş üretime
 * alınınca kuyruğa düşer, tamamlanana kadar kalır. Satıra tıklanınca altında
 * teklifler + (Yönetici için) onay/iptal + yeni teklif formu açılır.
 */
export function LogisticsOffersPage() {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  // Onay/red yalnız Yönetici; teklif oluşturma yalnız Lojistik.
  const canApprove = !!user && (user.yetkiTuru === 'Yonetici' || isSuperAdmin(user))
  const canCreate = !!user && (user.yetkiTuru === 'Lojistik' || isSuperAdmin(user))

  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailNo, setDetailNo] = useState<string | null>(null)
  const [fNo, setFNo] = useState('')
  const [fMusteri, setFMusteri] = useState('')

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['logistics-offer-queue'], queryFn: getOfferQueue,
  })

  const filtered = useMemo(() => queue.filter((r) => {
    if (fNo && !r.siparisNo.toLowerCase().includes(fNo.toLowerCase())) return false
    if (fMusteri && !(r.musteriAd ?? '').toLowerCase().includes(fMusteri.toLowerCase())) return false
    return true
  }), [queue, fNo, fMusteri])

  return (
    <div>
      <PageHeader title={t('logisticsOffer.title')} />
      <div className="p-6 space-y-4">
        {/* filtre şeridi */}
        <div className="rounded-md border bg-card p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>{t('common.orderNo')}</Label>
              <Input value={fNo} onChange={(e) => setFNo(e.target.value)} placeholder="…" />
            </div>
            <div className="space-y-1">
              <Label>{t('common.customer')}</Label>
              <Input value={fMusteri} onChange={(e) => setFMusteri(e.target.value)} placeholder="…" />
            </div>
            <div className="space-y-1 flex items-end">
              <Button variant="outline" className="w-full" onClick={() => { setFNo(''); setFMusteri('') }}>
                {t('myOrders.filter.reset')}
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">{t('logisticsOffer.queueEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const open = expanded === r.siparisNo
              return (
                <div key={r.siparisNo} className="rounded-md border bg-card">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
                    onClick={() => setExpanded(open ? null : r.siparisNo)}
                  >
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="font-medium">{r.siparisNo}</span>
                    <span className="text-muted-foreground">{r.musteriAd}</span>
                    {r.mUlke && <span className="text-xs text-muted-foreground">{r.mUlke}</span>}
                    {/* Üretimdeki sipariş "Hazırlanıyor" rozetiyle gösterilir (gerçek aşama 'Uretim'). */}
                    {r.siparisMiTeklifMi === 'Uretim'
                      ? <Badge variant="warning">{t('logistics.preparing')}</Badge>
                      : <StatusBadge value={r.siparisMiTeklifMi} />}
                    <span className="ml-auto flex items-center gap-2">
                      {r.onayliFirma
                        ? <Badge variant="success">{r.onayliFirma}{r.onayliFiyat != null ? ` · ${formatCurrency(r.onayliFiyat, r.onayliParaBirimi ?? undefined)}` : ''}</Badge>
                        : <span className="text-xs text-muted-foreground">{t('logisticsOffer.noApproved')}</span>}
                      {/* Yeni teklif geldiyse (sayı > 0) rozet yeşile döner; boşsa nötr. */}
                      <Badge variant={r.teklifSayisi > 0 ? 'success' : 'secondary'}>{t('logisticsOffer.count', { n: r.teklifSayisi })}</Badge>
                    </span>
                  </button>

                  {open && (
                    <div className="space-y-3 border-t p-4">
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo)}>
                          {t('common.details')}
                        </Button>
                      </div>
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

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} logisticsView />
    </div>
  )
}
