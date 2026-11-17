import { useEffect } from 'react'

/**
 * Liste + sağ panel ekranlarında: liste yüklenince (ya da seçili kayıt listeden
 * çıkınca) ilk kayıt kendiliğinden seçilir; ekran açılır açılmaz sağ panel dolu
 * gelir ve kullanıcı "önce bir satır seç" adımını atlamış olur.
 */
export function useAutoSelectFirst<K extends string | number>(
  keys: K[],
  selected: K | null,
  setSelected: (key: K | null) => void,
  loading: boolean,
) {
  const sig = keys.join('|')
  useEffect(() => {
    if (loading) return
    if (selected != null && keys.includes(selected)) return
    setSelected(keys[0] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, loading])
}
