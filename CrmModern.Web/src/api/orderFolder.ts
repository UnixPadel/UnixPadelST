import api from '@/lib/axios'
import { currentLang } from '@/api/orders'
import type { ApiResponse } from '@/types'

// ── Muhasebe Klasörü ────────────────────────────────────────────────────────
// Her siparişin tek klasörü: proforma (Excel/PDF, otomatik) + muhasebe ekleri
// (çok dosya) + Satıcı Ek. Dosyalar tek tek yüklenir (sunucu ≤25 MB / dosya).

export interface FolderFile {
  ekID: number
  ad: string
  tip: string
  boyut: number
  tarih: string
  yukleyenAdSoyad?: string | null
  /** K5 — yumuşak silme (yalnız includeDeleted listelerinde true gelir). */
  silindi?: boolean
  silinmeTarihi?: string | null
}

export interface FolderLegacyFile {
  ad: string
  tip: string
  boyut: number
}

export interface OrderFolder {
  siparisNo: string
  canManage: boolean
  canSeeProforma: boolean
  dosyalar: FolderFile[]
  oncekiMuhasebeEk: FolderLegacyFile | null
  saticiEk: FolderLegacyFile | null
}

export type LegacyKind = 'muhasebe' | 'satici'

const enc = encodeURIComponent

export const getOrderFolder = async (no: string, includeDeleted = false): Promise<OrderFolder> =>
  (await api.get<ApiResponse<OrderFolder>>(`/api/orders/${enc(no)}/folder`, { params: includeDeleted ? { includeDeleted: true } : undefined })).data.data

/** SiparisNo → muhasebe eki sayısı (yalnız eki olan siparişler). */
export const getFolderCounts = async (): Promise<Record<string, number>> =>
  (await api.get<ApiResponse<Record<string, number>>>('/api/orders/folder-counts')).data.data ?? {}

export const uploadFolderFile = async (no: string, file: File, onProgress?: (pct: number) => void): Promise<FolderFile> => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post<ApiResponse<FolderFile>>(`/api/orders/${enc(no)}/folder/files`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)) },
  })
  return res.data.data
}

export const deleteFolderFile = async (no: string, ekId: number): Promise<void> => {
  await api.delete(`/api/orders/${enc(no)}/folder/files/${ekId}`)
}

/** Eski tek ek silinirken klasöre "silinmiş" bir dosya olarak taşınır; dönen ekId ile geri yüklenir. */
export const deleteFolderLegacyFile = async (no: string): Promise<number | null> => {
  const res = await api.delete<ApiResponse<{ ekId?: number } | null>>(`/api/orders/${enc(no)}/folder/legacy/muhasebe`)
  return res.data?.data?.ekId ?? null
}

/** K5 — silinen klasör dosyasını geri yükler. */
export const restoreFolderFile = async (no: string, ekId: number): Promise<void> => {
  await api.post(`/api/orders/${enc(no)}/folder/files/${ekId}/restore`)
}

// ── İçerik (blob) — indirme ve önizleme aynı isteği kullanır ────────────────

const blobGet = async (url: string, params?: Record<string, string>): Promise<Blob> =>
  (await api.get(url, { responseType: 'blob', params })).data as Blob

export const fetchFolderFile = (no: string, ekId: number) =>
  blobGet(`/api/orders/${enc(no)}/folder/files/${ekId}`)

export const fetchFolderLegacyFile = (no: string, kind: LegacyKind) =>
  blobGet(`/api/orders/${enc(no)}/folder/legacy/${kind}`)

export const fetchProformaPdf = (no: string) =>
  blobGet(`/api/orders/${enc(no)}/pdf`, { lang: currentLang() })

/** Blob'u verilen adla kaydettirir (tarayıcı + Electron indirme). */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 0)
}

// ── Dosya kuralları (sunucudaki FileRules ile aynı) ─────────────────────────

export const FOLDER_MAX_BYTES = 25 * 1024 * 1024
export const FOLDER_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.rtf,.odt,.zip,.rar'

export function folderFileError(file: File): 'tooBig' | 'badType' | null {
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
  if (!ext || !FOLDER_ACCEPT.split(',').includes(ext)) return 'badType'
  if (file.size > FOLDER_MAX_BYTES) return 'tooBig'
  return null
}

/** Tarayıcıda önizlenebilir mi? (PDF + görseller) */
export const isPreviewable = (tip: string) =>
  tip === 'application/pdf' || tip.startsWith('image/')
