import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getMyOrders, convertToOrder, getRejectionNote, deleteOrder,
} from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { OrderKontrolBadge } from '@/components/OrderKontrolBadge'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { describeApiError } from '@/lib/axios'
import { formatDate } from '@/lib/utils'
import type { OrderListDto } from '@/types'

/**
 * PROMPT.md #20: Siparişlerim ekranı — port of legacy Siparislerim.cs.
 *
 * List: GET /api/orders/my (backend filters on JWT user id).
 *
 * Row actions (validity rules mirror the legacy CellContentClick checks):
 *   Form Göster   — always available, opens OrderDetailModal.
 *   Siparişe Çevir — only when siparisMiTeklifMi==='Teklif' AND kontrol !== 'Reddet'.
 *   Red Notu      — only when kontrol==='Reddet'; opens a dialog with the Red text.
 *   Revize        — only when siparisMiTeklifMi in {Teklif, Siparis} AND kontrol !== 'Onay';
 *                   navigates to /orders/new?revise={no}. NewOrderPage pre-loads the
 *                   order and swaps the save mutation to reviseOrder.
 *
 * Disabled buttons render with a title= tooltip so users know why an action
 * isn't available (matches the "disabled-with-tooltip" choice from prompt #20).
 */

function rowNo(r: OrderListDto): string {
  return r.siparisMiTeklifMi === 'Siparis' ? r.siparisNo : r.teklifNo
}

