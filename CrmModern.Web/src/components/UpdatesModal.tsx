import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { CHANGELOG, CURRENT_VERSION } from '@/data/changelog'

const STORAGE_KEY = 'lastSeenChangelogVersion'

/**
 * Faz 7 — "Neler Yeni" modal'ı.
 * Bir kullanıcı giriş yaptıktan sonra `lastSeenChangelogVersion` localStorage'da
 * CURRENT_VERSION'dan farklıysa otomatik açılır. Kapatınca güncel sürüm kaydedilir.
 *
 * WinForms `Yenilik.cs` formunun karşılığıdır; içerik DB'den değil, statik
 * `data/changelog.ts` dosyasından okunur.
 */
export function UpdatesModal() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY)
    if (last !== CURRENT_VERSION) {
      setOpen(true)
    }
  }, [])

  function close() {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION)
    setOpen(false)
  }

  if (!open) return null

  const latest = CHANGELOG[0]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">Neler Yeni</h2>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              v{latest.versiyon}
            </span>
          </div>
          <button onClick={close} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <h3 className="font-medium text-sm">{latest.baslik}</h3>
          <p className="text-xs text-muted-foreground mt-1">{latest.tarih}</p>
          <ul className="mt-3 space-y-2 text-sm list-disc pl-4">
            {latest.maddeler.map((m, i) => (
              <li key={i} className="text-foreground/90">{m}</li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <button
            onClick={() => { close(); navigate('/updates') }}
            className="text-sm text-blue-600 hover:underline"
          >
            Geçmiş sürümleri gör
          </button>
          <button
            onClick={close}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  )
}
