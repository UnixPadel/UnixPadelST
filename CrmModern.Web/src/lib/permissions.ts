// §24 — Merkezi süper-admin (Admin) tanımı.
//
// 'admin' kullanıcısı TÜM rol ve kullanıcı-adı kontrollerini bypass eder (tam
// erişim: Elshan/Fabrika/Lojistik/Muhasebe/Satın Alma/Raporlama ekranları,
// fabrika onayı, gizli menüler, role-kısıtlı sayfalar).
//
// Mevcut `elshan.rasulov` süper-kullanıcı davranışı AYRICA korunur (RoleGuard ve
// Sidebar kendi elshan kontrollerini de tutar); burada yalnız yeni Admin eklenir.
// Sayfa-bazlı kopyalamadan kaçınmak için tek kaynak: bu helper.
export const SUPER_ADMINS: readonly string[] = ['admin']

export function isSuperAdmin(
  user: { kullaniciAdi?: string | null } | null | undefined,
): boolean {
  const u = user?.kullaniciAdi
  return !!u && SUPER_ADMINS.includes(u)
}

// Muhasebe Onay kullanıcıları — backend AccountingController.IsAccountingApprover
// ile aynı küme (burcu.karaman + elshan.rasulov + süper-admin). Tahsilat iptali
// gibi onaycıya özel aksiyonların görünürlüğü için.
export const ACCOUNTING_APPROVERS: readonly string[] = ['burcu.karaman', 'elshan.rasulov', 'admin']

export function isAccountingApprover(
  user: { kullaniciAdi?: string | null } | null | undefined,
): boolean {
  const u = user?.kullaniciAdi
  return (!!u && ACCOUNTING_APPROVERS.includes(u)) || isSuperAdmin(user)
}

// Tüm Talepler verisi — backend ClaimsPrincipalExtensions.CanSeeAllPurchaseRequests ile aynı küme.
export function canSeeAllPurchaseRequests(
  user: { yetkiTuru?: string | null; kullaniciAdi?: string | null } | null | undefined,
): boolean {
  return user?.yetkiTuru === 'Yonetici' || user?.yetkiTuru === 'Gozlemci' || user?.kullaniciAdi === 'elshan.rasulov'
}

// Muhasebe Klasörü — backend OrderController.CanManageFolder ile aynı küme.
// Görme kuralı parasal görünürlüğe bağlıdır (lib/visibility.ts hideMoneyFor);
// ekleme/silme: Yönetici, Muhasebe, Muhasebe Onay kullanıcıları. Sunucu ayrıca
// klasör yanıtında `canManage` döner — arayüz kararını o verir; bu yardımcı
// yalnız "+" gibi klasörü açmadan görünen düğmeler içindir.
export function canManageAccountingFolder(
  user: { yetkiTuru?: string | null; kullaniciAdi?: string | null } | null | undefined,
): boolean {
  if (!user) return false
  return user.yetkiTuru === 'Yonetici' || user.yetkiTuru === 'Muhasebe' || isAccountingApprover(user)
}
