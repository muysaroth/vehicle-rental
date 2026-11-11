import { useState } from 'react'
import { Chart, Meter, TYPE_COLORS } from '@/components/charts'
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineTrophy,
} from 'react-icons/hi2'
import { Button, ErrorNote, Field, Loading, PageHeader, Section, Spinner, Stat, cx, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { exportPerformance } from '@/lib/excel'
import { isoDate, money, money0, pct } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { Performance } from '@/lib/types'

function defaultFrom(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 11, 1)
  return isoDate(d)
}

export default function Reports() {
  const { t } = useI18n()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(isoDate())
  const [range, setRange] = useState({ from, to })
  const { data, error, loading } = useLoad(() => api.get<Performance>('/reports/performance', range), [range.from, range.to])

  return (
    <div className="space-y-6">
      <PageHeader title={t('reports')}>
        <Button variant="primary" disabled={!data} onClick={() => data && void exportPerformance(data, t)}>
          <HiOutlineArrowDownTray />
          {t('exportExcel')}
        </Button>
      </PageHeader>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label={t('from')}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('to')}>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Button disabled={range.from === from && range.to === to} onClick={() => setRange({ from, to })}>
          {loading && data ? <Spinner className="size-4" /> : <HiOutlineArrowPath />}
          {t('apply')}
        </Button>
      </div>

      <ErrorNote error={error} />
      {loading && !data && <Loading />}
      {data && <ReportBody data={data} />}
    </div>
  )
}

