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
