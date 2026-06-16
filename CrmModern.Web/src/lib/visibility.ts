import type { AuthUser } from '@/types'
import { getStoredUser } from '@/lib/authStore'

/**
 * Round-11 §3 — Parasal/gelir görünürlüğü tek noktadan.
 *
 * `Fabrika` rolü hiçbir parasal değer görmez (sipariş fiyatlandırması, proforma,
 * bileşen fiyatları). Buna ek olarak belirli kullanıcılar ad bazlı TAM gizleme
 * alır: operasyonel ekranları kullanmaya devam ederler ama ciro / para birimi
 * toplamları / sipariş finansal toplamları / maliyet görünmez.
 *
 * Not: omur.caliskan rolü `Gozlemci`'dir (ciro gören rol); bu yüzden gizleme
 * ROL değil KULLANICI ADI bazlı olmak zorunda. Backend tarafı da aynı kullanıcı
 * adını ReportingController.RevenueHidden ile karartır (savunma katmanı).
 */
const HIDE_MONEY_USERNAMES = ['omur.caliskan']

export function hideMoneyFor(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  return user.yetkiTuru === 'Fabrika' || HIDE_MONEY_USERNAMES.includes(user.kullaniciAdi)
}

/** Mevcut oturumdaki kullanıcı için hideMoneyFor. */
export function hideMoney(): boolean {
  return hideMoneyFor(getStoredUser())
}
