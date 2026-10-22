import type { QueryClient } from '@tanstack/react-query'

/**
 * SR-7 — sipariş durumunu değiştiren her mutasyon sonrası tazelenecek sorgu
 * kökleri tek listede. Önceden her ekran kendi alt kümesini tazeliyordu:
 * AccountingPage kullanılmayan 'accounting-transactions'ı tazeleyip 'tx-history'yi
 * atlıyordu, QC 'accounting-orders'ı atlıyordu → diğer ekranlar 30 sn eski kalıyordu.
 * Önek eşleşmesi kullanılır (['qc-detail'] tüm qc-detail sorgularını kapsar).
 */
export const ORDER_GRAPH_KEYS = [
  'quality-control', 'qc-search', 'qc-detail',
  'my-orders', 'my-orders-picker', 'orders', 'order-detail', 'order-tx', 'order-extra-costs',
  'order-rejection-note', 'approvals', 'order-doc-flow',
  'factory',
  'logistics-ready', 'logistics-history', 'logistics-offers', 'logistics-offer-queue', 'carriers',
  'accounting-orders', 'accounting-orders-view', 'accounting-transactions', 'acc-approval-tx',
  'tx-history', 'customer-balance', 'customer-statement',
  'final-pending', 'payment-pending',
  'work-inbox', 'nav-counts', 'search',
  'workflow-waiting', 'workflow-step',
] as const

export function invalidateOrderGraph(qc: QueryClient): Promise<void> {
  return Promise.all(ORDER_GRAPH_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] }))).then(() => undefined)
}
