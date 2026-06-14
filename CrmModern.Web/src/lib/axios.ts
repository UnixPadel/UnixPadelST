import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5001',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Faz 8.9 — Global error handling
// Backend `ApiResponse.Fail` zarfından `message` ve `errors[]` çıkarıp
// `error.userMessage` / `error.fieldErrors` olarak Promise.reject'e ekle.
declare module 'axios' {
  interface AxiosError {
    userMessage?: string
    fieldErrors?: string[]
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // HashRouter + Electron file:// uyumlu yönlendirme:
      // - window.location.href = '/login' file:// içinde "/login" dosyasını
      //   arar ve ERR_FILE_NOT_FOUND verir → beyaz ekran. Hash route'a gitmek
      //   tarayıcı navigasyonu tetiklemez, sadece HashRouter'ı bilgilendirir.
      // - Zaten login sayfasındaysak yeniden yönlendirme yapma (yoksa form
      //   submit edip 401 alınca toast'lar/hata mesajları yok olur).
      if (!window.location.hash.startsWith('#/login')) {
        window.location.hash = '#/login'
      }
      return Promise.reject(error)
    }

    const data = error.response?.data as { message?: string; errors?: string[] } | undefined
    if (data) {
      error.userMessage = data.message || error.message
      error.fieldErrors = data.errors ?? []
    } else {
      error.userMessage = error.message
      error.fieldErrors = []
    }
    // PROMPT-v7 §3 — 403 Forbid() gövdesiz döner; "status code 403" yerine
    // anlamlı yetki mesajı göster (zarf bir mesaj taşımıyorsa).
    if (error.response?.status === 403 && !data?.message) {
      error.userMessage = 'Bu işlem için yetkiniz yok.'
    }
    return Promise.reject(error)
  }
)

/** Bir axios hatasını insan-okunur tek satıra dönüştürür (toast.description için). */
export function describeApiError(err: unknown): string {
  const e = err as { userMessage?: string; fieldErrors?: string[]; message?: string }
  const parts: string[] = []
  if (e?.userMessage) parts.push(e.userMessage)
  if (e?.fieldErrors && e.fieldErrors.length > 0) parts.push(e.fieldErrors.join('; '))
  return parts.length ? parts.join(' — ') : (e?.message ?? 'Bilinmeyen bir hata oluştu.')
}

export default api
