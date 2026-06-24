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
// Round-11 — "Beni Hatırla" giriş ön-doldurma anahtarı. Token/oturum
// anahtarlarından AYRI tutulur ki logout/clearAuth bunu SİLMESİN.
const REMEMBER_KEY = 'remember:login'

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

// Masaüstü (Electron) istemcisi: oturum, otomatik güncelleme uygulamayı yeniden
// başlatınca KAYBOLMASIN diye her zaman localStorage'da tutulur. sessionStorage
// uygulama kapanışında silinir → güncelleme sonrası kullanıcı oturumdan düşerdi.
// Güvenlik sınırı JWT "exp" ile korunur (remember=false için ~8 saat). Tarayıcıda
// (web) eski "Beni Hatırla" davranışı aynen korunur.
const isDesktop = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)

/** Giriş anında çağrılır: remember'a göre hedef store seçilir, diğeri temizlenir. */
export function saveAuth(user: AuthUser, remember: boolean): void {
  // Masaüstünde her zaman kalıcı store (güncelleme oturumu düşürmesin).
  const persist = remember || isDesktop
  const target = persist ? localStorage : sessionStorage
  const other = persist ? sessionStorage : localStorage
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

/**
 * Çıkış / 401: her iki store'dan da tüm auth verisini siler.
 * NOT: "Beni Hatırla" giriş ön-doldurma (REMEMBER_KEY) bilinçli olarak
 * SİLİNMEZ — logout sonrası da kullanıcı adı/şifre formda dolu gelmelidir.
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

// ── "Beni Hatırla" giriş ön-doldurma ──────────────────────────────────────
//
// Round-11 — Token/JWT/oturum davranışından TAMAMEN bağımsız: yalnız login
// formunu otomatik doldurmak için son BAŞARILI kullanıcı adı + şifreyi
// localStorage'da tutar. localStorage olduğu için tarayıcı/bilgisayar yeniden
// başlasa ve logout yapılsa da kalır. Remember Me kapalıyken silinir.
//
// GÜVENLİK NOTU: şifre düz metin saklanır (ürün gereği, kullanıcının açık
// isteği). XSS veya cihaza fiziksel erişim bu bilgiyi okuyabilir.

export interface RememberedLogin {
  kullaniciAdi: string
  sifre: string
}

/** Remember Me işaretliyken başarılı giriş sonrası çağrılır. */
export function saveRememberedLogin(kullaniciAdi: string, sifre: string): void {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ kullaniciAdi, sifre }))
}

/** Login formunu ön-doldurmak için saklanan kimlik bilgisi (yoksa null). */
export function getRememberedLogin(): RememberedLogin | null {
  const raw = localStorage.getItem(REMEMBER_KEY)
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as RememberedLogin
    return typeof v?.kullaniciAdi === 'string' && typeof v?.sifre === 'string' ? v : null
  } catch {
    return null
  }
}

/** Remember Me kapatıldığında / kapalı girişte saklanan kimlik bilgisini siler. */
export function clearRememberedLogin(): void {
  localStorage.removeItem(REMEMBER_KEY)
}
