import axios from 'axios'
import { getToken, clearAuth } from '@/lib/authStore'
import i18n from '@/i18n/i18n'
import { kontrolLabel, purchaseStatusLabel, stageLabel } from '@/lib/status'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5001',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Faz 8.9 — Global error handling
// Backend `ApiResponse.Fail` zarfından `message`, `errors[]` ve (varsa) kararlı
// `code` + `args` çıkarılır. Kod varsa mesaj kullanıcının dilinde i18n'den gelir
// (`apiErrors.<code>`); backend'in Türkçe `message`'ı yalnız yedektir.
declare module 'axios' {
  interface AxiosError {
    userMessage?: string
    fieldErrors?: string[]
    apiCode?: string
  }
}

type ErrorEnvelope = { message?: string; errors?: string[]; code?: string | null; args?: Record<string, unknown> | null }

// Ham değerleri (aşama "Hazir", durum "Onay Bekliyor"…) okunur etikete çevirir.
function localizeArgs(code: string, args: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const t = i18n.t.bind(i18n)
  const out: Record<string, unknown> = { ...(args ?? {}) }
  if (typeof out.stage === 'string') out.stage = stageLabel(t, out.stage)
  if (typeof out.status === 'string') out.status = purchaseStatusLabel(t, out.status)
  if (typeof out.kontrol === 'string') out.kontrol = kontrolLabel(t, out.kontrol)
  if (code === 'notFound' && typeof out.entity === 'string') out.entity = t(`apiErrors.entities.${out.entity}`, { defaultValue: out.entity })
  return out
}

export function messageFromEnvelope(data: ErrorEnvelope | undefined): string | undefined {
  if (data?.code && i18n.exists(`apiErrors.${data.code}`)) return i18n.t(`apiErrors.${data.code}`, localizeArgs(data.code, data.args))
  return data?.message || undefined
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data as ErrorEnvelope | undefined
    error.apiCode = data?.code ?? undefined
    error.userMessage = messageFromEnvelope(data)
      // Yanıt hiç yoksa (sunucu kapalı / internet yok) anlaşılır bir mesaj.
      ?? (error.response ? error.message : i18n.t('apiErrors.network'))
    error.fieldErrors = data?.errors ?? []

    if (error.response?.status === 401) {
      clearAuth()
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

    // PROMPT-v7 §3 — 403 Forbid() gövdesiz döner; "status code 403" yerine
    // anlamlı yetki mesajı göster (zarf bir mesaj taşımıyorsa).
    if (error.response?.status === 403 && !data?.message) {
      error.userMessage = i18n.t('apiErrors.forbidden')
    }
    return Promise.reject(error)
  }
)

// Backend errors[] içinde teşhis satırları da gelir (correlationId, dev'de tip/stack);
// bunlar kullanıcıya gösterilmez — destek için sunucu günlüğünde zaten var.
const DIAGNOSTIC = /^(correlationId|type|message|stack|inner\[\d+\]\.\w+):/

/** Bir axios hatasını insan-okunur tek satıra dönüştürür (toast.description için). */
export function describeApiError(err: unknown): string {
  const e = err as { userMessage?: string; fieldErrors?: string[]; message?: string }
  const parts: string[] = []
  if (e?.userMessage) parts.push(e.userMessage)
  const fields = (e?.fieldErrors ?? []).filter((f) => !DIAGNOSTIC.test(f))
  if (fields.length > 0) parts.push(fields.join('; '))
  return parts.length ? parts.join(' — ') : (e?.message ?? i18n.t('apiErrors.unknown'))
}

export default api
