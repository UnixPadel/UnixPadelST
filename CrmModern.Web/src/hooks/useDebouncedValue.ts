import { useEffect, useState } from 'react'

/**
 * QW-15 — değer `delay` ms sabit kalınca güncellenir. Filtre input'ları her tuş
 * vuruşunda sunucu sorgusu atıyordu (Factory, Lojistik Geçmiş, Muhasebe Geçmiş).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(h)
  }, [value, delay])
  return debounced
}
