import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, CheckCircle2, AlertTriangle, Copy, Download, FileText } from 'lucide-react'
import { getOrderDetail, downloadExcel, downloadPdf, changeRepresentative, restoreOrder } from '@/api/orders'
import { getUsersLookup } from '@/api/users'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { resolveClause, isFreeNote, isClauseCode, getProductDetails, detectOrderCategory } from '@/lib/clauses'
import { StatusBadge } from '@/components/StatusBadge'
import { RowActionsMenu } from '@/components/RowActionsMenu'
import type { RowAction } from '@/components/ContextMenu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionTitle } from '@/components/ui/section-title'
import { KeyValue } from '@/components/ui/key-value'
import { CollapsibleSection } from '@/components/ui/accordion'
import { LogisticsOfferForm } from '@/components/LogisticsOfferForm'
import { DocumentFlow } from '@/components/order/DocumentFlow'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin, isAccountingApprover } from '@/lib/permissions'
import { CompleteOrderModal } from '@/components/order/CompleteOrderModal'
import { hideMoneyFor } from '@/lib/visibility'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { usePanelHeaderSlot } from '@/components/MasterDetailLayout'
import { AccountingFolderButton, AccountingFolderDialog, canSeeAccountingFolder } from '@/components/order/AccountingFolder'

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
  // Fabrika görünümü: Notlar bölümünde yalnız teklifi oluşturanın/sonradan
  // eklenen SERBEST notlar gösterilir; default @@ standart şartlar (Fiyatlar 2
  // hafta, KDV/nakliye dahil değildir, haklar saklıdır) ve 17 önceden tanımlı
  // standart detay şartı fabrikaya gizlenir.
  factoryView?: boolean
}

type PanelProps = Omit<Props, 'onClose'> & {
  /** E-9 — panel bir master-detail düzeninde satır içi gösterilirken true. */
  embedded?: boolean
  /**
   * Ekrana özel işlemler (ör. Revize Et, Sil). Başlıktaki tek "Diğer işlemler"
   * menüsüne eklenir: tehlikesizler en üste, `destructive` olanlar en alta.
   * Böylece panelde iki ayrı menü oluşmaz. `onSelect` satır argümanını kullanmamalı.
   */
  extraActions?: RowAction<unknown>[]
}

/** Modal sarmalayıcı — mevcut tüm ekranlar bunu kullanmaya devam eder. */
export function OrderDetailModal({ siparisNo, onClose, ...rest }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!siparisNo} onOpenChange={(o) => { if (!o) onClose() }}>
      {/* Sabit boyut (içeriğe göre büyüyüp küçülmez); rem tabanlı olduğu için
          arayüz ölçeğiyle (Electron zoomFactor) birlikte ölçeklenir, kısa ekranda
          90vh ile sınırlanır. Kayan yalnız paneldeki gövdedir. */}
      <DialogContent size="xl" className="flex h-[min(42rem,90vh)] flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 px-6 pb-3 pr-12 pt-6">
          <DialogTitle>{t('orderDetail.title', { no: siparisNo })}</DialogTitle>
        </div>
        {siparisNo && <OrderDetailPanel key={siparisNo} siparisNo={siparisNo} {...rest} />}
      </DialogContent>
    </Dialog>
  )
}

type SectionId = 'general' | 'items' | 'details' | 'flow'
/** Çapa tıklanınca bölüm başlığının gövde üstünden bırakacağı boşluk (px). */
const SECTION_OFFSET = 12

/**
 * E-9 / E-8 — sipariş detayının gövdesi; hem modalda hem master-detail sağ
 * panelinde kullanılır. Fiori Object Page: üstte sabit başlık şeridi + çapa
 * çubuğu, altında tek kayan gövdede alt alta bölümler:
 *   Genel · Kalemler · Detaylar · Sipariş Geçmişi
 * Çapa butonu ilgili bölüme kaydırır; kaydırdıkça etkin buton güncellenir.
 * Kap (modal / aside) sınırlı yükseklikte bir flex sütunu olmalıdır.
 */
