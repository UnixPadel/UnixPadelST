import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getAccountingOrders, addTransaction, uploadMuhasebeEk, downloadAccountingExcel,
  getTransactionsForOrder,
  submitMaliyetTalep, approveMuhasebeAndMoveToPlanning,
  type SubmitMaliyetRequest,
} from '@/api/accounting'
import { getOrderDetail } from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MuhasebeRowDetailDialog } from '@/components/MuhasebeRowDetailDialog'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { useToast } from '@/components/ToastProvider'
import { describeApiError } from '@/lib/axios'
import type { AccountingOrderListDto, AccountingTransactionDto, OrderDetail } from '@/types'

/**
 * PROMPT.md ACCOUNTING #14: legacy Muhasebe.cs 1:1 (logical) port.
 *
 * Layout — split: persistent top form (5 tabs) + bottom grid, both visible
 * at once like the legacy WinForms screen.
 *
 *   Top form (visible when a row is selected):
 *     • Sipariş Detayı        — order header, pricing, montaj/teslimat
 *     • Müşteri               — customer block
 *     • Teslimat              — delivery block
 *     • Satış Temsilcisi      — seller info + Ad Soyad
 *     • Maliyet               — editable Maliyet + Maliyet Notu + Talep Gönder
 *     + "Muhasebe Onayla" button in form chrome (gated)
 *
 *   Bottom grid:
 *     • Onaylanmış siparişler (Kontrol='Onay'), row colouring by muhasebeDurumu
 *     • Existing row actions preserved: Detay / Tahsilat Ekle / MuhasebeEk
 *     • Double-click row → MuhasebeRowDetailDialog (legacy MessageBox dump)
 */

// Currency dropdown set used by legacy (4 values). Unused directly but kept
// here so the future "filter by para tipi" lands without a re-look.
const _CURRENCIES = ['Euro', 'Dolar', 'TL', 'Sterlin']

// Row colouring per muhasebeDurumu — green/red/amber mirroring legacy
// SiparisAlDataGridRenklendir (lines 437-450).
function rowColourClass(durum?: string): string {
  if (durum === 'Onaylandı')   return 'bg-green-50  hover:bg-green-100'
  if (durum === 'Reddedildi')  return 'bg-rose-50   hover:bg-rose-100'
  if (durum === 'Onay Bekliyor') return 'bg-amber-50 hover:bg-amber-100'
  return ''
}

