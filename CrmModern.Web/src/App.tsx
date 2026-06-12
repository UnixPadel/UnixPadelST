import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NewOrderPage } from '@/pages/orders/NewOrderPage'
import { MyOrdersPage } from '@/pages/orders/MyOrdersPage'
import { CustomersPage } from '@/pages/customers/CustomersPage'
import { CustomerFormPage } from '@/pages/customers/CustomerFormPage'
import { QualityControlPage } from '@/pages/quality-control/QualityControlPage'
import { FactoryPage } from '@/pages/factory/FactoryPage'
import { LogisticsReadyPage } from '@/pages/logistics/LogisticsReadyPage'
import { LogisticsHistoryPage } from '@/pages/logistics/LogisticsHistoryPage'
import { CarriersPage } from '@/pages/logistics/CarriersPage'
import { AccountingPage } from '@/pages/accounting/AccountingPage'
import { AccountingHistoryPage } from '@/pages/accounting/AccountingHistoryPage'
import { CustomerBalancePage } from '@/pages/accounting/CustomerBalancePage'
import { LogisticsApprovalsPage } from '@/pages/accounting/LogisticsApprovalsPage'
import { AccountingApprovalPage } from '@/pages/accounting/AccountingApprovalPage'
import { NewPurchaseRequestPage } from '@/pages/purchase/NewPurchaseRequestPage'
import { MyPurchaseRequestsPage } from '@/pages/purchase/MyPurchaseRequestsPage'
import { AllPurchaseRequestsPage } from '@/pages/purchase/AllPurchaseRequestsPage'
import { PreApprovalPage } from '@/pages/approval/PreApprovalPage'
import { PaymentDetailsPage } from '@/pages/approval/PaymentDetailsPage'
import { FinalApprovalPage } from '@/pages/approval/FinalApprovalPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { SearchPage } from '@/pages/search/SearchPage'
import { UpdatesPage } from '@/pages/UpdatesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoleGuard } from '@/components/RoleGuard'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"       element={<DashboardPage />} />
        {/* PROMPT-v3 §1 — Teklif/Sipariş Oluştur yalnız Temsilci.
            İstisna: elshan.rasulov (kullanıcı adı bazlı, rol değil). */}
        <Route path="/orders/new"      element={<RoleGuard roles={['Temsilci']} usernames={['elshan.rasulov']}><NewOrderPage /></RoleGuard>} />
        {/* PROMPT.md #20 — Siparişlerim: only roles that can create orders.
            PROMPT-v4 §6.2: elshan.rasulov tüm siparişleri buradan izler. */}
        <Route path="/orders/mine"     element={<RoleGuard roles={['Yonetici','Temsilci','Gozlemci']} usernames={['elshan.rasulov']}><MyOrdersPage /></RoleGuard>} />
        {/* PROMPT.md #16 + #19 — Müşteri CRUD. Per-row matrix:
              list   — Yonetici, Temsilci, Gozlemci, Muhasebe (read-only)
              new    — Yonetici, Temsilci, Gozlemci
              edit   — Yonetici, Gozlemci  (Temsilci can add but not edit) */}
        <Route path="/customers"            element={<RoleGuard roles={['Yonetici','Temsilci','Gozlemci','Muhasebe']}><CustomersPage /></RoleGuard>} />
        <Route path="/customers/new"        element={<RoleGuard roles={['Yonetici','Temsilci','Gozlemci']}><CustomerFormPage /></RoleGuard>} />
        <Route path="/customers/:id/edit"   element={<RoleGuard roles={['Yonetici','Gozlemci']}><CustomerFormPage /></RoleGuard>} />
        {/* PROMPT-v4 §1 — Kontrol ekranı YALNIZ elshan.rasulov (rol değil; Yonetici dahil giremez). */}
        <Route path="/quality-control" element={<RoleGuard usernames={['elshan.rasulov']}><QualityControlPage /></RoleGuard>} />
        <Route path="/factory"         element={<FactoryPage />} />
        <Route path="/logistics"           element={<Navigate to="/logistics/ready" replace />} />
        <Route path="/logistics/ready"     element={<RoleGuard roles={['Yonetici','Lojistik']}><LogisticsReadyPage /></RoleGuard>} />
        <Route path="/logistics/history"   element={<RoleGuard roles={['Yonetici','Lojistik','Gozlemci','Muhasebe']} usernames={['elshan.rasulov']}><LogisticsHistoryPage /></RoleGuard>} />
        <Route path="/logistics/carriers"  element={<RoleGuard roles={['Yonetici','Lojistik','Gozlemci']} usernames={['elshan.rasulov']}><CarriersPage /></RoleGuard>} />
        <Route path="/accounting"          element={<RoleGuard roles={['Yonetici','Muhasebe']}><AccountingPage /></RoleGuard>} />
        {/* PROMPT-v6 §1 — Burcu onay ekranı YALNIZ burcu.karaman (rol değil; Yonetici dahil giremez). */}
        <Route path="/accounting/approval" element={<RoleGuard usernames={['burcu.karaman']}><AccountingApprovalPage /></RoleGuard>} />
        <Route path="/accounting/logistics-approvals" element={<RoleGuard roles={['Yonetici','Muhasebe']} usernames={['elshan.rasulov']}><LogisticsApprovalsPage /></RoleGuard>} />
        <Route path="/accounting/history"  element={<RoleGuard roles={['Yonetici','Muhasebe','Gozlemci']}><AccountingHistoryPage /></RoleGuard>} />
        <Route path="/accounting/balance"  element={<RoleGuard roles={['Yonetici','Muhasebe']}><CustomerBalancePage /></RoleGuard>} />
        <Route path="/purchase"             element={<Navigate to="/purchase/mine" replace />} />
        <Route path="/purchase/new"         element={<RoleGuard roles={['Yonetici','Lojistik','Fabrika','Gozlemci','Temsilci']}><NewPurchaseRequestPage /></RoleGuard>} />
        <Route path="/purchase/mine"        element={<MyPurchaseRequestsPage />} />
        <Route path="/purchase/all"         element={<AllPurchaseRequestsPage />} />
        <Route path="/approval/pre"         element={<PreApprovalPage />} />
        <Route path="/approval/payment"     element={<RoleGuard roles={['Yonetici','Muhasebe']}><PaymentDetailsPage /></RoleGuard>} />
        <Route path="/approval/final"       element={<FinalApprovalPage />} />
        <Route path="/users"           element={<RoleGuard roles={['Yonetici']}><UsersPage /></RoleGuard>} />
        <Route path="/search"          element={<SearchPage />} />
        <Route path="/updates"         element={<UpdatesPage />} />
        <Route path="*"                element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
