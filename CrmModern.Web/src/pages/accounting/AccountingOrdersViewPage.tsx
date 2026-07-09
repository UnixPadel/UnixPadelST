import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getOrders, downloadExcel, downloadPdf } from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, FileSpreadsheet, FileText } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { OrderListDto } from '@/types'

/**
 * Muhasebe — Teklif / Sipariş görüntüleme (salt-okunur).
 * Oluşturulmuş tüm teklif + siparişler listelenir; proforma (Excel/PDF) açılabilir.
 * Revize/düzenleme YOK. Silinmiş (Silindi=1) kayıtlar gizlenir.
 */
export function AccountingOrdersViewPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [detailNo, setDetailNo] = useState<string | null>(null)

  const { data: page, isLoading } = useQuery({
    queryKey: ['accounting-orders-view'],
    // Geniş sayfa — muhasebe tüm teklif/siparişleri tek listede görür.
    queryFn: () => getOrders({ pageSize: 1000, page: 1 }),
  })

  const rows = useMemo(() => {
    const all = (page?.items ?? []).filter((o) => !o.silindi)   // silinenler gizli
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter((o) =>
      (o.siparisNo ?? '').toLowerCase().includes(q) ||
      (o.teklifNo ?? '').toLowerCase().includes(q) ||
      (o.musteriAd ?? '').toLowerCase().includes(q))
  }, [page, search])

  const no = (r: OrderListDto) => r.siparisNo || r.teklifNo

  const cols: Column<OrderListDto & Record<string, unknown>>[] = [
    { key: 'no', header: t('common.orderNo'), sortable: true,
      render: (r) => <span className="font-mono">{no(r as OrderListDto)}</span> },
    { key: 'musteriAd', header: t('common.customer'), sortable: true },
    { key: 'mUlke', header: t('common.country'), render: (r) => (r.mUlke as string) ?? '—' },
    { key: 'siparisMiTeklifMi', header: t('accountingFull.cols.asama'),
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'paraTipi', header: t('common.currency') },
    { key: 'toplamFiyat', header: t('common.totalAmount'),
      render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'tarih', header: t('common.date'),
      render: (r) => formatDateShort((r.tarih as string) ?? '-') },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => {
        const n = no(r as OrderListDto)
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" title={t('common.details')}
              onClick={() => setDetailNo(n)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" title={t('common.excel')}
              onClick={() => downloadExcel(n)}><FileSpreadsheet className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="PDF"
              onClick={() => downloadPdf(n)}><FileText className="h-3.5 w-3.5" /></Button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title={t('nav.accountingOrders')} />
      <div className="p-3 space-y-2">
        <Input
          placeholder={t('common.quickFilter')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <DataTable
          columns={cols}
          data={rows as (OrderListDto & Record<string, unknown>)[]}
          keyField="siparisAlID"
          loading={isLoading}
          density="compact"
          onRowClick={(r) => setDetailNo(no(r as OrderListDto))}
        />
      </div>

      {/* Salt-okunur detay + proforma (modal içinde Excel/PDF butonları mevcut) */}
      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}
