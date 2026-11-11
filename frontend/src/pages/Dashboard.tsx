import { Link } from 'react-router-dom'
import { Meter, TYPE_COLORS } from '@/components/charts'
import { BookingStatusBadge, ErrorNote, PageHeader, Stat, useLoad } from '@/components/ui'
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
    <div className="card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className={tone === 'red' ? 'font-semibold text-red-600' : 'font-semibold'}>{title}</h3>
        <span className="text-sm text-muted">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">{t('nothingToday')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.slice(0, 8).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
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
    </div>
  )
}

export default function Dashboard() {
  const { t } = useI18n()
  const { canManage } = useAuth()
  const { data, error } = useLoad(() => api.get<DashboardData>('/dashboard'), [])

  if (error) return <ErrorNote error={error} />
  if (!data) return <p className="text-muted">{t('loading')}</p>

  const { fleet } = data

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard')}>
        <Link to="/bookings?new=1" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          + {t('newBooking')}
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t('activeRentals')} value={data.active_rentals} hint={`${t('utilization')} ${pct(fleet.utilization)}`} />
        <Stat label={t('overdue')} value={data.overdue.length} tone={data.overdue.length ? 'red' : undefined} />
        <Stat label={t('monthRental')} value={money(data.month.rental_revenue)} />
        <Stat label={t('monthSales')} value={money(data.month.sales_revenue)} />
        {canManage && (
          <>
            <Stat label={t('collected')} value={money(data.month.collected)} tone="green" />
            <Stat label={t('monthExpenses')} value={money(data.month.expenses)} />
            <Stat label={t('outstanding')} value={money(data.outstanding)} />
            <Stat label={t('customers')} value={data.customers} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Due title={t('overdue')} rows={data.overdue} tone="red" />
        <Due title={t('pickupsToday')} rows={data.pickups_today} />
        <Due title={t('returnsToday')} rows={data.returns_today} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">{t('fleetStatus')}</h3>
          <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
            {(Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((s) => (
              <div key={s} style={{ width: `${(fleet[s] / Math.max(1, fleet.total)) * 100}%`, background: STATUS_COLORS[s] }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
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
        </div>

        <div className="card p-4">
          <h3 className="mb-3 font-semibold">{t('fleet')}</h3>
          <div className="space-y-3">
            {(Object.entries(fleet.by_type) as [VehicleType, number][]).map(([type, count]) => (
              <div key={type} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{t(`type.${type}`)}</span>
                  <span className="tabular-nums text-muted">{count}</span>
                </div>
                <Meter value={count / Math.max(1, fleet.total)} color={TYPE_COLORS[type]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
