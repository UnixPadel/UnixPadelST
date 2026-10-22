import { useSyncExternalStore } from 'react'
import { readJSON, userKey, writeJSON } from '@/lib/storage'

/**
 * SR-4 / E-6 — tablo başına kalıcı durum (kullanıcıya özel): gizli kolonlar,
 * sıralama ve kayıtlı görünümler (SAP ALV layout varyantı / LOGO kayıtlı
 * filtre). DataTable gizli kolon + sıralamayı, FilterBar filtreleri yazar;
 * görünüm kaydı ikisini birlikte saklar.
 */
export type SortDir = 'asc' | 'desc'

export interface SavedView {
  name: string
  filters?: Record<string, unknown>
  hidden?: string[]
  sort?: { key: string; dir: SortDir } | null
}

export interface TableState {
  hidden?: string[]
  sort?: { key: string; dir: SortDir } | null
  filters?: Record<string, unknown>
  views?: SavedView[]
  defaultView?: string | null
}

const listeners = new Map<string, Set<() => void>>()
const cache = new Map<string, TableState>()
const EMPTY: TableState = {}

function storageKey(id: string) { return userKey('table', id) }

export function getTableState(id: string | undefined): TableState {
  if (!id) return EMPTY
  const k = storageKey(id)
  if (!cache.has(k)) cache.set(k, readJSON<TableState>(k, {}))
  return cache.get(k)!
}

export function setTableState(id: string | undefined, patch: Partial<TableState> | ((s: TableState) => Partial<TableState>)) {
  if (!id) return
  const k = storageKey(id)
  const prev = getTableState(id)
  const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }
  cache.set(k, next)
  writeJSON(k, next)
  listeners.get(id)?.forEach((l) => l())
}

export function useTableState(id: string | undefined): TableState {
  return useSyncExternalStore(
    (cb) => {
      if (!id) return () => {}
      if (!listeners.has(id)) listeners.set(id, new Set())
      listeners.get(id)!.add(cb)
      return () => { listeners.get(id)?.delete(cb) }
    },
    () => getTableState(id),
    () => getTableState(id),
  )
}
