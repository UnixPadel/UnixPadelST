import { useEffect, useState } from 'react'

/**
 * Electron köprüsü (electron/preload.cjs). Web build'de / tarayıcıda yoktur →
 * çağıran taraf `desktop` undefined iken ilgili ayarı gizler.
 */
export type ZoomSetting = 'auto' | number
export interface ZoomInfo { setting: ZoomSetting; factor: number }

interface DesktopBridge {
  getZoom: () => Promise<ZoomInfo>
  setZoom: (setting: ZoomSetting) => Promise<void>
  onZoomChange: (cb: (info: ZoomInfo) => void) => () => void
}

declare global {
  interface Window { desktop?: DesktopBridge }
}

export const desktop: DesktopBridge | undefined = typeof window !== 'undefined' ? window.desktop : undefined

/** Seçilebilir ölçek basamakları — electron/main.cjs ZOOM_STEPS ile aynı tutulmalı. */
export const ZOOM_STEPS = [0.8, 0.85, 0.9, 1, 1.1, 1.25]

/** Mevcut ölçekten bir basamak yukarı/aşağı; sınırdaysa null. */
export function nextZoomStep(factor: number, dir: 1 | -1): number | null {
  return dir === 1
    ? ZOOM_STEPS.find((s) => s > factor + 0.001) ?? null
    : [...ZOOM_STEPS].reverse().find((s) => s < factor - 0.001) ?? null
}

/** Güncel arayüz ölçeği; Ctrl+= / Ctrl+- ile değişince de tazelenir. */
export function useDesktopZoom(): ZoomInfo | null {
  const [info, setInfo] = useState<ZoomInfo | null>(null)
  useEffect(() => {
    if (!desktop) return
    void desktop.getZoom().then(setInfo)
    return desktop.onZoomChange(setInfo)
  }, [])
  return info
}
