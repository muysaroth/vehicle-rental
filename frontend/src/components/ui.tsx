import { useCallback, useEffect, useState } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { HiOutlineExclamationTriangle, HiOutlineInbox, HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2'
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
  primary: 'bg-brand-700 text-white shadow-xs hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-700',
  secondary: 'border border-line bg-surface text-ink shadow-xs hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-3 hover:text-ink',
  danger: 'border border-red-200 bg-surface text-red-600 hover:bg-red-50',
  success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700',
}

/** Button classes, also usable on a <Link> so links and buttons look the same. */
export function buttonClass(variant: Variant = 'secondary', size: 'sm' | 'md' = 'md', className?: string): string {
  return cx(
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
    variants[variant],
    className,
  )
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonProps) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />
}

interface IconButtonProps extends ComponentPropsWithRef<'button'> {
  label: string
  icon: IconType
  tone?: 'default' | 'danger' | 'success'
}

/** Small square icon-only button for table row actions. The label is the tooltip and the accessible name. */
export function IconButton({ label, icon: Icon, tone = 'default', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx(
        'inline-grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors disabled:pointer-events-none disabled:opacity-50',
        tone === 'danger' && 'hover:bg-red-50 hover:text-red-600',
        tone === 'success' && 'hover:bg-emerald-50 hover:text-emerald-700',
        tone === 'default' && 'hover:bg-surface-3 hover:text-ink',
        className,
      )}
      {...rest}
    >
      <Icon className="size-[18px]" />
    </button>
  )
}

/** Right-aligned group of row actions. Stops the click reaching a clickable row. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
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
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'animate-pop-in flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl',
          wide ? 'sm:max-w-4xl' : 'sm:max-w-lg',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <IconButton label={t('close')} icon={HiOutlineXMark} onClick={onClose} className="-mr-2" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex shrink-0 justify-end gap-2 rounded-b-2xl border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Form bits */

export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5 text-sm', className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 last:mb-0">
      <HiOutlineExclamationTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{errorMessage(error)}</span>
    </div>
  )
}

/** Text input with a magnifier icon. */
export function SearchInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cx('relative', className)}>
      <HiOutlineMagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input type="search" placeholder={t('search')} value={value} onChange={(e) => onChange(e.target.value)} className="w-full pl-9" />
    </div>
  )
}

/** Segmented pill tabs, used for status filters. */
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div role="tablist" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-3 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
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

const dots: Record<keyof typeof tones, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-sky-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
  violet: 'bg-violet-500',
}

export function Badge({ tone = 'slate', dot, children }: { tone?: keyof typeof tones; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', tones[tone])}>
      {dot && <span className={cx('size-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  )
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
  return (
    <Badge dot tone={vehicleTone[status]}>
      {t(`vstatus.${status}`)}
    </Badge>
  )
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
  return (
    <Badge dot tone={bookingTone[key]}>
      {t(`bstatus.${key}`)}
    </Badge>
  )
}

/* --------------------------------------------------------------- Layout bits */

export function PageHeader({ title, description, children }: { title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

/** Filter row that sits between the page header and the content. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mb-4 flex flex-wrap items-center gap-2', className)}>{children}</div>
}

/** A card with a titled header row. */
export function Section({ title, aside, children, className, bodyClassName }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cx('card overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h3 className="font-semibold">{title}</h3>
        {aside && <div className="text-sm text-muted">{aside}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

const statTones = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
}

export function Stat({
  label,
  value,
  hint,
  tone,
  icon: Icon,
  iconTone = 'brand',
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: 'red' | 'green'
  icon?: IconType
  iconTone?: keyof typeof statTones
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-muted">{label}</div>
        <div className={cx('mt-1.5 truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl', tone === 'red' && 'text-red-600', tone === 'green' && 'text-emerald-700')}>{value}</div>
        {hint && <div className="mt-1 truncate text-xs text-muted">{hint}</div>}
      </div>
      {Icon && (
        <div className={cx('hidden size-10 shrink-0 place-items-center rounded-xl sm:grid', statTones[iconTone])}>
          <Icon className="size-5" />
        </div>
      )}
    </div>
  )
}

export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-sm text-muted">
      <div className="grid size-12 place-items-center rounded-full bg-surface-3">
        <HiOutlineInbox className="size-6" />
      </div>
      {children ?? t('noData')}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block size-5 animate-spin rounded-full border-2 border-line border-t-brand-600', className)} aria-hidden />
}

/** Centred spinner with "Loading…", for a page or a panel. */
export function Loading({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div role="status" className={cx('flex items-center justify-center gap-3 py-14 text-sm text-muted', className)}>
      <Spinner />
      {t('loading')}
    </div>
  )
}

/** Definition list of label/value rows, for detail panels. */
export function DetailList({ rows }: { rows: ([ReactNode, ReactNode, ('strong' | 'warn')?] | false | '' | 0 | null | undefined)[] }) {
  return (
    <dl className="divide-y divide-line rounded-xl border border-line text-sm">
      {rows.filter(Boolean).map((row, i) => {
        const [k, v, emphasis] = row as [ReactNode, ReactNode, ('strong' | 'warn')?]
        return (
          <div key={i} className={cx('flex items-start justify-between gap-4 px-4 py-2.5', emphasis === 'strong' && 'bg-surface-2')}>
            <dt className={cx('shrink-0', emphasis === 'strong' ? 'font-semibold' : 'text-muted')}>{k}</dt>
            <dd className={cx('min-w-0 text-right', emphasis === 'strong' && 'font-semibold', emphasis === 'warn' && 'font-semibold text-amber-700')}>{v}</dd>
          </div>
        )
      })}
    </dl>
  )
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
