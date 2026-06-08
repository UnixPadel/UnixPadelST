import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getMyOrders, convertToOrder, getRejectionNote,
} from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { OrderKontrolBadge } from '@/components/OrderKontrolBadge'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
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

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders(),
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

  // ── Validity helpers (legacy rules) ────────────────────────────────────
  const canConvert = (r: OrderListDto) =>
    r.siparisMiTeklifMi === 'Teklif' && r.kontrol !== 'Reddet'
  const canShowRedNote = (r: OrderListDto) => r.kontrol === 'Reddet'
  const canRevise = (r: OrderListDto) =>
    (r.siparisMiTeklifMi === 'Teklif' || r.siparisMiTeklifMi === 'Siparis') &&
    r.kontrol !== 'Onay'

  const cols: Column<OrderListDto & Record<string, unknown>>[] = [
    { key: 'numara', header: t('myOrders.cols.numara'), sortable: true,
      render: (r) => <span className="font-mono text-sm">{rowNo(r as OrderListDto)}</span> },
    { key: 'musteriAd', header: t('myOrders.cols.musteriAd'), sortable: true },
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
    </div>
  )
}