export function AccountingPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  // ── Selected row (drives top form) ────────────────────────────────────
  const [selectedNo, setSelectedNo] = useState<string | null>(null)
  const [doubleClickRow, setDoubleClickRow] = useState<AccountingOrderListDto | null>(null)

  // Existing modals (preserved)
  const [detailNo, setDetailNo] = useState<string | null>(null)
  const [txTarget, setTxTarget] = useState<AccountingOrderListDto | null>(null)
  const [txTutar, setTxTutar] = useState<number>(0)
  const [txTarih, setTxTarih] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [ekTarget, setEkTarget] = useState<string | null>(null)

  // Bottom-grid filter (kept from previous version)
  const [search, setSearch] = useState('')
  const [odemeDurum, setOdemeDurum] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // ── Data queries ──────────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
  })

  // Top-form source: full OrderDetail for the selected SiparisNo.
  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['order-detail', selectedNo],
    queryFn: () => getOrderDetail(selectedNo!),
    enabled: !!selectedNo,
  })

  // The selected row from the bottom grid (Maliyet / MuhasebeDurumu / Kontrol).
  const selectedRow = orders.find((o) => o.siparisNo === selectedNo) ?? null

  // Maliyet form state — initialised from the selected row's existing values.
  const [maliyetForm, setMaliyetForm] = useState<{ maliyet: number; maliyetDetayi: string }>({
    maliyet: 0, maliyetDetayi: '',
  })

  // Reset Maliyet inputs when selection changes. `selectedRow` is
  // intentionally NOT in the deps — re-fetched values from background
  // invalidations shouldn't clobber what the user is currently typing.
  useEffect(() => {
    setMaliyetForm({
      maliyet:       selectedRow?.maliyet ?? 0,
      maliyetDetayi: selectedRow?.maliyetDetayi ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNo])

  // ── Tahsilat / MuhasebeEk (existing) ──────────────────────────────────
  const { data: txForOrder = [] } = useQuery({
    queryKey: ['order-tx', txTarget?.siparisNo],
    queryFn: () => getTransactionsForOrder(txTarget!.siparisNo),
    enabled: !!txTarget,
  })

  const addMut = useMutation({
    mutationFn: () => addTransaction({
      siparisNo: txTarget!.siparisNo,
      odenenMiktar: txTutar,
      tarih: txTarih,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-orders'] })
      qc.invalidateQueries({ queryKey: ['order-tx', txTarget?.siparisNo] })
      qc.invalidateQueries({ queryKey: ['accounting-transactions'] })
      setTxTutar(0)
      toast({ title: t('common.success') })
    },
    onError: (e: unknown) => toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' }),
  })

  const uploadMut = useMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadMuhasebeEk(no, file),
    onSuccess: () => { toast({ title: t('common.success') }); setEkTarget(null) },
    onError: () => toast({ title: t('common.failed'), variant: 'destructive' }),
  })

  // ── #14 new mutations ─────────────────────────────────────────────────
  const maliyetMut = useMutation({
    mutationFn: () => {
      const body: SubmitMaliyetRequest = {
        maliyet: maliyetForm.maliyet,
        maliyetDetayi: maliyetForm.maliyetDetayi.trim() || undefined,
        toplamSiparis: selectedRow?.toplamFiyat ?? undefined,
        kaporaBakiyesi: selectedRow?.kaparoFiyat ?? undefined,
        kalanBakiyeTalep: selectedRow?.kalanBakiye ?? undefined,
        pesinYuzde: selectedRow?.pesinYuzde,
      }
      return submitMaliyetTalep(selectedNo!, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-orders'] })
      toast({ title: t('accountingFull.toast.maliyetSent') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  const approveMut = useMutation({
    mutationFn: () => approveMuhasebeAndMoveToPlanning(selectedNo!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-orders'] })
      setSelectedNo(null)
      toast({ title: t('accountingFull.toast.approved') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  // Muhasebe Onayla gate — legacy 2229-2245.
  const canApproveMuhasebe =
    !!selectedRow &&
    selectedRow.kontrol === 'Onay' &&
    selectedRow.siparisMiTeklifMi === 'Siparis'

  // ── Bottom grid columns (full legacy set) ─────────────────────────────
  const filtered = orders.filter((o) => {
    if (search && !o.siparisNo.toLowerCase().includes(search.toLowerCase()) &&
        !o.musteriAd.toLowerCase().includes(search.toLowerCase())) return false
    if (odemeDurum !== 'all' && o.odemeDurum !== odemeDurum) return false
    if (from && new Date(o.tarih) < new Date(from)) return false
    if (to && new Date(o.tarih) > new Date(to)) return false
    return true
  })

  const cols: Column<AccountingOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',     header: t('common.orderNo'),     sortable: true },
    { key: 'musteriAd',     header: t('common.customer'),    sortable: true },
    { key: 'mUlke',         header: t('common.country') },
    { key: 'sirket',        header: t('accountingFull.cols.sirket'),
      render: (r) => (r.sirket as string) ?? '—' },
    { key: 'paraTipi',      header: t('common.currency') },
    { key: 'toplamFiyat',   header: t('common.totalAmount'),
      render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'kaparoFiyat',   header: t('accountingFull.cols.kaparo'),
      render: (r) => formatCurrency((r.kaparoFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'kalanBakiye',   header: t('common.balance'),
      render: (r) => formatCurrency((r.kalanBakiye as number) ?? 0, r.paraTipi as string) },
    { key: 'pesinYuzde',    header: t('accountingFull.cols.pesinYuzde'),
      render: (r) => `%${r.pesinYuzde}` },
    { key: 'maliyet',       header: t('accountingFull.cols.maliyet'),
      render: (r) => r.maliyet != null ? formatCurrency(r.maliyet as number, r.paraTipi as string) : '—' },
    { key: 'kar',           header: t('accountingFull.cols.kar'),
      render: (r) => r.kar != null ? formatCurrency(r.kar as number, r.paraTipi as string) : '—' },
    { key: 'teslimatCesiti',header: t('accountingFull.cols.teslimatCesiti'),
      render: (r) => (r.teslimatCesiti as string) ?? '—' },
    { key: 'siparisMiTeklifMi', header: t('accountingFull.cols.asama'),
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'odemeDurum',    header: t('common.status'),
      render: (r) => r.odemeDurum ? <StatusBadge value={r.odemeDurum as string} /> : '—' },
    { key: 'muhasebeDurumu',header: t('accountingFull.cols.muhasebeDurum'),
      render: (r) => (r.muhasebeDurumu as string) ?? '—' },
    { key: 'tarih',         header: t('common.date'),
      render: (r) => formatDate((r.tarih as string) ?? '-') },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => (
        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>{t('common.details')}</Button>
          <Button size="sm" onClick={() => {
            setTxTarget(r as AccountingOrderListDto)
            setTxTutar(Number((r.kalanBakiye as number) ?? 0))
            setTxTarih(new Date().toISOString().slice(0, 10))
          }}>{t('common.add')}</Button>
          <Button size="sm" variant="outline" onClick={() => setEkTarget(r.siparisNo as string)}>{t('common.upload')}</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('accounting.title')}
        actions={<Button variant="outline" onClick={() => downloadAccountingExcel()}>{t('common.excel')}</Button>}
      />

      <div className="p-6 space-y-4">

        {/* ── TOP FORM (only when a row is selected) ──────────────────── */}
        {selectedNo && (
          <div className="rounded-md border bg-card">
            {/* Form chrome */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="text-sm">
                <span className="text-muted-foreground">{t('common.orderNo')}:</span>{' '}
                <span className="font-mono font-semibold">{selectedNo}</span>
                {detailLoading && <span className="ml-2 text-xs text-muted-foreground">({t('common.loading')})</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={!canApproveMuhasebe || approveMut.isPending}
                  title={canApproveMuhasebe ? undefined : t('accountingFull.disabled.approve')}
                  onClick={() => approveMut.mutate()}
                >
                  {t('accountingFull.actions.muhasebeOnayla')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedNo(null)}>
                  {t('common.close')} ✕
                </Button>
              </div>
            </div>

            <Tabs defaultValue="detay" className="p-4">
              <TabsList>
                <TabsTrigger value="detay">{t('accountingFull.tabs.detay')}</TabsTrigger>
                <TabsTrigger value="musteri">{t('accountingFull.tabs.musteri')}</TabsTrigger>
                <TabsTrigger value="teslimat">{t('accountingFull.tabs.teslimat')}</TabsTrigger>
                <TabsTrigger value="temsilci">{t('accountingFull.tabs.temsilci')}</TabsTrigger>
                <TabsTrigger value="maliyet">{t('accountingFull.tabs.maliyet')}</TabsTrigger>
              </TabsList>

              {/* Sipariş Detayı */}
              <TabsContent value="detay" className="mt-4">
                <DetailGrid order={orderDetail} row={selectedRow} />
              </TabsContent>

              {/* Müşteri */}
              <TabsContent value="musteri" className="mt-4">
                <KeyValueGrid pairs={[
                  ['Müşteri Adı',  orderDetail?.musteriAd],
                  ['Telefon',      orderDetail?.mTelefon],
                  ['E-posta',      orderDetail?.mMail],
                  ['Ülke',         orderDetail?.mUlke],
                  ['VAT',          orderDetail?.mVATNumarasi],
                  ['Posta Kodu',   orderDetail?.mZipKod],
                  ['Adres',        orderDetail?.mAdres],
                ]} />
              </TabsContent>

              {/* Teslimat */}
              <TabsContent value="teslimat" className="mt-4">
                <KeyValueGrid pairs={[
                  ['Teslim Alan',  orderDetail?.tTeslimAlanAdi],
                  ['İlgili Kişi',  orderDetail?.tIlgiliKisi],
                  ['Telefon',      orderDetail?.tTelefon],
                  ['Alt Telefon',  orderDetail?.tAltTelefon],
                  ['E-posta',      orderDetail?.tE_Mail],
                  ['VAT',          orderDetail?.tVATNumarasi],
                  ['Posta Kodu',   orderDetail?.tZipKod],
                  ['Ülke',         orderDetail?.tUlke],
                  ['Adres',        orderDetail?.tAdres],
                  ['Teslimat Çeşidi', orderDetail?.teslimatCesiti],
                ]} />
              </TabsContent>

              {/* Satış Temsilcisi */}
              <TabsContent value="temsilci" className="mt-4">
                <KeyValueGrid pairs={[
                  ['Ad Soyad',     orderDetail?.kullaniciAdi],
                  ['Telefon',      orderDetail?.sTelefon],
                  ['Fax',          orderDetail?.sFax],
                  ['Web',          orderDetail?.sWeb],
                  ['E-posta',      orderDetail?.sE_Mail],
                  ['VAT',          orderDetail?.sVatNumarasi],
                  ['Ülke',         orderDetail?.sUlke],
                  ['Adres',        orderDetail?.sAdres],
                ]} />
              </TabsContent>

              {/* Maliyet */}
              <TabsContent value="maliyet" className="mt-4 space-y-3 max-w-2xl">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('accountingFull.maliyet.maliyet')} ({selectedRow?.paraTipi ?? ''})</Label>
                    <DecimalInput
                      value={maliyetForm.maliyet}
                      onValueChange={(v) => setMaliyetForm((f) => ({ ...f, maliyet: v === '' ? 0 : v }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('accountingFull.maliyet.kar')}</Label>
                    <Input
                      value={selectedRow?.toplamFiyat != null
                        ? formatCurrency((selectedRow.toplamFiyat ?? 0) - maliyetForm.maliyet, selectedRow.paraTipi)
                        : ''}
                      readOnly disabled
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('accountingFull.maliyet.notu')}</Label>
                  <Textarea
                    rows={4}
                    value={maliyetForm.maliyetDetayi}
                    onChange={(e) => setMaliyetForm((f) => ({ ...f, maliyetDetayi: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    disabled={maliyetMut.isPending || maliyetForm.maliyet < 0}
                    onClick={() => maliyetMut.mutate()}
                  >
                    {maliyetMut.isPending ? t('common.saving') : t('accountingFull.actions.talepGonder')}
                  </Button>
                </div>
                {selectedRow?.muhasebeDurumu && (
                  <p className="text-xs text-muted-foreground">
                    {t('accountingFull.maliyet.lastStatus')}: <strong>{selectedRow.muhasebeDurumu}</strong>
                    {selectedRow.muhasebeRedNotu && <> — {selectedRow.muhasebeRedNotu}</>}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 items-end">
          <Input placeholder={t('common.quickFilter')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <select value={odemeDurum} onChange={(e) => setOdemeDurum(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
            <option value="all">{t('common.all')}</option>
            <option value="Beklemede">Beklemede</option>
            <option value="Ödendi">Ödendi</option>
          </select>
          <div className="flex items-center gap-1">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
            <span className="text-muted-foreground text-sm">—</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
        </div>

        {/* ── Bottom grid ────────────────────────────────────────────── */}
        <DataTable
          columns={cols}
          data={filtered as (AccountingOrderListDto & Record<string, unknown>)[]}
          keyField="siparisNo"
          loading={isLoading}
          onRowClick={(r) => setSelectedNo((r as AccountingOrderListDto).siparisNo)}
          rowClassName={(r) => cn(
            rowColourClass((r as AccountingOrderListDto).muhasebeDurumu),
            (r as AccountingOrderListDto).siparisNo === selectedNo && 'ring-2 ring-primary ring-inset',
          )}
          onRowDoubleClick={(r) => setDoubleClickRow(r as AccountingOrderListDto)}
        />
      </div>

      {/* ── Existing dialogs preserved ──────────────────────────────── */}

      {/* Tahsilat Ekle modal */}
      <Dialog open={!!txTarget} onOpenChange={() => setTxTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tahsilat — {txTarget?.siparisNo}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <div className="flex justify-between"><span>Toplam:</span><span>{formatCurrency(txTarget?.toplamFiyat ?? 0, txTarget?.paraTipi)}</span></div>
              <div className="flex justify-between"><span>Ödenen:</span><span>{formatCurrency(txTarget?.odenenMiktar ?? 0, txTarget?.paraTipi)}</span></div>
              <div className="flex justify-between font-semibold"><span>Kalan:</span><span>{formatCurrency(txTarget?.kalanBakiye ?? 0, txTarget?.paraTipi)}</span></div>
            </div>
            <div className="space-y-1">
              <Label>Tutar ({txTarget?.paraTipi})</Label>
              <DecimalInput value={txTutar} onValueChange={(v) => setTxTutar(v === '' ? 0 : v)} />
            </div>
            <div className="space-y-1">
              <Label>Tarih</Label>
              <Input type="date" value={txTarih} onChange={(e) => setTxTarih(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Önceki tahsilatlar:</Label>
              <div className="mt-1 max-h-40 overflow-y-auto rounded border">
                {txForOrder.length === 0
                  ? <p className="p-2 text-xs text-muted-foreground">Henüz tahsilat yok.</p>
                  : <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr><th className="text-left px-2 py-1">Tarih</th><th className="text-right px-2 py-1">Tutar</th></tr>
                      </thead>
                      <tbody>
                        {txForOrder.map((tx: AccountingTransactionDto) => (
                          <tr key={tx.id} className="border-t">
                            <td className="px-2 py-1">{formatDate(tx.tarih)}</td>
                            <td className="text-right px-2 py-1">{formatCurrency(tx.odenenMiktar ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxTarget(null)}>Kapat</Button>
            <Button disabled={txTutar <= 0 || addMut.isPending} onClick={() => addMut.mutate()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MuhasebeEk uploader */}
      <Dialog open={!!ekTarget} onOpenChange={() => setEkTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>MuhasebeEk — {ekTarget}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Dosya (PDF/ZIP/JPG…)</Label>
            <input type="file" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && ekTarget) uploadMut.mutate({ no: ekTarget, file: f })
            }} />
            <p className="text-xs text-muted-foreground">
              SiparisAlTablo.MuhasebeEk kolonuna BLOB olarak yüklenir.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
      <MuhasebeRowDetailDialog row={doubleClickRow} onClose={() => setDoubleClickRow(null)} />
    </div>
  )
}

// ── Tab content helpers ─────────────────────────────────────────────────

function KeyValueGrid({ pairs }: { pairs: Array<[string, React.ReactNode]> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
      {pairs.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium break-words">{v || '—'}</span>
        </div>
      ))}
    </div>
  )
}

function DetailGrid({ order, row }: { order?: OrderDetail; row: AccountingOrderListDto | null }) {
  if (!order && !row) return <p className="text-sm text-muted-foreground">—</p>
  const pt = row?.paraTipi ?? order?.paraTipi ?? ''
  return (
    <KeyValueGrid pairs={[
      ['Sipariş No',       order?.siparisNo],
      ['Sipariş Notu',     order?.siparisNotu],
      ['Para Tipi',        order?.paraTipi],
      ['Toplam Fiyat',     order?.toplamFiyat != null ? formatCurrency(order.toplamFiyat ?? 0, pt) : null],
      ['Brüt Toplam',      order?.brutToplamFiyat != null ? formatCurrency(order.brutToplamFiyat ?? 0, pt) : null],
      ['İndirim',          order?.indirim != null ? `%${order.indirim}` : null],
      ['KDV',              order?.kdv != null ? `%${order.kdv}` : null],
      ['Peşin Yüzde',      order?.pesinYuzde != null ? `%${order.pesinYuzde}` : null],
      ['Teslimat Çeşidi',  order?.teslimatCesiti],
      ['Montaj',           order?.montajVar ? 'Var' : 'Yok'],
      ['Montaj Fiyat',     order?.montajFiyat != null ? formatCurrency(order.montajFiyat ?? 0, pt) : null],
      ['Teslimat',         order?.teslimatVar ? 'Var' : 'Yok'],
      ['Teslimat Fiyat',   order?.teslimatFiyat != null ? formatCurrency(order.teslimatFiyat ?? 0, pt) : null],
      ['Şirket',           order?.sirket],
      ['Kapora Bakiyesi',  row?.kaparoFiyat != null ? formatCurrency(row.kaparoFiyat ?? 0, pt) : null],
      ['Kalan Bakiye',     row?.kalanBakiye != null ? formatCurrency(row.kalanBakiye ?? 0, pt) : null],
    ]} />
  )
}

