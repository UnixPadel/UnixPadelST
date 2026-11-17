import { useTranslation } from 'react-i18next'
import { CancelTxButton } from '@/components/CancelTransactionDialog'
import { SectionTitle } from '@/components/ui/section-title'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { AccountingOrderListDto, AccountingTransactionDto } from '@/types'

/**
 * Ödeme özeti — eski "Özet" ve "Cari Bilgiler" kartlarının yerine tek liste;
 * her değer bir kez görünür (önceden Kalan bakiye ve Kalan peşinat iki kartta
 * tekrar ediyordu). Değerler listedeki mevcut alanlardan gelir; yeni hesap yok:
 * Peşinat = tutar × peşinat %, Ödenen = iptal edilmemiş tahsilatların toplamı.
 * Lojistik sırasında yöneticinin onayladığı nakliye teklifi de tek satır olarak eklenir.
 */
export function PaymentSummary({ row, transactions, showLogisticsOffer = false }: {
  row: AccountingOrderListDto
  transactions: AccountingTransactionDto[]
  showLogisticsOffer?: boolean
}) {
  const { t } = useTranslation()
  const pt = row.paraTipi
  const m = (n: number | null | undefined) => formatCurrency(n ?? 0, pt)
  const active = transactions.filter((tx) => !tx.iptal)
  const odenen = active.reduce((s, tx) => s + (tx.odenenMiktar ?? 0), 0)
  const toplam = row.toplamFiyat ?? 0
  const kalan = row.kalanBakiye ?? 0

  const line = (label: string, value: string, strong = false, tone?: string) => (
    <div className={cn('flex items-baseline justify-between gap-4', strong && 'border-t pt-1 text-base font-semibold')}>
      <dt className={strong ? undefined : 'text-muted-foreground'}>{label}</dt>
      <dd className={cn('tabular-nums', tone)}>{value}</dd>
    </div>
  )

  return (
    <section aria-label={t('accApproval.summary.title')} className="space-y-1">
      <dl className="space-y-0.5 text-sm">
        {line(t('accApproval.summary.tutar'), m(toplam))}
        {line(t('accApproval.summary.pesinat', { yuzde: row.pesinYuzde }), m((toplam * row.pesinYuzde) / 100))}
        {line(t('accApproval.summary.odenen', { count: active.length }), m(odenen))}
        {line(t('accApproval.summary.kalanPesinat'), m(row.kaparoFiyat))}
        {line(t('accApproval.summary.kalanBakiye'), m(kalan), true, kalan < 0 ? 'text-warning' : undefined)}
      </dl>
      {kalan < 0 && <p className="text-xs text-warning">{t('accApproval.summary.overpaid')}</p>}
      {showLogisticsOffer && row.onayliLojistikFirma && (
        <p className="rounded-md bg-success-soft px-2 py-1 text-sm text-success-soft-foreground">
          <span className="font-semibold">{t('logisticsOffer.approvedTitle')}:</span> {row.onayliLojistikFirma}
          {row.onayliLojistikFiyat != null && <> · <span className="tabular-nums">{formatCurrency(row.onayliLojistikFiyat, row.onayliLojistikParaBirimi ?? undefined)}</span></>}
        </p>
      )}
    </section>
  )
}

/**
 * Tahsilatlar — siparişin ödeme satırları. Önceden ayrı sekmedeydi ve her
 * satırda aynı müşteri / ülke / döviz tekrar ediyordu; burada yalnız tarih,
 * tutar ve iptal işlemi var. İptal edilenler üstü çizili kalır (toplama girmez).
 * Hiç tahsilat yoksa bölüm gösterilmez (özetteki "Ödenen (0 tahsilat)" yeterli).
 */
export function PaymentsList({ row, transactions, onCancel }: {
  row: AccountingOrderListDto
  transactions: AccountingTransactionDto[]
  /** Verilmezse iptal butonu çizilmez (iptal yetkisi olmayan kullanıcı). */
  onCancel?: (tx: AccountingTransactionDto) => void
}) {
  const { t } = useTranslation()
  if (transactions.length === 0) return null
  const sorted = [...transactions].sort((a, b) => (b.tarih ?? '').localeCompare(a.tarih ?? ''))
  const activeCount = transactions.filter((tx) => !tx.iptal).length

  return (
    <section aria-label={t('accApproval.payments.title')} className="space-y-1.5">
      <SectionTitle>{t('accApproval.payments.title')} <span className="font-normal text-muted-foreground">({activeCount})</span></SectionTitle>
      <ul className="divide-y rounded-md border text-sm">
        {sorted.map((tx) => (
          <li key={tx.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1">
            <span className={cn('w-24 shrink-0', tx.iptal && 'text-muted-foreground line-through decoration-1')}>{formatDate(tx.tarih)}</span>
            <span className={cn('flex-1 text-right font-medium tabular-nums', tx.iptal && 'text-muted-foreground line-through decoration-1')}>
              {formatCurrency(tx.odenenMiktar ?? 0, row.paraTipi)}
            </span>
            {tx.iptal ? (
              // İptal bilgisi görünür metin (önceden yalnız üzerine gelince çıkan ipucuydu).
              <span className="w-full text-xs text-danger">
                {t('accApproval.cancelTx.badge')} · {t('accApproval.cancelTx.cancelledInfo', {
                  kim: tx.iptalKullaniciAdSoyad ?? '—',
                  tarih: tx.iptalTarihi ? formatDate(tx.iptalTarihi) : '—',
                })}
              </span>
            ) : onCancel ? (
              <CancelTxButton onClick={() => onCancel(tx)} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
