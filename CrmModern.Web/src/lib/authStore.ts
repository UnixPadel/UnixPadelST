import type { AuthUser } from '@/types'

/**
 * Tek noktadan auth depolama. "Beni Hatırla" davranışı:
 *
 *   remember = true  → localStorage  : tarayıcı kapanıp açılsa / masaüstü
 *                                       uygulaması yeniden başlasa da kalır.
 *   remember = false → sessionStorage : sekme/pencere kapanınca temizlenir
 *                                       (oturum normal şekilde sona erer).
 *
 * Yalnızca JWT token + kullanıcı profili (AuthUser) saklanır. Kullanıcı adı /
 * şifre HİÇBİR ZAMAN saklanmaz. Token'ın geçerlilik süresi sunucudaki JWT
 * "exp" claim'i ile sınırlıdır (normal 8 saat; remember=true ile uzun ömürlü).
 *
 * React dışı bağlam (axios interceptor) da bu modülü kullanır.
 */

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

/** Aktif oturumu hangi store tutuyor? Önce localStorage (kalıcı), sonra session. */
function readStore(): Storage | null {
  if (localStorage.getItem(TOKEN_KEY)) return localStorage
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage
  return null
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

/** Giriş anında çağrılır: remember'a göre hedef store seçilir, diğeri temizlenir. */
export function saveAuth(user: AuthUser, remember: boolean): void {
  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  // Eski oturum kalıntısını diğer store'dan temizle (çift kayıt / kafa karışıklığı önlenir).
  other.removeItem(TOKEN_KEY)
  other.removeItem(USER_KEY)
  target.setItem(TOKEN_KEY, user.token)
  target.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * /me tazelemesi: mevcut store'u KORUR (remember tercihini değiştirmez).
 * Token, çağıran tarafça korunur (me endpoint'i boş token döndürür).
 */
export function refreshAuth(user: AuthUser): void {
  const target = readStore() ?? sessionStorage
  target.setItem(TOKEN_KEY, user.token)
  target.setItem(USER_KEY, JSON.stringify(user))
}

/** Çıkış / 401: her iki store'dan da tüm auth verisini siler. */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}
