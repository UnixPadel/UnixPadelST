import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getOrderDetail, downloadExcel, downloadPdf } from '@/api/orders'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { resolveClause } from '@/lib/clauses'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { OrderApprovalTimeline } from '@/components/OrderApprovalTimeline'
import { OrderStageTimeline } from '@/components/OrderStageTimeline'
import { LogisticsOfferForm } from '@/components/LogisticsOfferForm'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { hideMoneyFor } from '@/lib/visibility'

interface Props {
  siparisNo: string | null
  onClose: () => void
  // §22 — "Siparişlerim" (My Orders) ekranında Notlar bölümü tamamen kaldırılır.
  // Diğer ekranlar (Muhasebe/Fabrika/Lojistik/Kontrol) davranışı değişmez.
  hideNotes?: boolean
  // Lojistik görünümü: fabrika notu + aşama geçmişi + "Teklif Gönder" fiyatlandırmanın
  // ÜSTÜNDE gösterilir. Yalnız Lojistik Hazır + Lojistik Teklif ekranları geçer;
  // diğer ekranlar etkilenmez.
  logisticsView?: boolean
}

export function OrderDetailModal({ siparisNo, onClose, hideNotes = false, logisticsView = false }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  // PROMPT-v2 §2 + Round-11 §3: parasal değer gizleme (Fabrika rolü + omur.caliskan
  // gibi ad-bazlı kullanıcılar). Fiyatlandırma bloğu, bileşen Fiyat/Toplam sütunları,
  // proforma Excel butonu gizlenir. Backend de aynı gate'lere sahip.
  const { getUser } = useAuth()
  const user = getUser()
  const hideMoney = hideMoneyFor(user)
  // Teklif gönderme yalnız Lojistik (+ süper-admin). Yönetici teklif oluşturmaz.
  // Sadece logisticsView'da görünür.
  const canOffer = logisticsView && !!user &&
    (user.yetkiTuru === 'Lojistik' || isSuperAdmin(user))
  const [showOfferForm, setShowOfferForm] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', siparisNo],
    queryFn: () => getOrderDetail(siparisNo!),
    enabled: !!siparisNo,
  })

  const handleExcel = async () => {
    if (!siparisNo) return
    try {
      await downloadExcel(siparisNo)
      toast({ title: 'Excel indirildi' })
    } catch {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  // Aynı proformanın PDF'i (sunucuda LibreOffice ile birebir dönüşüm).
  const handlePdf = async () => {
    if (!siparisNo) return
    try {
      await downloadPdf(siparisNo)
      toast({ title: 'PDF indirildi' })
    } catch {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={!!siparisNo} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('orderDetail.title', { no: siparisNo })}</span>
            {!hideMoney && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExcel}>📥 {t('common.excel')}</Button>
                <Button size="sm" variant="outline" onClick={handlePdf}>📄 PDF</Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>}

        {order && (
          <div className="space-y-6 text-sm">
            {/* Status row */}
            <div className="flex gap-4 items-center">
              <StatusBadge value={order.siparisMiTeklifMi} />
              <StatusBadge value={order.kontrol} />
              {order.tarih && <span className="text-muted-foreground">{formatDate(order.tarih)}</span>}
              {order.sirket && <span className="text-muted-foreground">{order.sirket}</span>}
            </div>

            {/* Two-column info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer */}
              <div className="space-y-2 border rounded-md p-3">
                <h3 className="font-semibold">{t('orderDetail.musteriInfo')}</h3>
                <Row label={t('orderDetail.musteri')} value={order.musteriAd} />
                <Row label={t('orderDetail.ulke')} value={order.mUlke} />
                <Row label={t('orderDetail.telefon')} value={order.mTelefon} />
                <Row label={t('orderDetail.email')} value={order.mMail} />
                <Row label={t('orderDetail.vat')} value={order.mVATNumarasi} />
                <Row label={t('orderDetail.adres')} value={order.mAdres} />
              </div>

              {/* Delivery */}
              {order.teslimatVar && (
                <div className="space-y-2 border rounded-md p-3">
                  <h3 className="font-semibold">{t('orderDetail.teslimatAddr')}</h3>
                  <Row label={t('orderDetail.teslimAlan')} value={order.tTeslimAlanAdi} />
                  <Row label={t('orderDetail.ilgiliKisi')} value={order.tIlgiliKisi} />
                  <Row label={t('orderDetail.ulke')} value={order.tUlke} />
                  <Row label={t('orderDetail.telefon')} value={order.tTelefon} />
                  <Row label={t('orderDetail.email')} value={order.tE_Mail} />
                  <Row label={t('orderDetail.adres')} value={order.tAdres} />
                </div>
              )}
            </div>

            {/* Lojistik görünümü — Fiyatlandırmanın ÜSTÜNDE: fabrika notu →
                aşama geçmişi → Teklif Gönder. Diğer ekranlar (logisticsView yok)
                değişmez; aynı bloklar aşağıda tekrar gösterilmez. */}
            {logisticsView && (
              <div className="space-y-4">
                {order.fabrikaNot && (
                  <div className="border rounded-md p-3">
                    <p><span className="font-semibold">{t('orderDetail.fabrikaNot')}:</span> {order.fabrikaNot}</p>
                  </div>
                )}
                <div className="border rounded-md p-3">
                  <OrderStageTimeline
                    tarih={order.tarih}
                    sTarih={order.sTarih}
                    currentStage={order.siparisMiTeklifMi}
                  />
                </div>
                {canOffer && (
                  showOfferForm
                    ? <LogisticsOfferForm siparisNo={order.siparisNo} onSubmitted={() => setShowOfferForm(false)} />
                    : <Button onClick={() => setShowOfferForm(true)}>{t('logisticsOffer.sendOffer')}</Button>
                )}
              </div>
            )}

            {/* Pricing — PROMPT-v2 §2: Fabrika için tamamen gizli. */}
            {!hideMoney && (
              <div className="border rounded-md p-3 space-y-2">
                <h3 className="font-semibold">{t('orderDetail.pricing')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <PriceBox label={t('orderDetail.paraBirimi')} value={order.paraTipi} />
                  <PriceBox label={t('orderDetail.brut')} value={formatCurrency(order.brutToplamFiyat, order.paraTipi)} />
                  {(order.indirim ?? 0) > 0 && <PriceBox label={t('orderDetail.indirim')} value={`-${formatCurrency(order.indirim, order.paraTipi)}`} />}
                  {(order.kdv ?? 0) > 0 && <PriceBox label={t('orderDetail.kdv')} value={`%${order.kdv}`} />}
                  <PriceBox label={t('orderDetail.toplam')} value={formatCurrency(order.toplamFiyat, order.paraTipi)} highlight />
                  <PriceBox label={t('orderDetail.pesinYuzde')} value={`%${order.pesinYuzde}`} />
                  {(order.pesinYuzde ?? 0) > 0 && (
                    <PriceBox
                      label={t('orderDetail.pesinatTutar')}
                      value={formatCurrency(((order.toplamFiyat ?? 0) * (order.pesinYuzde ?? 0)) / 100, order.paraTipi)}
                    />
                  )}
                  {order.montajVar && <PriceBox label={t('orderDetail.montaj')} value={formatCurrency(order.montajFiyat, order.paraTipi)} />}
                  {order.teslimatVar && <PriceBox label={t('orderDetail.teslimat')} value={formatCurrency(order.teslimatFiyat, order.paraTipi)} />}
                </div>
              </div>
            )}

            {/* Products table */}
            {order.items && order.items.length > 0 && (
              <div className="border rounded-md p-3">
                <h3 className="font-semibold mb-2">{t('orderDetail.products')}</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-2 py-1">{t('orderDetail.tur')}</th>
                      <th className="text-left px-2 py-1">{t('orderDetail.oznitelik')}</th>
                      <th className="text-right px-2 py-1">{t('orderDetail.adet')}</th>
                      {/* PROMPT-v2 §2: Fabrika Fiyat sütununu görmez. */}
                      {/* Round-11 §4: Fiyat = tekil (birim) fiyat; Toplam = Tekil Fiyat × Adet. */}
                      {!hideMoney && <th className="text-right px-2 py-1">{t('orderDetail.fiyat')}</th>}
                      {!hideMoney && <th className="text-right px-2 py-1">{t('orderDetail.toplam')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} className={`border-b ${item.kategoriID && !item.bilesenID ? 'font-semibold bg-muted/20' : ''}`}>
                        <td className="px-2 py-1">{item.kategoriID && !item.bilesenID ? t('orderDetail.set', { id: item.kategoriID }) : t('orderDetail.bilesen', { id: item.bilesenID })}</td>
                        <td className="px-2 py-1">{item.oznitelikAdi ?? '—'}</td>
                        <td className="text-right px-2 py-1">{item.adet}</td>
                        {!hideMoney && (
                          <td className="text-right px-2 py-1">{formatCurrency(item.fiyat, order.paraTipi)}</td>
                        )}
                        {!hideMoney && (
                          <td className="text-right px-2 py-1 tabular-nums">{formatCurrency((item.fiyat ?? 0) * item.adet, order.paraTipi)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Details / Notes — §22: Siparişlerim'de gizlenir (hideNotes). */}
            {!hideNotes && order.details && order.details.length > 0 && (
              <div className="border rounded-md p-3">
                <h3 className="font-semibold mb-2">{t('orderDetail.notes')}</h3>
                <ul className="space-y-1 text-muted-foreground">
                  {order.details.map((d, i) => <li key={i}>• {resolveClause(t, d)}</li>)}
                </ul>
              </div>
            )}

            {/* Rejection note */}
            {order.kontrol === 'Reddet' && order.red && (
              <div className="border border-red-300 rounded-md p-3 bg-red-50">
                <h3 className="font-semibold text-red-700 mb-1">{t('orderDetail.redNotu')}</h3>
                <p className="text-red-600">{order.red}</p>
              </div>
            )}

            {/* Factory / Logistics notes — logisticsView'da fabrika notu yukarı
                taşındığı için burada yalnız lojistik notu kalır. */}
            {((order.fabrikaNot && !logisticsView) || order.lojistikNot) && (
              <div className="border rounded-md p-3 space-y-1">
                {order.fabrikaNot && !logisticsView && <p><span className="font-semibold">{t('orderDetail.fabrikaNot')}:</span> {order.fabrikaNot}</p>}
                {order.lojistikNot && <p><span className="font-semibold">{t('orderDetail.lojistikNot')}:</span> {order.lojistikNot}</p>}
              </div>
            )}

            {/* 2.5 — Aşama Geçmişi: Tarih + STarih + currentStage'den türetildi.
                logisticsView'da yukarı taşındı; burada tekrar gösterilmez. */}
            {!logisticsView && (
              <div className="border rounded-md p-3">
                <OrderStageTimeline
                  tarih={order.tarih}
                  sTarih={order.sTarih}
                  currentStage={order.siparisMiTeklifMi}
                />
              </div>
            )}

            {/* Approval timeline (Faz 3) */}
            <div className="border rounded-md p-3">
              <OrderApprovalTimeline siparisNo={siparisNo} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-24">{label}:</span>
      <span>{value}</span>
    </div>
  )
}

function PriceBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded p-2 text-center ${highlight ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}