function ReportBody({ data }: { data: Performance }) {
  const { t } = useI18n()
  const best = data.recommendation.ranking[0]
  const types = data.types.filter((r) => r.fleet > 0 || r.units_sold > 0)
  const labels = data.monthly.map((m) => m.month.slice(2).replace('-', '/'))

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={HiOutlineCalendarDays} label={t('rentalRevenue')} value={money0(data.totals.rental_revenue)} hint={`${data.totals.bookings} ${t('bookingsCount')}`} />
        <Stat icon={HiOutlineBanknotes} iconTone="blue" label={t('salesRevenue')} value={money0(data.totals.sales_revenue)} hint={`${data.totals.units_sold} ${t('unitsSold')}`} />
        <Stat icon={HiOutlineArrowTrendingUp} iconTone="violet" label={t('salesProfit')} value={money0(data.totals.sales_profit)} />
        <Stat icon={HiOutlineReceiptPercent} iconTone="amber" label={t('expenses')} value={money0(data.totals.expenses)} />
        <Stat icon={HiOutlineSparkles} iconTone="green" label={t('netProfit')} value={money0(data.totals.net_profit)} tone="green" />
      </div>

      {/* ---- The decision ---- */}
      <section className="card overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-800 to-brand-950 px-6 py-5 text-white">
          <HiOutlineTrophy className="pointer-events-none absolute -top-4 -right-4 size-36 text-white/5" />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium tracking-wide text-brand-100 uppercase">
            <HiOutlineSparkles className="size-3.5" />
            {t('recommendation')}
          </div>
          <h2 className="mt-2 text-lg font-semibold">{t('decisionTitle')}</h2>
          {best ? (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-50/90">
              {t('recommendText', {
                type: t(`type.${best.type}`),
                score: best.score,
                roi: pct(best.roi),
                util: pct(best.utilization),
                ppv: money0(best.profit_per_vehicle),
              })}
            </p>
          ) : (
            <p className="mt-2">{t('noData')}</p>
          )}
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {data.recommendation.ranking.map((r, i) => (
            <div
              key={r.type}
              className={cx('rounded-xl border p-4', i === 0 ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/30' : 'border-line bg-surface-2')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-xs', i === 0 ? 'bg-brand-600 text-white' : 'bg-surface-3 text-muted')}>{i + 1}</span>
                  <span className="truncate">{t(`type.${r.type}`)}</span>
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: TYPE_COLORS[r.type] }}>
                  {r.score}
                </span>
              </div>
              <div className="mt-3">
                <Meter value={r.score / 100} color={TYPE_COLORS[r.type]} />
              </div>
              <dl className="mt-3 space-y-1 text-xs">
                {(
                  [
                    ['ROI', pct(r.roi)],
                    [t('utilization'), pct(r.utilization)],
                    [t('profitPerVehicle'), money0(r.profit_per_vehicle)],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">{t('scoreHelp')}</p>
      </section>

      {/* ---- By type ---- */}
      <Section title={t('byType')} bodyClassName="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t('type')}</th>
              <th className="num">{t('fleet')}</th>
              <th className="num">{t('investment')}</th>
              <th className="num">{t('bookingsCount')}</th>
              <th className="w-40">{t('utilization')}</th>
              <th className="num">{t('avgRate')}</th>
              <th className="num">{t('rentalRevenue')}</th>
              <th className="num">{t('expenses')}</th>
              <th className="num">{t('rentalProfit')}</th>
              <th className="num">{t('profitPerVehicle')}</th>
              <th className="num">ROI</th>
              <th className="num">{t('unitsSold')}</th>
              <th className="num">{t('salesProfit')}</th>
            </tr>
          </thead>
          <tbody>
            {types.map((r) => (
              <tr key={r.type}>
                <td className="font-medium">
                  <span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: TYPE_COLORS[r.type] }} />
                  {t(`type.${r.type}`)}
                </td>
                <td className="num">{r.fleet}</td>
                <td className="num">{money0(r.investment)}</td>
                <td className="num">{r.bookings}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Meter value={r.utilization} color={TYPE_COLORS[r.type]} />
                    <span className="w-12 text-right text-xs tabular-nums">{pct(r.utilization)}</span>
                  </div>
                </td>
                <td className="num">{money(r.avg_daily_rate)}</td>
                <td className="num">{money0(r.rental_revenue)}</td>
                <td className="num">{money0(r.expenses)}</td>
                <td className="num">{money0(r.rental_profit)}</td>
                <td className="num">{money0(r.profit_per_vehicle)}</td>
                <td className="num font-medium">{pct(r.roi)}</td>
                <td className="num">{r.units_sold}</td>
                <td className="num">{money0(r.sales_profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t('revenueByType')} bodyClassName="p-5">
          <Chart
            labels={types.map((r) => t(`type.${r.type}`))}
            series={[
              { name: t('rentalRevenue'), color: '#0f766e', values: types.map((r) => r.rental_revenue) },
              { name: t('expenses'), color: '#f59e0b', values: types.map((r) => r.expenses) },
            ]}
            format={money0}
          />
        </Section>
        <Section title={t('utilByType')} bodyClassName="p-5">
          <Chart
            labels={types.map((r) => t(`type.${r.type}`))}
            series={[{ name: t('utilization'), color: '#2563eb', values: types.map((r) => r.utilization * 100) }]}
            format={(n) => `${Math.round(n)}%`}
          />
        </Section>
      </div>

      <Section title={t('monthlyTrend')} bodyClassName="p-5">
        <Chart
          kind="line"
          height={280}
          labels={labels}
          series={[
            { name: t('rentalRevenue'), color: '#0f766e', values: data.monthly.map((m) => m.rental_revenue) },
            { name: t('salesRevenue'), color: '#2563eb', values: data.monthly.map((m) => m.sales_revenue) },
            { name: t('expenses'), color: '#f59e0b', values: data.monthly.map((m) => m.expenses) },
          ]}
          format={money0}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t('topCustomers')} bodyClassName="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th className="num">{t('rentals')}</th>
                <th className="num">{t('sales')}</th>
                <th className="num">{t('spend')}</th>
              </tr>
            </thead>
            <tbody>
              {data.top_customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted">{c.phone}</div>
                  </td>
                  <td className="num">{c.rentals}</td>
                  <td className="num">{c.purchases}</td>
                  <td className="num">{money0(c.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title={t('topVehicles')} bodyClassName="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('vehicle')}</th>
                <th className="num">{t('rentedDays')}</th>
                <th className="num">{t('rentalRevenue')}</th>
                <th className="num">{t('expenses')}</th>
              </tr>
            </thead>
            <tbody>
              {data.top_vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted">
                      {v.plate_no} · {t(`type.${v.type}`)}
                    </div>
                  </td>
                  <td className="num">{v.rented_days}</td>
                  <td className="num">{money0(v.revenue)}</td>
                  <td className="num">{money0(v.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title={t('expenseBreakdown')} bodyClassName="p-5">
        <div className="grid gap-3 sm:grid-cols-5">
          {Object.entries(data.expenses_by_category).map(([cat, amount]) => (
            <div key={cat} className="text-sm">
              <div className="mb-1 flex justify-between">
                <span>{t(`cat.${cat}`)}</span>
                <span className="tabular-nums">{money0(amount)}</span>
              </div>
              <Meter value={(amount ?? 0) / Math.max(1, data.totals.expenses)} color="#f59e0b" />
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
