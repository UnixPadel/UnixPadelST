import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getAccountingOrders, getTransactionsForOrder,
  approveMuhasebeAndMoveToPlanning, approveLogistics,
  submitMaliyetTalep, uploadMuhasebeEk,
  type SubmitMaliyetRequest,
} from '@/api/accounting'
import { getOrderDetail, downloadAttachment, downloadExcel } from '@/api/orders'
import { DataTable, type Column } from '@/components/DataTable'
import { DecimalInput } from '@/components/DecimalInput'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { describeApiError } from '@/lib/axios'
import { formatDate, formatDateShort, formatCurrency, cn } from '@/lib/utils'
import type { AccountingOrderListDto } from '@/types'

/**
 * PROMPT-v6 §1.2 — burcu.karaman Muhasebe onay ekranı (legacy Muhasebe.cs
 * yerleşiminin portu; Kontrol ekranındaki v5 düzeniyle aynı ruh):
 * üstte detay sekmeleri + Özet + Cari aksiyon kartları, altta tam genişlik
 * master grid.
 *
 * Erişim: yalnız burcu.karaman (route RoleGuard + backend username gate'leri).
 *
 * Üç-aşamalı onay zinciri içindeki rolü:
 *   elshan Onayla → Kontrol='Onay' (aşama Siparis kalır) → Cari Onay kuyruğu
 *   Burcu Cari Onayla → Siparis → Planlama → Fabrika kuyruğu (simge.cakir)
 *   simge Hazır → LojistikOnay='Bekliyor' → Lojistik Onay kuyruğu
 *   Burcu Lojistik Onayla → LojistikOnay='Onay' → /logistics/ready listesi
 */

// Master grid görünümleri: 2 kuyruk + legacy hızlı filtre üçlüsü
// (siparisAlDataGridHepsi/Beklenen/Onaylanan_Click, Muhasebe.cs 1206/1267/1328).
type ViewId = 'cariQueue' | 'lojistikQueue' | 'hepsi' | 'beklenen' | 'onaylanan'

const VIEWS: ViewId[] = ['cariQueue', 'lojistikQueue', 'hepsi', 'beklenen', 'onaylanan']

function matchesView(o: AccountingOrderListDto, view: ViewId): boolean {
  switch (view) {
    // Kontrol='Onay' listede zaten garanti (GetAccountingOrdersAsync filtresi).
    case 'cariQueue':     return o.siparisMiTeklifMi === 'Siparis'
    case 'lojistikQueue': return o.siparisMiTeklifMi === 'Hazir' && o.lojistikOnay === 'Bekliyor'
    case 'hepsi':         return o.siparisMiTeklifMi !== 'Teklif'
    case 'beklenen':      return o.odemeDurum === 'Beklemede' && o.siparisMiTeklifMi === 'Siparis'
    case 'onaylanan':     return o.odemeDurum === 'Ödendi' && o.siparisMiTeklifMi === 'Siparis'
  }
}

// ── Kompakt read-only alanlar (v5 Kontrol kalıbı) ────────────────────────────

function ROField({ label, value, multiline = false, className }: {
  label: string
  value?: string | null
  multiline?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-0.5 min-w-0', className)}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      {multiline ? (
        <div className="rounded border bg-muted/40 px-1.5 py-1 text-xs whitespace-pre-wrap break-words min-h-[2.5rem] max-h-20 overflow-y-auto">
          {value || '—'}
        </div>
      ) : (
        <div className="rounded border bg-muted/40 px-1.5 py-1 text-xs truncate" title={value ?? undefined}>
          {value || '—'}
        </div>
      )}
    </div>
  )
}

function CariRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground text-right truncate">{label}</span>
      {children}
    </div>
  )
}

