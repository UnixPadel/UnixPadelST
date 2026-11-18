import type { TFunction } from 'i18next'

/**
 * Sabit birim listesinin ekrandaki adı. Kayıtlı değer Türkçe kalır (`Adet`, `Kutu`…);
 * listede olmayan serbest metin olduğu gibi gösterilir.
 */
const UNIT_KEYS: Record<string, string> = {
  adet: 'adet',
  set: 'set',
  'm²': 'm2',
  'm³': 'm3',
  kg: 'kg',
  gram: 'gram',
  ton: 'ton',
  metre: 'metre',
  litre: 'litre',
  paket: 'paket',
  kutu: 'kutu',
  koli: 'koli',
  rulo: 'rulo',
}

export function unitLabel(t: TFunction, value?: string | null): string {
  const raw = (value ?? '').trim()
  const key = UNIT_KEYS[raw.toLocaleLowerCase('tr')]
  return key ? t(`units.${key}`) : raw
}
