import { visibleNavItems } from '@/lib/navigation'
import type { AuthUser, OrderSearchHit, WorkflowStepCode } from '@/types'

/**
 * "Bu sipariş nerede?" — iş akışı adımını, işin yapıldığı ekrana çevirir. Adımın
 * kendisi backend'den gelir (OrderWorkflow.cs); burada yalnız ekran bağlantıları var.
 * Bağlantılar Bekleyen İşler ile aynı biçimdedir (`sel`, `view`, `f.*`).
 */
interface Screen {
  path: string
  labelKey: string
  /** Muhasebe · Onaylar içindeki kuyruk adı. */
  queueKey?: string
  query: (no: string) => string
}

export interface OrderScreenLink {
  to: string
  labelKey: string
  queueKey?: string
}

export interface OrderLocation {
  /** İşin yapıldığı ekran; kapanmış ya da silinmiş kayıtta null. */
  work: Omit<OrderScreenLink, 'to'> | null
  /** Kullanıcının açabildiği ekran: önce işin ekranı, yoksa kaydı listeleyen ekran. */
  link: OrderScreenLink | null
  /** `link` işin yapıldığı ekranı mı gösteriyor? */
  linkIsWork: boolean
}

const sel = (no: string) => `sel=${encodeURIComponent(no)}`

const MY_ORDERS: Screen = {
  path: '/orders/mine', labelKey: 'nav.myOrders',
  query: (no) => `f.siparisNo=${encodeURIComponent(no)}`,
}
const ACCOUNTING_FOLDERS: Screen = {
  path: '/accounting/orders', labelKey: 'nav.accountingOrders',
  query: (no) => `f.q=${encodeURIComponent(no)}`,
}
const QUALITY_CONTROL: Screen = { path: '/quality-control', labelKey: 'nav.qualityControl', query: sel }
const FACTORY: Screen = { path: '/factory', labelKey: 'nav.factory', query: sel }
const LOGISTICS_READY: Screen = { path: '/logistics/ready', labelKey: 'nav.logisticsReady', query: sel }
const LOGISTICS_HISTORY: Screen = {
  path: '/logistics/history', labelKey: 'nav.logisticsHistory',
  query: (no) => `f.siparisNo=${encodeURIComponent(no)}`,
}
const approvalQueue = (view: string, queueKey: string): Screen => ({
  path: '/accounting/approval', labelKey: 'nav.accountingApproval', queueKey,
  query: (no) => `view=${view}&${sel(no)}`,
})

const STEP_SCREEN: Record<WorkflowStepCode, Screen> = {
  temsilciDuzeltme: MY_ORDERS,
  kontrolOnayi: QUALITY_CONTROL,
  siparisCevirme: MY_ORDERS,
  cariOnay: approvalQueue('cariQueue', 'inbox.queues.cari'),
  uretimeAlma: FACTORY,
  uretim: FACTORY,
  lojistikOnay: approvalQueue('lojistikQueue', 'inbox.queues.lojistikOnay'),
  sevkiyat: LOGISTICS_READY,
  teslimat: LOGISTICS_HISTORY,
  kapanis: approvalQueue('tamamlanmaQueue', 'inbox.queues.tamamlanma'),
}

/** İşin ekranı kapalıysa ya da iş bittiyse kaydın görülebildiği liste ekranları. */
const VIEW_SCREENS: Screen[] = [MY_ORDERS, ACCOUNTING_FOLDERS]

const toLink = (screen: Screen, no: string): OrderScreenLink => ({
  to: `${screen.path}?${screen.query(no)}`,
  labelKey: screen.labelKey,
  queueKey: screen.queueKey,
})

export function locateOrder(
  order: Pick<OrderSearchHit, 'siparisNo' | 'stepCode'>,
  user: AuthUser | null,
): OrderLocation {
  // Ekran erişimi menüyle aynı kuraldan okunur.
  const allowed = new Set(visibleNavItems(user).map((n) => n.path))
  const screen = order.stepCode ? STEP_SCREEN[order.stepCode] : null
  const work = screen ? { labelKey: screen.labelKey, queueKey: screen.queueKey } : null

  if (screen && allowed.has(screen.path)) {
    return { work, link: toLink(screen, order.siparisNo), linkIsWork: true }
  }
  const fallback = VIEW_SCREENS.find((s) => allowed.has(s.path))
  return { work, link: fallback ? toLink(fallback, order.siparisNo) : null, linkIsWork: false }
}