function CariValue({ value }: { value?: string | null }) {
  return (
    <div className="rounded border bg-muted/40 px-1.5 py-1 text-xs min-h-[1.6rem] truncate" title={value ?? undefined}>
      {value || '—'}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccountingApprovalPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [view, setView] = useState<ViewId>('cariQueue')
  const [selected, setSelected] = useState<string | null>(null)
  const [formNo, setFormNo] = useState<string | null>(null)
  const [ekTarget, setEkTarget] = useState<string | null>(null)

  // araButtonInTab çoklu filtre alanları (Muhasebe.cs :567)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Maliyet talebi formu (legacy odmeButton "Talep Gönder")
  const [maliyetForm, setMaliyetForm] = useState<{ maliyet: number; maliyetDetayi: string }>({
    maliyet: 0, maliyetDetayi: '',
  })

  // ── Veri ────────────────────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
    // v5 §3 kalıbı — elshan onayı / simge Hazır geçişi Burcu kuyruğuna
    // ≤30 sn'de veya sekme odağında anında düşsün.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  })

  const selectedRow = orders.find((o) => o.siparisNo === selected) ?? null

  const { data: detail } = useQuery({
    queryKey: ['order-detail', selected],
    queryFn: () => getOrderDetail(selected!),
    enabled: !!selected,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['acc-approval-tx', selected],
    queryFn: () => getTransactionsForOrder(selected!),
    enabled: !!selected,
  })

  // Seçim değişince Maliyet inputları satırdaki değerlerden yenilenir;
  // arka plan invalidation'ları kullanıcının yazdığını ezmesin diye yalnız
  // `selected` dep'i var (AccountingPage kalıbı).
  useEffect(() => {
    setMaliyetForm({
      maliyet:       selectedRow?.maliyet ?? 0,
      maliyetDetayi: selectedRow?.maliyetDetayi ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const rows = useMemo(() => orders.filter((o) => {
    if (!matchesView(o, view)) return false
    if (search) {
      const s = search.toLowerCase()
      if (!o.siparisNo.toLowerCase().includes(s) && !o.musteriAd.toLowerCase().includes(s)) return false
    }
    if (from && new Date(o.tarih) < new Date(from)) return false
    if (to && new Date(o.tarih) > new Date(to)) return false
    return true
  }), [orders, view, search, from, to])

  // Kuyruk sayaçları (sekme başlıklarında gösterilir)
  const cariCount = useMemo(() => orders.filter((o) => matchesView(o, 'cariQueue')).length, [orders])
  const lojCount  = useMemo(() => orders.filter((o) => matchesView(o, 'lojistikQueue')).length, [orders])

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['accounting-orders'] })
    qc.invalidateQueries({ queryKey: ['order-detail'] })
    qc.invalidateQueries({ queryKey: ['acc-approval-tx'] })
    // PROMPT-v5 §3 — aşama geçişleri Siparişlerim'e ≤30 sn'de yansısın.
    qc.invalidateQueries({ queryKey: ['my-orders'] })
    qc.invalidateQueries({ queryKey: ['factory'] })
    qc.invalidateQueries({ queryKey: ['logistics-ready'] })
  }

  const requireSelection = (): string | null => {
    if (!selected) {
      toast({ title: t('accApproval.selectFirst'), variant: 'destructive' })
      return null
    }
    return selected
  }

  // ── Mutations ───────────────────────────────────────────────────────────
  const cariMut = useMutation({
    mutationFn: (no: string) => approveMuhasebeAndMoveToPlanning(no),
    onSuccess: () => {
      refreshAll(); setSelected(null)
      toast({ title: t('accApproval.toast.cariApproved') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  const lojMut = useMutation({
    mutationFn: (no: string) => approveLogistics(no),
    onSuccess: () => {
      refreshAll(); setSelected(null)
      toast({ title: t('accApproval.toast.logisticsApproved') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  const maliyetMut = useMutation({
    mutationFn: (no: string) => {
      const body: SubmitMaliyetRequest = {
        maliyet: maliyetForm.maliyet,
        maliyetDetayi: maliyetForm.maliyetDetayi.trim() || undefined,
        toplamSiparis: selectedRow?.toplamFiyat ?? undefined,
        kaporaBakiyesi: selectedRow?.kaparoFiyat ?? undefined,
        kalanBakiyeTalep: selectedRow?.kalanBakiye ?? undefined,
        pesinYuzde: selectedRow?.pesinYuzde,
      }
      return submitMaliyetTalep(no, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-orders'] })
      toast({ title: t('accountingFull.toast.maliyetSent') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  const uploadMut = useMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadMuhasebeEk(no, file),
    onSuccess: () => { toast({ title: t('common.success') }); setEkTarget(null) },
    onError: () => toast({ title: t('common.failed'), variant: 'destructive' }),
  })

  // ── Aksiyon handler'ları ────────────────────────────────────────────────
  const handleAttachment = async (type: 'ek' | 'muhasebeek') => {
    const no = requireSelection()
    if (!no) return
    try {
      await downloadAttachment(no, type)
    } catch {
      toast({ title: t('qc.attachmentNotFound'), variant: 'destructive' })
    }
  }

  const handleExcel = async () => {
    const no = requireSelection()
    if (!no) return
    try {
      await downloadExcel(no)
    } catch (e) {
      toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }) }
  }

  // Seçili satırın kuyruğuna göre tek bağlamsal onay aksiyonu.
  const canCari = !!selectedRow && matchesView(selectedRow, 'cariQueue')
  const canLoj  = !!selectedRow && matchesView(selectedRow, 'lojistikQueue')

  // ── Master grid kolonları ───────────────────────────────────────────────
  const columns: Column<AccountingOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo', header: t('qc.grid.siparisNo'), sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.siparisNo as string}</span> },
    { key: 'musteriAd', header: t('qc.grid.musteriAd'), sortable: true },
    { key: 'mUlke', header: t('qc.grid.ulke'), sortable: true },
    { key: 'toplamFiyat', header: t('qc.grid.toplamSiparis'), sortable: true,
      render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'kaparoFiyat', header: t('qc.grid.kaparoBakiyesi'), sortable: true,
      render: (r) => formatCurrency((r.kaparoFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'kalanBakiye', header: t('qc.grid.kalanBakiye'), sortable: true,
      render: (r) => formatCurrency((r.kalanBakiye as number) ?? 0, r.paraTipi as string) },
    { key: 'pesinYuzde', header: t('qc.grid.pesinYuzde'), sortable: true,
      render: (r) => `%${r.pesinYuzde}` },
    { key: 'paraTipi', header: t('qc.grid.paraTipi'), sortable: true },
    { key: 'odemeDurum', header: t('qc.grid.odemeDurumu'), sortable: true,
      render: (r) => (r.odemeDurum as string) || '' },
    { key: 'siparisMiTeklifMi', header: t('qc.grid.asama'), sortable: true,
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'kuyruk', header: t('accApproval.grid.kuyruk'),
      render: (r) => {
        const o = r as AccountingOrderListDto
        if (matchesView(o, 'cariQueue')) return <span className="text-xs font-medium text-amber-600">{t('accApproval.queueBadge.cari')}</span>
        if (matchesView(o, 'lojistikQueue')) return <span className="text-xs font-medium text-sky-600">{t('accApproval.queueBadge.lojistik')}</span>
        return <span className="text-xs text-muted-foreground">—</span>
      } },
    // §6 — yoğun grid: kısa tarih (dd.MM.yy)
    { key: 'tarih', header: t('qc.grid.tarih'), sortable: true,
      render: (r) => formatDateShort(r.tarih as string) },
  ]

  const d = detail
  const toplam = selectedRow?.toplamFiyat ?? d?.toplamFiyat ?? 0
  const pt = selectedRow?.paraTipi ?? d?.paraTipi ?? ''
  const pesinYuzde = selectedRow?.pesinYuzde ?? d?.pesinYuzde ?? 0
  const brutKapora = (toplam * pesinYuzde) / 100

  const sortedTx = useMemo(
    () => [...transactions].sort((a, b) => (b.tarih ?? '').localeCompare(a.tarih ?? '')),
    [transactions],
  )

  return (
    <div className="flex h-full flex-col">
      {/* ── Kompakt başlık ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <h1 className="text-base font-semibold">{t('accApproval.title')}</h1>
        <p className="text-xs text-muted-foreground">
          {t('accApproval.queueCounts', { cari: cariCount, lojistik: lojCount })}
        </p>
      </div>

      {/* ── Üst bölge: detay sekmeleri + Özet + Cari (scroll'suz, doğal yükseklik) ── */}
      <div className="flex shrink-0 flex-wrap gap-2 px-4 py-2 xl:flex-nowrap">

        {/* 1 — Detay sekmeleri (legacy tabControl2 sırası) */}
        <div className="flex min-w-0 flex-1 basis-full flex-col rounded-md border p-2 xl:basis-auto">
          <Tabs defaultValue="muhasebe" className="flex flex-1 flex-col">
            <TabsList className="h-8 w-full shrink-0 justify-start overflow-x-auto">
              <TabsTrigger className="px-2 py-1 text-xs" value="muhasebe">{t('qc.tabs.muhasebeGecmisi')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="detay">{t('qc.tabs.detay')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="musteri">{t('qc.tabs.musteri')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="teslimat">{t('qc.tabs.teslimat')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="temsilci">{t('qc.tabs.satisTemsilcisi')}</TabsTrigger>
            </TabsList>

            {/* Muhasebe Geçmişi — siparişin tahsilat satırları */}
            <TabsContent value="muhasebe">
              <div className="max-h-56 overflow-y-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.musteriAdi')}</th>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.ulke')}</th>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.paraTuru')}</th>
                      <th className="px-2 py-1 text-right font-medium">{t('qc.tx.odenenBakiye')}</th>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.tarih')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedRow || sortedTx.length === 0 ? (
                      <tr><td colSpan={5} className="px-2 py-2 text-muted-foreground">{t('common.noData')}</td></tr>
                    ) : sortedTx.map((tx) => (
                      <tr key={tx.id} className="border-t">
                        <td className="px-2 py-1">{selectedRow.musteriAd}</td>
                        <td className="px-2 py-1">{selectedRow.mUlke ?? ''}</td>
                        <td className="px-2 py-1">{pt}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(tx.odenenMiktar ?? 0, pt)}</td>
                        <td className="px-2 py-1">{formatDate(tx.tarih)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Detay — DetayTablo satırları + Ürün & Bileşen */}
            <TabsContent value="detay" className="space-y-2">
              <div>
                <p className="mb-1 text-xs font-semibold">{t('qc.blocks.detay')}</p>
                <div className="max-h-32 overflow-y-auto rounded border">
                  {!d || d.details.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">{t('common.noData')}</p>
                  ) : (
                    <ul className="divide-y">
                      {d.details.map((line, i) => (
                        <li key={i} className="px-2 py-1 text-xs">{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold">{t('qc.blocks.urunBilesen')}</p>
                <div className="max-h-40 overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.kategori')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.oznitelik')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.bilesenAdi')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.birim')}</th>
                        <th className="px-2 py-1 text-right font-medium">{t('qc.items.adet')}</th>
                        <th className="px-2 py-1 text-right font-medium">{t('qc.items.fiyat')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!d || d.items.length === 0 ? (
                        <tr><td colSpan={6} className="px-2 py-2 text-muted-foreground">{t('common.noData')}</td></tr>
                      ) : d.items.map((i, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1">{i.kategoriAdi ?? ''}</td>
                          <td className="px-2 py-1">{i.oznitelikAdi ?? ''}</td>
                          <td className="px-2 py-1">{i.bilesenAdi ?? ''}</td>
                          <td className="px-2 py-1">{i.birim ?? ''}</td>
                          <td className="px-2 py-1 text-right">{i.adet}</td>
                          {/* Legacy quirk: bileşen satırlarında Fiyat hücresi boş */}
                          <td className="px-2 py-1 text-right">
                            {i.bilesenAdi ? '' : formatCurrency(i.fiyat ?? 0, pt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Müşteri */}
            <TabsContent value="musteri">
              <div className="grid grid-cols-3 gap-1.5">
                <ROField label={t('qc.fields.isim')} value={d?.musteriAd} />
                <ROField label={t('qc.fields.telefon')} value={d?.mTelefon} />
                <ROField label={t('qc.fields.ulke')} value={d?.mUlke} />
                <ROField label={t('qc.fields.zipKodu')} value={d?.mZipKod} />
                <ROField label={t('qc.fields.email')} value={d?.mMail} />
                <ROField label={t('qc.fields.vat')} value={d?.mVATNumarasi} />
                <ROField label={t('qc.fields.adres')} value={d?.mAdres} multiline className="col-span-3" />
              </div>
            </TabsContent>

            {/* Teslimat */}
            <TabsContent value="teslimat">
              <div className="grid grid-cols-3 gap-1.5">
                <ROField label={t('qc.fields.teslimAlanAdi')} value={d?.tTeslimAlanAdi} />
                <ROField label={t('qc.fields.ilgiliKisi')} value={d?.tIlgiliKisi} />
                <ROField label={t('qc.fields.ulke')} value={d?.tUlke} />
                <ROField label={t('qc.fields.telefon')} value={d?.tTelefon} />
                <ROField label={t('qc.fields.altTelefon')} value={d?.tAltTelefon} />
                <ROField label={t('qc.fields.email')} value={d?.tE_Mail} />
                <ROField label={t('qc.fields.zipKodu')} value={d?.tZipKod} />
                <ROField label={t('qc.fields.vat')} value={d?.tVATNumarasi} />
                <ROField label={t('qc.fields.adres')} value={d?.tAdres} multiline className="col-span-3" />
              </div>
            </TabsContent>

            {/* Satış Temsilcisi */}
            <TabsContent value="temsilci">
              <div className="grid grid-cols-3 gap-1.5">
                <ROField label={t('qc.fields.temsilciAdi')} value={d?.kullaniciAdi} />
                <ROField label={t('qc.fields.telefon')} value={d?.sTelefon} />
                <ROField label={t('qc.fields.fax')} value={d?.sFax} />
                <ROField label={t('qc.fields.web')} value={d?.sWeb} />
                <ROField label={t('qc.fields.email')} value={d?.sE_Mail} />
                <ROField label={t('qc.fields.vat')} value={d?.sVatNumarasi} />
                <ROField label={t('qc.fields.ulke')} value={d?.sUlke} />
                <ROField label={t('qc.fields.adres')} value={d?.sAdres} multiline className="col-span-3" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 2 — Özet kartı (legacy ozetTabPage) */}
        <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-md border p-2 sm:w-[300px]">
          <p className="text-sm font-semibold text-center">{t('accApproval.blocks.ozet')}</p>
          <div className="grid grid-cols-2 gap-1.5">
            <ROField label={t('qc.fields.siparisNo')} value={selected} />
            <ROField label={t('accApproval.fields.teslimatCesiti')}
              value={selectedRow ? (selectedRow.teslimatCesiti || t('qc.grid.veriYok')) : null} />
            <ROField label={t('qc.grid.kalanBakiye')}
              value={selectedRow ? formatCurrency(selectedRow.kalanBakiye ?? 0, pt) : null} />
            <ROField label={t('accApproval.fields.kapora')}
              value={selectedRow ? formatCurrency(selectedRow.kaparoFiyat ?? 0, pt) : null} />
            <ROField label={t('accApproval.fields.brutKapora')}
              value={selectedRow ? formatCurrency(brutKapora, pt) : null} />
            <ROField label={t('qc.fields.indirimYuzde')}
              value={d?.indirim != null ? `%${d.indirim}` : null} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={d?.montajVar ?? false} disabled readOnly /> {t('qc.fields.montaj')}
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={d?.teslimatVar ?? false} disabled readOnly /> {t('qc.fields.teslimat')}
            </label>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <span>{t('qc.fields.montajFiyati')}: {d ? formatCurrency(d.montajFiyat ?? 0, pt) : '—'}</span>
            <span>{t('qc.fields.teslimatFiyati')}: {d ? formatCurrency(d.teslimatFiyat ?? 0, pt) : '—'}</span>
          </div>
          <ROField label={t('accApproval.fields.siparisNotu')} value={d?.siparisNotu} multiline />
          <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { if (requireSelection()) setFormNo(selected) }}>
              {t('qc.actions.formGetir')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExcel}>
              {t('qc.actions.excelYaz')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAttachment('ek')}>
              {t('qc.actions.saticiEk')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { if (requireSelection()) setEkTarget(selected) }}>
              {t('qc.actions.muhasebeEk')}
            </Button>
          </div>
        </div>

        {/* 3 — Cari kartı (legacy tabPage5 "Cari") + onay aksiyonları */}
        <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-md border p-2 sm:w-[320px]">
          <p className="text-sm font-semibold text-center">{t('qc.blocks.cariBilgiler')}</p>
          <CariRow label={t('qc.fields.siparisToplam')}>
            <CariValue value={selectedRow ? formatCurrency(toplam, pt) : ''} />
          </CariRow>
          <CariRow label={t('qc.fields.paraBirimi')}>
            <CariValue value={pt || null} />
          </CariRow>
          <CariRow label={t('qc.fields.kaparoBakiye')}>
            <div className="flex gap-1">
              <div className="w-14 rounded border bg-muted/40 px-1.5 py-1 text-center text-xs min-h-[1.6rem]">
                {selectedRow ? `%${pesinYuzde}` : '—'}
              </div>
              <div className="min-w-0 flex-1 rounded border bg-muted/40 px-1.5 py-1 text-xs min-h-[1.6rem] truncate">
                {selectedRow ? formatCurrency(selectedRow.kaparoFiyat ?? 0, pt) : '—'}
              </div>
            </div>
          </CariRow>
          <CariRow label={t('qc.fields.siparisBakiye')}>
            <CariValue value={selectedRow ? formatCurrency(Math.max(selectedRow.kalanBakiye ?? 0, 0), pt) : ''} />
          </CariRow>
          <CariRow label={t('accountingFull.maliyet.maliyet')}>
            <DecimalInput className="h-7 text-xs" value={maliyetForm.maliyet}
              onValueChange={(v) => setMaliyetForm((f) => ({ ...f, maliyet: v === '' ? 0 : v }))} />
          </CariRow>
          <Textarea
            className="min-h-[3rem] resize-none text-xs"
            placeholder={t('accountingFull.maliyet.notu')}
            value={maliyetForm.maliyetDetayi}
            onChange={(e) => setMaliyetForm((f) => ({ ...f, maliyetDetayi: e.target.value }))}
          />
          <Button size="sm" variant="outline" className="h-7 text-xs"
            disabled={maliyetMut.isPending || maliyetForm.maliyet < 0}
            onClick={() => { const no = requireSelection(); if (no) maliyetMut.mutate(no) }}>
            {t('accountingFull.actions.talepGonder')}
          </Button>
          {selectedRow?.muhasebeDurumu && (
            <p className="text-[10px] text-muted-foreground">
              {t('accountingFull.maliyet.lastStatus')}: <strong>{selectedRow.muhasebeDurumu}</strong>
              {selectedRow.muhasebeRedNotu && <> — {selectedRow.muhasebeRedNotu}</>}
            </p>
          )}
          {/* Kuyruğa göre bağlamsal onay aksiyonu */}
          <div className="mt-auto space-y-1 pt-1">
            {canLoj ? (
              <Button size="sm" className="h-8 w-full text-xs"
                disabled={lojMut.isPending}
                onClick={() => { const no = requireSelection(); if (no) lojMut.mutate(no) }}>
                {t('accApproval.actions.lojistikOnayla')}
              </Button>
            ) : (
              <Button size="sm" className="h-8 w-full text-xs"
                disabled={!canCari || cariMut.isPending}
                title={canCari ? undefined : t('accApproval.disabled.cari')}
                onClick={() => { const no = requireSelection(); if (no) cariMut.mutate(no) }}>
                {t('accApproval.actions.cariOnayla')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Alt bölge: kuyruk seçici + filtreler + master grid ──────────── */}
      <div className="min-h-0 flex-1 space-y-2 px-4 pb-2">
        <div className="flex flex-wrap items-end gap-2">
          {/* Kuyruk seçici + legacy hızlı filtre üçlüsü */}
          <div className="flex flex-wrap gap-1">
            {VIEWS.map((v) => (
              <Button key={v} size="sm"
                variant={view === v ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => { setView(v); setSelected(null) }}>
                {t(`accApproval.views.${v}`)}
                {v === 'cariQueue' && cariCount > 0 && ` (${cariCount})`}
                {v === 'lojistikQueue' && lojCount > 0 && ` (${lojCount})`}
              </Button>
            ))}
          </div>
          <Input placeholder={t('common.quickFilter')} value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-7 max-w-[200px] text-xs" />
          <div className="flex items-center gap-1">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 w-32 text-xs" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-7 w-32 text-xs" />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows as (AccountingOrderListDto & Record<string, unknown>)[]}
          keyField="siparisNo"
          loading={isLoading}
          density="compact"
          onRowClick={(r) => setSelected((r as AccountingOrderListDto).siparisNo)}
          // v5 §5 kararı: satır renklendirmesi yok — yalnız seçili satır vurgusu.
          rowClassName={(r) => cn(
            (r as AccountingOrderListDto).siparisNo === selected && 'ring-2 ring-primary ring-inset',
          )}
        />
      </div>

      {/* MuhasebeEk uploader (AccountingPage kalıbı) */}
      <Dialog open={!!ekTarget} onOpenChange={() => setEkTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('qc.actions.muhasebeEk')} — {ekTarget}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t('accApproval.fields.dosya')}</Label>
            <input type="file" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && ekTarget) uploadMut.mutate({ no: ekTarget, file: f })
            }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Form'u getir — salt-okunur sipariş formu */}
      <OrderDetailModal siparisNo={formNo} onClose={() => setFormNo(null)} />
    </div>
  )
}
