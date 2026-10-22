import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getMyOrders } from '@/api/orders'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/StatusBadge'
import { trLower } from '@/components/ui/combobox'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

/**
 * PROMPT-v3 §6 — legacy FormGetir; E-14 ile "Referanstan oluştur" adını aldı:
 * seçilen kayıt YENİ kayıt olarak forma yüklenir. ↑/↓ + Enter ile klavyeden seçilir.
 */
export function LoadOrderDialog({
  open, onOpenChange, onPick, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onPick: (no: string) => void
  loading: boolean
}) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  // Temsilci'nin kendi siparişleri (backend zaten kendi satırlarına scope'lar).
  const { data: myOrders = [], isLoading } = useQuery({
    queryKey: ['my-orders-picker'],
    queryFn: () => getMyOrders(),
    enabled: open,
  })
  const list = useMemo(() => {
    const s = trLower(q.trim())
    const rows = myOrders.filter((o) => !o.silindi)
    if (!s) return rows
    return rows.filter((o) => [o.siparisNo, o.teklifNo, o.musteriAd].some((x) => trLower(x ?? '').includes(s)))
  }, [myOrders, q])
  const noOf = (o: (typeof list)[number]) => (o.siparisMiTeklifMi === 'Teklif' ? o.teklifNo : o.siparisNo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('orders.form.formuGetir')}</DialogTitle>
          <DialogDescription>{t('orders.form.formuGetirHint')}</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={t('orders.form.getirSearch')}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(list.length - 1, a + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
            else if (e.key === 'Enter' && list[active] && !loading) { e.preventDefault(); onPick(noOf(list[active])) }
          }}
        />
        <div role="listbox" className="max-h-72 divide-y overflow-y-auto rounded-md border">
          {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
          {!isLoading && list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('common.noData')}</p>}
          {list.map((o, i) => (
            <button
              key={o.siparisAlID}
              type="button"
              role="option"
              aria-selected={i === active}
              disabled={loading}
              ref={(el) => { if (i === active) el?.scrollIntoView({ block: 'nearest' }) }}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(noOf(o))}
              className={cn('w-full px-3 py-2 text-left text-sm disabled:opacity-50', i === active ? 'bg-accent' : 'hover:bg-accent/60')}
            >
              <span className="font-mono">{noOf(o)}</span>
              <span className="text-muted-foreground"> — {o.musteriAd}</span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge value={o.siparisMiTeklifMi} context="stage" />
                {o.tarih ? formatDate(o.tarih) : ''}
              </span>
            </button>
          ))}
        </div>
        {loading && <p className="text-xs text-muted-foreground">{t('orders.form.formYukleniyor')}</p>}
      </DialogContent>
    </Dialog>
  )
}
