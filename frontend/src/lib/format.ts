const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const money = (n: number | null | undefined) => usd.format(Number(n ?? 0))

/** Whole dollars, for charts and headline numbers. */
export const money0 = (n: number | null | undefined) => usd0.format(Number(n ?? 0))

export const pct = (n: number | null | undefined, digits = 1) => `${(Number(n ?? 0) * 100).toFixed(digits)}%`

export const num = (n: number | null | undefined) => Number(n ?? 0).toLocaleString('en-US')

/** "2026-05-10" (or an ISO timestamp) → "10 May 2026". */
export function date(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value.replace(' ', 'T'))
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Local date as YYYY-MM-DD (not UTC, which can be yesterday in Phnom Penh). */
export function isoDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

/** Inclusive day count, matching the server: a same-day hire is 1 day. */
export function daysBetween(start: string, end: string): number {
  const ms = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()
  return Math.round(ms / 86_400_000) + 1
}

export const vehicleName = (v?: { brand?: string; model?: string; plate_no?: string } | null) =>
  v ? `${v.brand ?? ''} ${v.model ?? ''}`.trim() : '—'
