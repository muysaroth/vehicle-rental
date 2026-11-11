import { Link } from 'react-router-dom'
import { Meter, TYPE_COLORS } from '@/components/charts'
import {
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlinePlus,
  HiOutlineReceiptPercent,
  HiOutlineUserGroup,
  HiOutlineWallet,
} from 'react-icons/hi2'
import { BookingStatusBadge, ErrorNote, Loading, PageHeader, Section, Stat, buttonClass, cx, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { date, money, pct, vehicleName } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { Booking, Dashboard as DashboardData, VehicleStatus, VehicleType } from '@/lib/types'

const STATUS_COLORS: Record<Exclude<VehicleStatus, 'sold'>, string> = {
  available: '#10b981',
  reserved: '#0ea5e9',
  rented: '#8b5cf6',
  maintenance: '#f59e0b',
}

function Due({ title, rows, tone }: { title: string; rows: Booking[]; tone?: 'red' }) {
  const { t } = useI18n()
  return (
    <Section
      title={<span className={cx('inline-flex items-center gap-2', tone === 'red' && rows.length > 0 && 'text-red-600')}>{title}</span>}
      aside={
        <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', tone === 'red' && rows.length ? 'bg-red-50 text-red-600' : 'bg-surface-3 text-muted')}>
          {rows.length}
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">{t('nothingToday')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.slice(0, 8).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{b.customer?.name}</div>
                <div className="truncate text-xs text-muted">
                  {vehicleName(b.vehicle)} · {b.vehicle?.plate_no} · {date(b.start_date)} → {date(b.end_date)}
                </div>
              </div>
              <BookingStatusBadge status={b.status} endDate={b.end_date} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export default function Dashboard() {
  const { t } = useI18n()
  const { canManage } = useAuth()
  const { data, error } = useLoad(() => api.get<DashboardData>('/dashboard'), [])

  if (error) return <ErrorNote error={error} />
  if (!data) return <Loading />

  const { fleet } = data

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard')}>
        <Link to="/bookings?new=1" className={buttonClass('primary')}>
          <HiOutlinePlus />
          {t('newBooking')}
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={HiOutlineCalendarDays} iconTone="violet" label={t('activeRentals')} value={data.active_rentals} hint={`${t('utilization')} ${pct(fleet.utilization)}`} />
        <Stat
          icon={HiOutlineExclamationTriangle}
          iconTone={data.overdue.length ? 'red' : 'amber'}
          label={t('overdue')}
          value={data.overdue.length}
          tone={data.overdue.length ? 'red' : undefined}
        />
        <Stat icon={HiOutlineArrowTrendingUp} label={t('monthRental')} value={money(data.month.rental_revenue)} />
        <Stat icon={HiOutlineBanknotes} iconTone="blue" label={t('monthSales')} value={money(data.month.sales_revenue)} />
        {canManage && (
          <>
            <Stat icon={HiOutlineWallet} iconTone="green" label={t('collected')} value={money(data.month.collected)} tone="green" />
            <Stat icon={HiOutlineReceiptPercent} iconTone="amber" label={t('monthExpenses')} value={money(data.month.expenses)} />
            <Stat icon={HiOutlineClock} iconTone="amber" label={t('outstanding')} value={money(data.outstanding)} />
            <Stat icon={HiOutlineUserGroup} iconTone="blue" label={t('customers')} value={data.customers} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Due title={t('overdue')} rows={data.overdue} tone="red" />
        <Due title={t('pickupsToday')} rows={data.pickups_today} />
        <Due title={t('returnsToday')} rows={data.returns_today} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t('fleetStatus')} aside={t('vehicleSummary', { n: fleet.total })} bodyClassName="p-5">
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-3">
            {(Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((s) => (
              <div key={s} style={{ width: `${(fleet[s] / Math.max(1, fleet.total)) * 100}%`, background: STATUS_COLORS[s] }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {(Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((s) => (
              <div key={s} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: STATUS_COLORS[s] }} />
                  {t(`vstatus.${s}`)}
                </span>
                <span className="font-medium tabular-nums">{fleet[s]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-muted">
              <span>{t('forSale')}</span>
              <span className="tabular-nums">{fleet.for_sale}</span>
            </div>
          </div>
        </Section>

        <Section title={t('fleet')} bodyClassName="p-5">
          <div className="space-y-3.5">
            {(Object.entries(fleet.by_type) as [VehicleType, number][]).map(([type, count]) => (
              <div key={type} className="text-sm">
                <div className="mb-1.5 flex justify-between">
                  <span>{t(`type.${type}`)}</span>
                  <span className="tabular-nums text-muted">{count}</span>
                </div>
                <Meter value={count / Math.max(1, fleet.total)} color={TYPE_COLORS[type]} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
