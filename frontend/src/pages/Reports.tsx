import { useState } from 'react'
import { Chart, Meter, TYPE_COLORS } from '@/components/charts'
import { Button, ErrorNote, Field, PageHeader, Stat, useLoad } from '@/components/ui'
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
        <Field label={t('from')} className="flex-row items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('to')} className="flex-row items-center gap-2">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Button onClick={() => setRange({ from, to })}>{t('apply')}</Button>
        <Button variant="primary" disabled={!data} onClick={() => data && void exportPerformance(data, t)}>
          {t('exportExcel')}
        </Button>
      </PageHeader>

      <ErrorNote error={error} />
      {loading && !data && <p className="text-muted">{t('loading')}</p>}
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
        <Stat label={t('rentalRevenue')} value={money0(data.totals.rental_revenue)} hint={`${data.totals.bookings} ${t('bookingsCount')}`} />
        <Stat label={t('salesRevenue')} value={money0(data.totals.sales_revenue)} hint={`${data.totals.units_sold} ${t('unitsSold')}`} />
        <Stat label={t('salesProfit')} value={money0(data.totals.sales_profit)} />
        <Stat label={t('expenses')} value={money0(data.totals.expenses)} />
        <Stat label={t('netProfit')} value={money0(data.totals.net_profit)} tone="green" />
      </div>

      {/* ---- The decision ---- */}
      <section className="card overflow-hidden">
        <div className="bg-brand-900 px-5 py-4 text-white">
          <div className="text-xs tracking-wide text-brand-200 uppercase">{t('recommendation')}</div>
          <h2 className="text-lg font-semibold">{t('decisionTitle')}</h2>
          {best ? (
            <p className="mt-2 text-brand-50">
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
        <div className="grid gap-2 p-5 sm:grid-cols-5">
          {data.recommendation.ranking.map((r, i) => (
            <div key={r.type} className={i === 0 ? 'rounded-lg bg-brand-50 p-3 ring-2 ring-brand-500' : 'rounded-lg bg-slate-50 p-3'}>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">
                  #{i + 1} {t(`type.${r.type}`)}
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: TYPE_COLORS[r.type] }}>
                  {r.score}
                </span>
              </div>
              <div className="mt-2">
                <Meter value={r.score / 100} color={TYPE_COLORS[r.type]} />
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-muted">
                <div>ROI {pct(r.roi)}</div>
                <div>
                  {t('utilization')} {pct(r.utilization)}
                </div>
                <div>
                  {t('profitPerVehicle')} {money0(r.profit_per_vehicle)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="px-5 pb-4 text-xs text-muted">{t('scoreHelp')}</p>
      </section>

      {/* ---- By type ---- */}
      <section className="card overflow-x-auto">
        <h3 className="border-b border-line px-4 py-3 font-semibold">{t('byType')}</h3>
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
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="mb-3 font-semibold">{t('revenueByType')}</h3>
          <Chart
            labels={types.map((r) => t(`type.${r.type}`))}
            series={[
              { name: t('rentalRevenue'), color: '#0f766e', values: types.map((r) => r.rental_revenue) },
              { name: t('expenses'), color: '#f59e0b', values: types.map((r) => r.expenses) },
            ]}
            format={money0}
          />
        </section>
        <section className="card p-4">
          <h3 className="mb-3 font-semibold">{t('utilByType')}</h3>
          <Chart
            labels={types.map((r) => t(`type.${r.type}`))}
            series={[{ name: t('utilization'), color: '#2563eb', values: types.map((r) => r.utilization * 100) }]}
            format={(n) => `${Math.round(n)}%`}
          />
        </section>
      </div>

      <section className="card p-4">
        <h3 className="mb-3 font-semibold">{t('monthlyTrend')}</h3>
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
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-x-auto">
          <h3 className="border-b border-line px-4 py-3 font-semibold">{t('topCustomers')}</h3>
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
        </section>
        <section className="card overflow-x-auto">
          <h3 className="border-b border-line px-4 py-3 font-semibold">{t('topVehicles')}</h3>
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
        </section>
      </div>

      <section className="card p-4">
        <h3 className="mb-3 font-semibold">{t('expenseBreakdown')}</h3>
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
      </section>
    </>
  )
}
