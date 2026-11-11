import { useCallback, useEffect, useState } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import { errorMessage } from '@/lib/api'
import { isoDate } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { BookingStatus, VehicleStatus } from '@/lib/types'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ Button */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-3 hover:text-ink',
  danger: 'bg-surface text-red-600 border border-red-200 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    />
  )
}

/* ------------------------------------------------------------------- Modal */

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-10" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx('card w-full', wide ? 'max-w-4xl' : 'max-w-lg')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" aria-label="Close" className="rounded p-1 text-muted hover:bg-surface-3" onClick={onClose}>
            <HiOutlineXMark className="size-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Form bits */

export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1 text-sm', className)}>
      <span className="font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(error)}</p>
}

/* ------------------------------------------------------------------- Badges */

const tones = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-surface-3 text-muted ring-line',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', tones[tone])}>{children}</span>
}

const vehicleTone: Record<VehicleStatus, keyof typeof tones> = {
  available: 'green',
  reserved: 'blue',
  rented: 'violet',
  maintenance: 'amber',
  sold: 'slate',
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const { t } = useI18n()
  return <Badge tone={vehicleTone[status]}>{t(`vstatus.${status}`)}</Badge>
}

const bookingTone: Record<BookingStatus | 'overdue', keyof typeof tones> = {
  reserved: 'blue',
  active: 'violet',
  returned: 'green',
  cancelled: 'slate',
  overdue: 'red',
}

export function BookingStatusBadge({ status, endDate }: { status: BookingStatus; endDate?: string }) {
  const { t } = useI18n()
  const overdue = status === 'active' && endDate && endDate < isoDate()
  const key = overdue ? 'overdue' : status
  return <Badge tone={bookingTone[key]}>{t(`bstatus.${key}`)}</Badge>
}

/* --------------------------------------------------------------- Layout bits */

export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'red' | 'green' }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className={cx('mt-1 text-2xl font-semibold tabular-nums', tone === 'red' && 'text-red-600', tone === 'green' && 'text-emerald-700')}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  )
}

export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  return <div className="py-10 text-center text-sm text-muted">{children ?? t('noData')}</div>
}

/* ------------------------------------------------------------------- Data */

/** Load something from the API, with a reload handle for after a change. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  const reload = useCallback(() => {
    setLoading(true)
    return run()
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [run])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, error, loading, reload, setData }
}