export function MyOrdersPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { getUser } = useAuth()
  // PROMPT-v4 §6.2 — elshan.rasulov tüm sistemi izler; sahip (Temsilci) kolonu
  // yalnız ona görünür (backend /my zaten tüm satırları döner).
  const isGlobalViewer = getUser()?.kullaniciAdi === 'elshan.rasulov'

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders(),
    // PROMPT-v5 §3 — canlı izleme: başka kullanıcıların (Kontrol onayı, Fabrika
    // aşama geçişi, lojistik) statü değişimleri ≤30 sn'de veya sekme odağında
    // anında yansır; websocket/polling altyapısı gerekmez.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  })

  // ── Form Göster modal target ───────────────────────────────────────────
  const [detailNo, setDetailNo] = useState<string | null>(null)

  // ── Red Notu dialog ────────────────────────────────────────────────────
  const [redTarget, setRedTarget] = useState<string | null>(null)
  const { data: redData, isLoading: redLoading } = useQuery({
    queryKey: ['order-rejection-note', redTarget],
    queryFn: () => getRejectionNote(redTarget!),
    enabled: !!redTarget,
  })

  // ── Siparişe Çevir mutation ────────────────────────────────────────────
  const convertMut = useMutation({
    mutationFn: (teklifNo: string) => convertToOrder(teklifNo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      toast({ title: t('myOrders.toast.converted') })
    },
    onError: (e) => toast({
      title: t('myOrders.toast.convertFailed'),
      description: describeApiError(e),
      variant: 'destructive',
    }),
  })

  // ── Round-8 §7 — yumuşak silme dialog + mutation ───────────────────────
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const deleteMut = useMutation({
    mutationFn: ({ no, gerekce }: { no: string; gerekce: string }) => deleteOrder(no, gerekce),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      setDeleteTarget(null); setDeleteReason('')
      toast({ title: t('myOrders.toast.deleted') })
    },
    onError: (e) => toast({ title: t('myOrders.toast.deleteFailed'), description: describeApiError(e), variant: 'destructive' }),
  })

  // ── Validity helpers (legacy rules) ────────────────────────────────────
  const canConvert = (r: OrderListDto) =>
    r.siparisMiTeklifMi === 'Teklif' && r.kontrol !== 'Reddet'
  const canShowRedNote = (r: OrderListDto) => r.kontrol === 'Reddet'
  const canRevise = (r: OrderListDto) =>
    (r.siparisMiTeklifMi === 'Teklif' || r.siparisMiTeklifMi === 'Siparis') &&
    r.kontrol !== 'Onay'
  // §7 — Kontrol onayı öncesi + silinmemiş düzenlenebilir/silinebilir.
  const canEditDelete = (r: OrderListDto) => r.kontrol !== 'Onay' && !r.silindi

  const cols: Column<OrderListDto & Record<string, unknown>>[] = [
    { key: 'numara', header: t('myOrders.cols.numara'), sortable: true,
      render: (r) => {
        const o = r as OrderListDto
        return (
          <span className="flex items-center gap-1.5">
            <span className={`font-mono text-sm ${o.silindi ? 'line-through text-muted-foreground' : ''}`}>{rowNo(o)}</span>
            {o.silindi && (
              <span title={o.degisiklikGerekce ?? undefined}
                className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 border border-red-200">
                {t('myOrders.badge.silindi')}
              </span>
            )}
            {!o.silindi && o.guncellendi && (
              <span title={o.degisiklikGerekce ?? undefined}
                className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                {t('myOrders.badge.guncellendi')}
              </span>
            )}
          </span>
        )
      } },
    { key: 'musteriAd', header: t('myOrders.cols.musteriAd'), sortable: true },
    // PROMPT-v4 §6.2 — sahip kolonu yalnız elshan görünümünde
    ...(isGlobalViewer ? [{
      key: 'kullaniciAdSoyad',
      header: t('myOrders.cols.temsilci'),
      sortable: true,
      render: (r) => (r.kullaniciAdSoyad as string) || '—',
    } satisfies Column<OrderListDto & Record<string, unknown>>] : []),
    { key: 'siparisMiTeklifMi', header: t('myOrders.cols.asama'),
      render: (r) => <StatusBadge value={(r.siparisMiTeklifMi as string) ?? ''} /> },
    { key: 'kontrol', header: t('myOrders.cols.durum'),
      render: (r) => <OrderKontrolBadge value={r.kontrol as string} /> },
    { key: 'tarih', header: t('myOrders.cols.tarih'), sortable: true,
      render: (r) => formatDate(r.tarih as string) },
    {
      key: 'actions',
      header: t('myOrders.cols.actions'),
      render: (rr) => {
        const r = rr as OrderListDto
        const no = rowNo(r)
        return (
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setDetailNo(no)}>
              {t('myOrders.actions.formGoster')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canConvert(r) || convertMut.isPending}
              title={canConvert(r) ? undefined : t('myOrders.disabled.convert')}
              onClick={() => convertMut.mutate(no)}
            >
              {t('myOrders.actions.sipariseCevir')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canShowRedNote(r)}
              title={canShowRedNote(r) ? undefined : t('myOrders.disabled.redNote')}
              onClick={() => setRedTarget(no)}
            >
              {t('myOrders.actions.redNotu')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canRevise(r)}
              title={canRevise(r) ? undefined : t('myOrders.disabled.revise')}
              onClick={() => nav(`/orders/new?revise=${encodeURIComponent(no)}`)}
            >
              {t('myOrders.actions.revize')}
            </Button>
            {/* Round-8 §7 — Kontrol onayı öncesi yerinde düzenle / sil. */}
            <Button
              size="sm"
              variant="outline"
              disabled={!canEditDelete(r)}
              title={canEditDelete(r) ? undefined : t('myOrders.disabled.editDelete')}
              onClick={() => nav(`/orders/new?amend=${encodeURIComponent(no)}`)}
            >
              {t('myOrders.actions.duzenle')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!canEditDelete(r)}
              title={canEditDelete(r) ? undefined : t('myOrders.disabled.editDelete')}
              onClick={() => { setDeleteTarget(no); setDeleteReason('') }}
            >
              {t('myOrders.actions.sil')}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('myOrders.title')}
        actions={<Button onClick={() => nav('/orders/new')}>{t('common.add')}</Button>}
      />
      <div className="p-6">
        <DataTable
          columns={cols}
          data={orders as (OrderListDto & Record<string, unknown>)[]}
          keyField="siparisAlID"
          loading={isLoading}
        />
      </div>

      {/* Form Göster — reuse the shared OrderDetailModal */}
      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />

      {/* Red Notu — inline dialog (legacy MessageBox replacement) */}
      <Dialog open={!!redTarget} onOpenChange={(o) => { if (!o) setRedTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('myOrders.redNote.title')} — {redTarget}</DialogTitle></DialogHeader>
          <div className="text-sm whitespace-pre-wrap min-h-[3rem]">
            {redLoading
              ? t('common.loading')
              : redData?.red
                ? redData.red
                : <span className="text-muted-foreground">{t('myOrders.redNote.empty')}</span>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedTarget(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Round-8 §7 — Sil: zorunlu gerekçe dialog'u */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteReason('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('myOrders.delete.title', { no: deleteTarget })}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t('myOrders.delete.reason')}</Label>
            <Textarea rows={3} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={!deleteReason.trim() || deleteMut.isPending}
              onClick={() => deleteMut.mutate({ no: deleteTarget!, gerekce: deleteReason })}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
