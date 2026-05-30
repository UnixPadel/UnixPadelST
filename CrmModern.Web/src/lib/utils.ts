import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (date == null) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number | null | undefined, currency = 'EUR'): string {
  if (amount == null) return '-'
  const symbols: Record<string, string> = {
    Euro: '€',
    Dolar: '$',
    TL: '₺',
    Sterlin: '£',
  }
  const symbol = symbols[currency] ?? currency
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