export function OrderDetailPanel({ siparisNo, hideNotes = false, logisticsView = false, factoryView = false, embedded = false, extraActions = [] }: PanelProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const nav = useNavigate()
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
  const canCreateOrders = !!user && (user.yetkiTuru === 'Temsilci' || user.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user))
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const qc = useQueryClient()
  const padX = embedded ? 'px-3' : 'px-6'
  const panelSlot = usePanelHeaderSlot()
  const headerSlot = embedded ? panelSlot : null

  // Çapa çubuğu ↔ bölümler. Tıklamadaki yumuşak kaydırma bitene dek kaydırma
  // takibi durur (yoksa kısa son bölümlerde vurgu "sona" atlar).
  const bodyRef = useRef<HTMLDivElement>(null)
  const sectionEls = useRef<Partial<Record<SectionId, HTMLElement | null>>>({})
  const spyPausedUntil = useRef(0)
  const [activeSection, setActiveSection] = useState<SectionId>('general')

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order-detail', siparisNo],
    queryFn: () => getOrderDetail(siparisNo!),
    enabled: !!siparisNo,
  })

  // Temsilci devri — YALNIZ elshan.rasulov (ControlUser) / süper-admin görür.
  // Sipariş sahipliği düzenlemede artık değişmez; devir yalnız bu kontrolle yapılır.
  const queryClient = useQueryClient()
  const canReassign = !!user && (user.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user))
  const [newRepId, setNewRepId] = useState('')
  const [savingRep, setSavingRep] = useState(false)
  const { data: userOptions = [] } = useQuery({
    queryKey: ['users-lookup'],
    queryFn: getUsersLookup,
    enabled: canReassign && !!siparisNo,
  })
  const temsilciler = userOptions.filter((u) => u.yetkiTuru === 'Temsilci')

  const handleChangeRep = async () => {
    if (!order || !newRepId) return
    setSavingRep(true)
    try {
      await changeRepresentative(order.siparisNo, Number(newRepId))
      toast({ title: t('orderDetail.repChanged'), variant: 'success' })
      setNewRepId('')
      await invalidateOrderGraph(queryClient)
    } catch (e) {
      toastApiError(toast, t('common.error'), e)
    } finally {
      setSavingRep(false)
    }
  }

  const handleDownload = async (kind: 'excel' | 'pdf') => {
    if (!siparisNo) return
    setDownloading(kind)
    try {
      await (kind === 'excel' ? downloadExcel(siparisNo) : downloadPdf(siparisNo))
      toast({ title: kind === 'excel' ? t('orderDetail.excelDownloaded') : t('orderDetail.pdfDownloaded'), variant: 'success' })
    } catch (e) {
      toastApiError(toast, t('common.error'), e)
    } finally {
      setDownloading(null)
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-3 py-2', padX)} aria-busy>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />)}
      </div>
    )
  }
  if (isError || !order) {
    return <p className={cn('py-8 text-center text-sm text-danger', padX)}>{t('orderDetail.loadError')}</p>
  }

  const detectedCategory = detectOrderCategory(order)
  const productDetailsList = getProductDetails(detectedCategory)

  const rawDetails = order.details ?? []
  const isClauseSelected = (clause: string) =>
    rawDetails.some((d) => {
      const dl = d.trim().toLowerCase()
      const cl = clause.trim().toLowerCase()
      if (dl === cl) return true
      if (cl.includes('12mm') && cl.includes('glass') && dl.includes('12mm') && dl.includes('glass')) return true
      return false
    })

  const selectedStandardCount = productDetailsList.filter(isClauseSelected).length
  const clauseNotes = rawDetails.filter(isClauseCode)
  const freeNotes = rawDetails.filter(isFreeNote)
  const allFreeNotes = [
    ...(order.siparisNotu ? [order.siparisNotu] : []),
    ...freeNotes,
  ]

  // Başlıktaki "Diğer işlemler" menüsü: belge indirme, kopyalama ve (ayrı, en altta)
  // ara adımları atlayarak tamamlama.
  const canCompleteDirect = isAccountingApprover(user) && order.siparisMiTeklifMi !== 'Tamamlandi'
    && order.siparisMiTeklifMi !== 'Teklif' && order.siparisMiTeklifMi !== 'Iptal' && !order.silindi
  const headerMenu: RowAction<unknown>[] = [
    ...extraActions.filter((a) => !a.destructive),
    ...(!hideMoney ? [
      { key: 'excel', label: t('folder.proformaExcel'), icon: <Download className="h-3.5 w-3.5" />, separatorBefore: extraActions.some((a) => !a.destructive), onSelect: () => void handleDownload('excel') },
      { key: 'pdf', label: t('folder.proformaPdf'), icon: <FileText className="h-3.5 w-3.5" />, onSelect: () => void handleDownload('pdf') },
    ] : []),
    ...(canCreateOrders ? [
      { key: 'copy', label: t('orderDetail.copyAsNew'), icon: <Copy className="h-3.5 w-3.5" />, separatorBefore: !hideMoney,
        onSelect: () => nav(`/orders/new?copyFrom=${encodeURIComponent(order.siparisNo)}`) },
    ] : []),
    ...(canCompleteDirect ? [
      { key: 'complete', label: t('accApproval.completeDirect'), icon: <AlertTriangle className="h-4 w-4" aria-hidden />, destructive: true, separatorBefore: true,
        onSelect: () => setShowCompleteModal(true) },
    ] : []),
    ...extraActions.filter((a) => a.destructive).map((a, i) => ({ ...a, separatorBefore: a.separatorBefore || (i === 0 && !canCompleteDirect) })),
  ]

  const itemCount = order.items?.length ?? 0
  const sections: { id: SectionId; label: string; count?: number }[] = [
    { id: 'general', label: t('orderDetail.tabs.general') },
    { id: 'items', label: t('orderDetail.tabs.items'), count: itemCount },
    { id: 'details', label: factoryView ? t('orderDetail.tabs.notes') : t('orderDetail.tabs.details') },
    { id: 'flow', label: t('orderDetail.tabs.flow') },
  ]

  const goToSection = (id: SectionId) => {
    if (id === 'details' && !detailsOpen) {
      setDetailsOpen(true)
    }
    setActiveSection(id)
    spyPausedUntil.current = Date.now() + 900
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      const body = bodyRef.current, el = sectionEls.current[id]
      if (!body || !el) return
      body.scrollTo({ top: Math.max(0, el.offsetTop - SECTION_OFFSET), behavior: smooth ? 'smooth' : 'auto' })
    })
  }
  const onBodyScroll = () => {
    const body = bodyRef.current
    if (!body || Date.now() < spyPausedUntil.current) return
    let current: SectionId = sections[0].id
    if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) current = sections[sections.length - 1].id
    else for (const s of sections) {
      const el = sectionEls.current[s.id]
      if (el && el.offsetTop - body.scrollTop <= SECTION_OFFSET * 2) current = s.id
    }
    setActiveSection(current)
  }
  const sectionProps = (id: SectionId) => ({
    ref: (el: HTMLElement | null) => { sectionEls.current[id] = el },
    'aria-labelledby': `od-${id}`,
    className: 'space-y-3',
  })
  const sectionHeading = (id: SectionId) => {
    const s = sections.find((x) => x.id === id)!
    return (
      <h3 id={`od-${id}`} className="border-b pb-1 text-base font-semibold">
        {s.label}{s.count != null && <span className="ml-1 font-normal text-muted-foreground">({s.count})</span>}
      </h3>
    )
  }

  const badges = (
    <>
      <StatusBadge value={order.siparisMiTeklifMi} context="stage" />
      <StatusBadge value={order.kontrol} context="kontrol" />
    </>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col text-sm">
      {/* K5 — silinmiş sipariş: durum + geri yükleme. */}
      {order.silindi && (
        <div role="status" className={cn('mb-2 flex flex-wrap items-center gap-2 rounded-md border border-danger/30 bg-danger-soft py-2 text-sm text-danger-soft-foreground', embedded ? 'mx-3 px-3' : 'mx-6 px-3')}>
          <span className="font-semibold">{t('undo.deletedBadge')}</span>
          <Button size="xs" variant="outline" className="ml-auto" loading={restoring}
            onClick={async () => {
              setRestoring(true)
              try { await restoreOrder(order.siparisNo); await invalidateOrderGraph(qc); toast({ title: t('undo.restored'), description: order.siparisNo, variant: 'success' }) }
              catch (e) { toastApiError(toast, t('undo.failed'), e) }
              finally { setRestoring(false) }
            }}>
            {t('undo.restore')}
          </Button>
        </div>
      )}
      {/* Sabit üst kısım (kaymaz): durum şeridi + bölüm çapaları. */}
      <div className={cn('shrink-0 space-y-2 border-b pb-2', padX)}>
        {/* Başlık şeridi: durum + tarih + aksiyonlar */}
        {/* Yan panelde rozetler panel başlığına (sipariş no. yanına) taşınır; tarih ·
            şirket ile işlemler tek satırda kalır. Önceden rozetler + tarih bir satır,
            işlemler sığmayıp ikinci satır oluyordu → sipariş içeriği daralıyordu. */}
        {headerSlot && createPortal(badges, headerSlot)}
        <div className={cn('flex items-center gap-2', headerSlot ? 'flex-nowrap' : 'flex-wrap')}>
          {/* Sipariş no. burada tekrar yazılmaz: pencere / panel başlığında zaten var. */}
          {!headerSlot && badges}
          <span className={cn('text-muted-foreground', headerSlot && 'min-w-0 truncate')}
            title={headerSlot ? [order.tarih && formatDate(order.tarih), order.sirket].filter(Boolean).join(' · ') : undefined}>
            {order.tarih && formatDate(order.tarih)}
            {order.sirket && <>{order.tarih ? ' · ' : ''}{order.sirket}</>}
          </span>
          {/* Önceden burada beş eş ağırlıklı buton vardı (Tamamla · Kopyala · Excel · PDF ·
              Klasör). Görünür tek buton siparişin belgeleri; diğerleri "Diğer işlemler"de. */}
          <div className={cn('ml-auto flex items-center gap-1.5', headerSlot ? 'shrink-0' : 'flex-wrap')}>
            {/* Parasal değer göremeyenler (Fabrika vb.) klasörü görmez. */}
            {canSeeAccountingFolder(user) && (
              <AccountingFolderButton siparisNo={order.siparisNo} onClick={() => setFolderOpen(true)} />
            )}
            {headerMenu.length > 0 && (
              downloading
                ? <Button size="xs" variant="outline" loading disabled>{t('common.moreActions')}</Button>
                : <RowActionsMenu row={order} actions={headerMenu} label={t('common.moreActions')} />
            )}
          </div>
        </div>

        {/* Bölüm çapaları — sekme görünümünde ama sayfa değiştirmez, kaydırır. */}
        <nav aria-label={t('orderDetail.sections')} className={cn('inline-flex max-w-full flex-wrap items-center rounded-md bg-muted text-muted-foreground', embedded ? 'p-0.5' : 'min-h-ctl-sm p-1')}>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={activeSection === s.id || undefined}
              onClick={() => goToSection(s.id)}
              className={cn(
                // Panelde daha dar: dört bölüm ~400 px panelde tek satıra sığsın.
                'inline-flex items-center whitespace-nowrap rounded-sm text-xs font-medium', embedded ? 'px-2 py-1' : 'px-3 py-1.5', ' ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                activeSection === s.id ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
              )}
            >
              {s.label}{s.count != null && <span className="ml-1 text-muted-foreground">({s.count})</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tek kayan gövde (sağda kaydırma çubuğu); bölümler alt alta. */}
      <div
        ref={bodyRef}
        onScroll={onBodyScroll}
        className={cn('relative min-h-0 flex-1 space-y-6 overflow-y-auto pt-3 [scrollbar-gutter:stable]', padX, embedded ? 'pb-3' : 'pb-6')}
      >
        <section {...sectionProps('general')}>
          {sectionHeading('general')}
          {/* Tamamlandı Bildirim Bandı */}
          {order.siparisMiTeklifMi === 'Tamamlandi' && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-foreground">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 font-semibold text-orange-950 dark:text-orange-200">
                    <span>Bu sipariş tamamlandı olarak kapatıldı</span>
                    {order.tamamlanmaOncekiAsama && order.tamamlanmaOncekiAsama !== 'TamamlanmaBekliyor' && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-2xs font-medium text-orange-900 dark:bg-orange-950/60 dark:text-orange-200">
                        {order.tamamlanmaOncekiAsama} aşamasından doğrudan kapatıldı
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-2xs">
                    <span>Kapatan: <strong>{order.tamamlayanAdSoyad || order.tamamlayanKullaniciAdi || 'Yetkili'}</strong></span>
                    {order.tamamlanmaTarihi && <span>· Kapanış Tarihi: <strong>{formatDate(order.tamamlanmaTarihi)}</strong></span>}
                  </div>
                  {order.tamamlanmaNotu && (
                    <div className="mt-1 rounded border border-orange-500/20 bg-background/80 p-2 text-foreground italic">
                      "{order.tamamlanmaNotu}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Red notu — Genel'in en üstünde. */}
          {order.kontrol === 'Reddet' && order.red && (
            <div role="alert" className="rounded-md border border-danger/40 bg-danger-soft p-3 text-danger-soft-foreground">
              <p className="font-semibold">{t('orderDetail.redNotu')}</p>
              <p>{order.red}</p>
            </div>
          )}

          {/* Temsilci devri — YALNIZ elshan.rasulov (ControlUser) / süper-admin.
              Diğer kullanıcılar bu bloğu hiç görmez; backend gate ayrıca 403 döner. */}
          {canReassign && (
            <div className="space-y-2 rounded-md border p-3">
              <SectionTitle>{t('orderDetail.temsilci')}</SectionTitle>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">
                  {t('orderDetail.currentRep')}: <span className="font-medium text-foreground">{order.kullaniciAdi || '—'}</span>
                </span>
                <Select value={newRepId || undefined} onValueChange={setNewRepId}>
                  <SelectTrigger size="sm" className="w-56"><SelectValue placeholder={t('orderDetail.selectRep')} /></SelectTrigger>
                  <SelectContent>
                    {temsilciler.map((u) => (
                      <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>
                        {`${u.ad} ${u.soyad}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="xs" onClick={handleChangeRep} disabled={!newRepId} loading={savingRep}>
                  {t('orderDetail.changeRep')}
                </Button>
              </div>
            </div>
          )}

          {/* Lojistik görünümü — fabrika notu + Teklif Gönder fiyatlandırmanın üstünde. */}
          {logisticsView && (
            <div className="space-y-3">
              {order.fabrikaNot && (
                <div className="rounded-md border p-3">
                  <p><span className="font-semibold">{t('orderDetail.fabrikaNot')}:</span> {order.fabrikaNot}</p>
                </div>
              )}
              {canOffer && (
                showOfferForm
                  ? <LogisticsOfferForm siparisNo={order.siparisNo} onSubmitted={() => setShowOfferForm(false)} />
                  : <Button size="sm" onClick={() => setShowOfferForm(true)}>{t('logisticsOffer.sendOffer')}</Button>
              )}
            </div>
          )}

          <div className={embedded ? 'grid grid-cols-1 gap-3 2xl:grid-cols-2' : 'grid grid-cols-1 gap-3 md:grid-cols-2'}>
            <div className="space-y-1.5 rounded-md border p-3">
              <SectionTitle>{t('orderDetail.musteriInfo')}</SectionTitle>
              <KeyValue label={t('orderDetail.musteri')} value={order.musteriAd} />
              <KeyValue label={t('orderDetail.ulke')} value={order.mUlke} />
              <KeyValue label={t('orderDetail.telefon')} value={order.mTelefon} />
              <KeyValue label={t('orderDetail.email')} value={order.mMail} />
              <KeyValue label={t('orderDetail.vat')} value={order.mVATNumarasi} />
              <KeyValue label={t('orderDetail.adres')} value={order.mAdres} />
            </div>
            {order.teslimatVar && (
              <div className="space-y-1.5 rounded-md border p-3">
                <SectionTitle>{t('orderDetail.teslimatAddr')}</SectionTitle>
                <KeyValue label={t('orderDetail.teslimAlan')} value={order.tTeslimAlanAdi} />
                <KeyValue label={t('orderDetail.ilgiliKisi')} value={order.tIlgiliKisi} />
                <KeyValue label={t('orderDetail.ulke')} value={order.tUlke} />
                <KeyValue label={t('orderDetail.telefon')} value={order.tTelefon} />
                <KeyValue label={t('orderDetail.email')} value={order.tE_Mail} />
                <KeyValue label={t('orderDetail.adres')} value={order.tAdres} />
              </div>
            )}
          </div>

          {/* Pricing — PROMPT-v2 §2: Fabrika için tamamen gizli. İndirim yüzde
              olarak gösterilir (diğer ekranlarla aynı). */}
          {!hideMoney && (
            <div className="space-y-2 rounded-md border p-3">
              <SectionTitle>{t('orderDetail.pricing')}</SectionTitle>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <PriceBox label={t('orderDetail.paraBirimi')} value={order.paraTipi} />
                <PriceBox label={t('orderDetail.brut')} value={formatCurrency(order.brutToplamFiyat, order.paraTipi)} />
                {(order.indirim ?? 0) > 0 && <PriceBox label={t('orderDetail.indirim')} value={`%${order.indirim}`} />}
                {(order.kdv ?? 0) > 0 && <PriceBox label={t('orderDetail.kdv')} value={`%${order.kdv}`} />}
                <PriceBox label={t('orderDetail.toplam')} value={formatCurrency(order.toplamFiyat, order.paraTipi)} highlight />
                <PriceBox label={t('orderDetail.pesinYuzde')} value={`%${order.pesinYuzde ?? 0}`} />
                {(order.pesinYuzde ?? 0) > 0 && (
                  <PriceBox
                    label={t('orderDetail.pesinatTutar')}
                    value={formatCurrency(((order.toplamFiyat ?? 0) * (order.pesinYuzde ?? 0)) / 100, order.paraTipi)}
                  />
                )}
                {order.montajVar && <PriceBox label={t('orderDetail.montajQty', { adet: order.mAdet })} value={formatCurrency(order.montajFiyat, order.paraTipi)} />}
                {order.teslimatVar && <PriceBox label={t('orderDetail.teslimatQty', { adet: order.mTeslimat })} value={formatCurrency(order.teslimatFiyat, order.paraTipi)} />}
                {/* 4.3 — ekstra maliyetler önceden fiyat bölümünde hiç görünmüyordu (toplama ekli olsalar da). */}
                {(order.extraCosts ?? []).length > 0 && (
                  <PriceBox label={t('orderDetail.extraCosts', { count: (order.extraCosts ?? []).length })}
                    value={formatCurrency((order.extraCosts ?? []).reduce((s, x) => s + (x.tutar ?? 0), 0), order.paraTipi)} />
                )}
              </div>
              {(order.extraCosts ?? []).length > 0 && (
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {(order.extraCosts ?? []).map((x) => (
                    <li key={x.ekMaliyetID} className="flex justify-between gap-4">
                      <span>• {x.aciklama}</span>
                      <span className="tabular-nums">{formatCurrency(x.tutar, order.paraTipi)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {((order.fabrikaNot && !logisticsView) || order.lojistikNot) && (
            <div className="space-y-1 rounded-md border p-3">
              {order.fabrikaNot && !logisticsView && <p><span className="font-semibold">{t('orderDetail.fabrikaNot')}:</span> {order.fabrikaNot}</p>}
              {order.lojistikNot && <p><span className="font-semibold">{t('orderDetail.lojistikNot')}:</span> {order.lojistikNot}</p>}
            </div>
          )}
        </section>

        <section {...sectionProps('items')}>
          {sectionHeading('items')}
          {order.items && order.items.length > 0 ? (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orderDetail.tur')}</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{t('orderDetail.oznitelik')}</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">{t('orderDetail.adet')}</th>
                    {/* Round-11 §4: Fiyat = tekil (birim) fiyat; Toplam = Tekil Fiyat × Adet. */}
                    {!hideMoney && <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">{t('orderDetail.fiyat')}</th>}
                    {/* 4.3 — set satırı dışındaki tutarlar bilgi amaçlıdır, toplama girmez. */}
                    {!hideMoney && <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">{t('orderDetail.lineTotal')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => {
                    const isCategory = !!item.kategoriID && !item.bilesenID
                    const isFreeItem = !item.kategoriID && !item.bilesenID
                    const ad = isCategory
                      ? (item.kategoriAdi ?? t('orderDetail.set', { id: item.kategoriID }))
                      : isFreeItem
                        ? (item.sBilesenAdi ?? t('orderDetail.ozelKalem'))
                        : (item.bilesenAdi ?? t('orderDetail.bilesen', { id: item.bilesenID }))
                    return (
                      <tr key={i} className={`border-t ${isCategory ? 'bg-muted/40 font-semibold' : ''}`}>
                        <td className={`px-2 py-1 ${!isCategory && !isFreeItem ? 'pl-5' : ''}`}>
                          {ad}
                          {isFreeItem && <Badge variant="warning" className="ml-1 px-1.5 py-0 text-2xs">{t('orderDetail.ozelBadge')}</Badge>}
                        </td>
                        <td className="px-2 py-1">{item.oznitelikAdi ?? '—'}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{item.adet}</td>
                        {!hideMoney && <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(item.fiyat, order.paraTipi)}</td>}
                        {!hideMoney && (
                          <td className="px-2 py-1 text-right tabular-nums">
                            {formatCurrency((item.fiyat ?? 0) * item.adet, order.paraTipi)}
                            {!isCategory && !isFreeItem && <span className="ml-1 text-2xs font-normal text-muted-foreground">({t('orderDetail.infoOnly')})</span>}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="py-6 text-center text-muted-foreground">{t('common.noData')}</p>}
        </section>

        {/* Detaylar ve Notlar — Sipariş Geçmişi'nin üstünde açılır/kapanır akordiyon */}
        <div
          ref={(el) => { sectionEls.current['details'] = el }}
          id="od-details"
          className="space-y-2"
        >
          <CollapsibleSection
            id="sec-details"
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            title={factoryView ? t('orderDetail.tabs.notes') : t('orders.form.details')}
            summary={
              factoryView
                ? `${allFreeNotes.length} ${t('orders.form.freeNotes').toLowerCase()}`
                : t('orders.form.termsSummary', {
                    checked: selectedStandardCount,
                    total: productDetailsList.length,
                    notes: allFreeNotes.length,
                  })
            }
          >
            <div className="space-y-4 p-4 text-xs">
              {/* Standart Şartlar — fabrika rolü için gizli */}
              {!factoryView && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('orders.form.standardTerms')}</p>
                  <div className="grid gap-x-6 gap-y-1 rounded-md border p-3 sm:grid-cols-2 bg-muted/20">
                    {productDetailsList.map((clause) => {
                      const isSelected = isClauseSelected(clause)
                      return (
                        <div
                          key={clause}
                          className={cn(
                            'flex items-start gap-2 rounded px-2 py-1 text-xs transition-colors',
                            isSelected ? 'bg-primary/5 text-foreground font-medium' : 'text-muted-foreground',
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          ) : (
                            <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-muted-foreground/30 mt-0.5" />
                          )}
                          <span className={cn(!isSelected && 'text-muted-foreground line-through decoration-1')}>{clause}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Otomatik Sözleşme Şartları (@@ODEME, @@TESLIMAT vb.) */}
              {!factoryView && clauseNotes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('orders.form.previewSartlar')}</p>
                  <ul className="space-y-1 rounded-md border p-2.5 text-xs text-muted-foreground bg-muted/10">
                    {clauseNotes.map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span className="text-foreground">{resolveClause(t, d)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ek Notlar */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t('orders.form.freeNotes')}</p>
                {allFreeNotes.length > 0 ? (
                  <ul className="space-y-1 rounded-md border p-2.5 text-xs bg-muted/10">
                    {allFreeNotes.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <span className="text-primary font-bold shrink-0">•</span>
                        <span className="whitespace-pre-wrap">{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-dashed p-2.5 text-center text-xs text-muted-foreground italic">
                    {t('common.noData')}
                  </p>
                )}
              </div>
            </div>
          </CollapsibleSection>
        </div>

        <section {...sectionProps('flow')}>
          {sectionHeading('flow')}
          <DocumentFlow order={order} />
        </section>
      </div>
      {showCompleteModal && (
        <CompleteOrderModal
          open={showCompleteModal}
          onOpenChange={setShowCompleteModal}
          siparisNo={order.siparisNo}
          currentStage={order.siparisMiTeklifMi}
          musteriAd={order.musteriAd}
          toplamFiyat={order.toplamFiyat}
          odenenMiktar={order.odenenMiktar}
          paraTipi={order.paraTipi}
        />
      )}
      <AccountingFolderDialog siparisNo={folderOpen ? order.siparisNo : null} onClose={() => setFolderOpen(false)} />
    </div>
  )
}

function PriceBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded p-2 text-center ${highlight ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
      <p className="text-xs">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  )
}
