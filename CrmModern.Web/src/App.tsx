import { lazy, type ComponentType } from 'react'
import { createHashRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { RoleGuard } from '@/components/RoleGuard'
import { getPreferences } from '@/lib/preferences'

// QW-16 — rota bazlı kod bölme: 110 KB'lık NewOrderPage dahil sayfalar ilk
// açılışta değil, ilgili rotaya girildiğinde yüklenir (Layout'taki Suspense).
const named = <K extends string>(p: Promise<Record<K, ComponentType>>, k: K) =>
  p.then((m) => ({ default: m[k] }))
const DashboardPage = lazy(() => named(import('@/pages/DashboardPage'), 'DashboardPage'))
const NewOrderPage = lazy(() => named(import('@/pages/orders/NewOrderPage'), 'NewOrderPage'))
const MyOrdersPage = lazy(() => named(import('@/pages/orders/MyOrdersPage'), 'MyOrdersPage'))
const CustomersPage = lazy(() => named(import('@/pages/customers/CustomersPage'), 'CustomersPage'))
const CustomerFormPage = lazy(() => named(import('@/pages/customers/CustomerFormPage'), 'CustomerFormPage'))
const QualityControlPage = lazy(() => named(import('@/pages/quality-control/QualityControlPage'), 'QualityControlPage'))
const FactoryPage = lazy(() => named(import('@/pages/factory/FactoryPage'), 'FactoryPage'))
const LogisticsReadyPage = lazy(() => named(import('@/pages/logistics/LogisticsReadyPage'), 'LogisticsReadyPage'))
const LogisticsOffersPage = lazy(() => named(import('@/pages/logistics/LogisticsOffersPage'), 'LogisticsOffersPage'))
const LogisticsHistoryPage = lazy(() => named(import('@/pages/logistics/LogisticsHistoryPage'), 'LogisticsHistoryPage'))
const CarriersPage = lazy(() => named(import('@/pages/logistics/CarriersPage'), 'CarriersPage'))
const AccountingPage = lazy(() => named(import('@/pages/accounting/AccountingPage'), 'AccountingPage'))
const AccountingOrdersViewPage = lazy(() => named(import('@/pages/accounting/AccountingOrdersViewPage'), 'AccountingOrdersViewPage'))
const AccountingHistoryPage = lazy(() => named(import('@/pages/accounting/AccountingHistoryPage'), 'AccountingHistoryPage'))
const CustomerBalancePage = lazy(() => named(import('@/pages/accounting/CustomerBalancePage'), 'CustomerBalancePage'))
const AccountingApprovalPage = lazy(() => named(import('@/pages/accounting/AccountingApprovalPage'), 'AccountingApprovalPage'))
const NewPurchaseRequestPage = lazy(() => named(import('@/pages/purchase/NewPurchaseRequestPage'), 'NewPurchaseRequestPage'))
const MyPurchaseRequestsPage = lazy(() => named(import('@/pages/purchase/MyPurchaseRequestsPage'), 'MyPurchaseRequestsPage'))
const AllPurchaseRequestsPage = lazy(() => named(import('@/pages/purchase/AllPurchaseRequestsPage'), 'AllPurchaseRequestsPage'))
const PaymentDetailsPage = lazy(() => named(import('@/pages/approval/PaymentDetailsPage'), 'PaymentDetailsPage'))
const FinalApprovalPage = lazy(() => named(import('@/pages/approval/FinalApprovalPage'), 'FinalApprovalPage'))
const UsersPage = lazy(() => named(import('@/pages/users/UsersPage'), 'UsersPage'))
const RepPerformancePage = lazy(() => named(import('@/pages/reporting/RepPerformancePage'), 'RepPerformancePage'))
const SearchPage = lazy(() => named(import('@/pages/search/SearchPage'), 'SearchPage'))
const UpdatesPage = lazy(() => named(import('@/pages/UpdatesPage'), 'UpdatesPage'))
const GuidePage = lazy(() => named(import('@/pages/GuidePage'), 'GuidePage'))
const WorkInboxPage = lazy(() => named(import('@/pages/WorkInboxPage'), 'WorkInboxPage'))
const PreferencesPage = lazy(() => named(import('@/pages/PreferencesPage'), 'PreferencesPage'))
const NotFoundPage = lazy(() => named(import('@/pages/NotFoundPage'), 'NotFoundPage'))

function StartRedirect() {
  return <Navigate to={getPreferences().startPage || '/dashboard'} replace />
}

// SR-9 — data router (createHashRouter): useBlocker ile kaydedilmemiş değişiklik
// koruması yalnız data router altında çalışır. Electron file:// için hash kalır.
export const router = createHashRouter(createRoutesFromElements(
  <>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<Layout />}>
      {/* E-13 — açılış sayfası kullanıcı tercihi (varsayılan Ana Panel). */}
    <Route path="/" element={<StartRedirect />} />
    {/* E-10 — rol bazlı birleşik Bekleyen İşler ekranı. */}
    <Route path="/inbox"           element={<WorkInboxPage />} />
    <Route path="/preferences"     element={<PreferencesPage />} />
      <Route path="/dashboard"       element={<DashboardPage />} />
      {/* PROMPT-v3 §1 — Teklif/Sipariş Oluştur yalnız Temsilci.
          İstisna: elshan.rasulov (kullanıcı adı bazlı, rol değil). */}
      <Route path="/orders/new"      element={<RoleGuard roles={['Temsilci']} usernames={['elshan.rasulov']}><NewOrderPage /></RoleGuard>} />
      {/* PROMPT.md #20 — Siparişlerim: only roles that can create orders.
          PROMPT-v4 §6.2: elshan.rasulov tüm siparişleri buradan izler. */}
      <Route path="/orders/mine"     element={<RoleGuard roles={['Yonetici','Temsilci','Gozlemci']} usernames={['elshan.rasulov']}><MyOrdersPage /></RoleGuard>} />
      {/* Round-8 §13 — Temsilci performans raporu YALNIZ Yonetici. */}
      <Route path="/reporting/representatives" element={<RoleGuard roles={['Yonetici']}><RepPerformancePage /></RoleGuard>} />
      {/* PROMPT.md #16 + #19 — Müşteri CRUD. Per-row matrix:
            list   — Yonetici, Temsilci, Gozlemci, Muhasebe, Lojistik (read-only)
            new    — Yonetici, Temsilci, Gozlemci
            edit   — Yonetici, Gozlemci  (Temsilci can add but not edit)
            Lojistik: yalnız listeyi GÖRÜR (ekleme/düzenleme/silme YOK). */}
      <Route path="/customers"            element={<RoleGuard roles={['Yonetici','Temsilci','Gozlemci','Muhasebe','Lojistik']}><CustomersPage /></RoleGuard>} />
      <Route path="/customers/new"        element={<RoleGuard roles={['Yonetici','Temsilci','Gozlemci']}><CustomerFormPage /></RoleGuard>} />
      <Route path="/customers/:id/edit"   element={<RoleGuard roles={['Yonetici','Gozlemci']}><CustomerFormPage /></RoleGuard>} />
      {/* PROMPT-v4 §1 — Kontrol ekranı YALNIZ elshan.rasulov (rol değil; Yonetici dahil giremez). */}
      <Route path="/quality-control" element={<RoleGuard usernames={['elshan.rasulov']}><QualityControlPage /></RoleGuard>} />
      <Route path="/factory"         element={<FactoryPage />} />
      <Route path="/logistics"           element={<Navigate to="/logistics/ready" replace />} />
      <Route path="/logistics/ready"     element={<RoleGuard roles={['Yonetici','Lojistik']}><LogisticsReadyPage /></RoleGuard>} />
      {/* Lojistik Teklif — yalnız Lojistik + Yönetici. Onay yalnız Yönetici (sayfa içi). */}
      <Route path="/logistics/offers"    element={<RoleGuard roles={['Yonetici','Lojistik']}><LogisticsOffersPage /></RoleGuard>} />
      <Route path="/logistics/history"   element={<RoleGuard roles={['Yonetici','Lojistik','Gozlemci','Muhasebe']} usernames={['elshan.rasulov']}><LogisticsHistoryPage /></RoleGuard>} />
      <Route path="/logistics/carriers"  element={<RoleGuard roles={['Yonetici','Lojistik','Gozlemci']} usernames={['elshan.rasulov']}><CarriersPage /></RoleGuard>} />
      <Route path="/accounting"          element={<RoleGuard roles={['Yonetici','Muhasebe']}><AccountingPage /></RoleGuard>} />
      {/* Muhasebe — Teklif/Sipariş görüntüleme (salt-okunur; proforma açılır, revize yok). */}
      <Route path="/accounting/orders"   element={<RoleGuard roles={['Yonetici','Muhasebe']}><AccountingOrdersViewPage /></RoleGuard>} />
      {/* PROMPT-v6 §1 — Burcu onay ekranı YALNIZ burcu.karaman (rol değil; Yonetici dahil giremez). */}
      <Route path="/accounting/approval" element={<RoleGuard usernames={['burcu.karaman']}><AccountingApprovalPage /></RoleGuard>} />
      <Route path="/accounting/history"  element={<RoleGuard roles={['Yonetici','Muhasebe','Gozlemci']}><AccountingHistoryPage /></RoleGuard>} />
      <Route path="/accounting/balance"  element={<RoleGuard roles={['Yonetici','Muhasebe']}><CustomerBalancePage /></RoleGuard>} />
      <Route path="/purchase"             element={<Navigate to="/purchase/mine" replace />} />
      <Route path="/purchase/new"         element={<RoleGuard roles={['Yonetici','Lojistik','Fabrika','Gozlemci','Temsilci']}><NewPurchaseRequestPage /></RoleGuard>} />
      <Route path="/purchase/mine"        element={<MyPurchaseRequestsPage />} />
      <Route path="/purchase/all"         element={<AllPurchaseRequestsPage />} />
      <Route path="/approval/payment"     element={<RoleGuard roles={['Yonetici','Muhasebe']}><PaymentDetailsPage /></RoleGuard>} />
      <Route path="/approval/final"       element={<FinalApprovalPage />} />
      <Route path="/users"           element={<RoleGuard roles={['Yonetici']}><UsersPage /></RoleGuard>} />
      <Route path="/search"          element={<SearchPage />} />
      <Route path="/updates"         element={<UpdatesPage />} />
      <Route path="/guide"           element={<GuidePage />} />
      <Route path="*"                element={<NotFoundPage />} />
    </Route>
  </>
))
