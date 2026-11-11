import type { Performance } from './types'

type Translate = (key: string) => string

/**
 * The decision-support report as an .xlsx workbook, one sheet per table, so a
 * manager can keep working on it in Excel (pivot, chart, what-if).
 */
export async function exportPerformance(report: Performance, t: Translate): Promise<void> {
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  wb.creator = 'Mekong Wheels MIS'

  const money = '"$"#,##0.00'
  const percent = '0.0%'

  const sheet = (name: string, columns: { header: string; key: string; width?: number; fmt?: string }[], rows: object[]) => {
    const ws = wb.addWorksheet(name)
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16, style: c.fmt ? { numFmt: c.fmt } : {} }))
    ws.addRows(rows)
    const head = ws.getRow(1)
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    return ws
  }

  const summary = wb.addWorksheet('Summary')
  summary.columns = [{ width: 28 }, { width: 20 }]
  summary.addRows([
    ['Mekong Wheels — Performance report'],
    ['Period', `${report.from} → ${report.to}`],
    [],
    [t('rentalRevenue'), report.totals.rental_revenue],
    [t('salesRevenue'), report.totals.sales_revenue],
    [t('salesProfit'), report.totals.sales_profit],
    [t('expenses'), report.totals.expenses],
    [t('netProfit'), report.totals.net_profit],
    [t('bookingsCount'), report.totals.bookings],
    [t('unitsSold'), report.totals.units_sold],
    [],
    [t('recommendation'), report.recommendation.best ? t(`type.${report.recommendation.best}`) : '—'],
  ])
  summary.getRow(1).font = { bold: true, size: 14 }
  for (let r = 4; r <= 8; r++) summary.getCell(`B${r}`).numFmt = money

  sheet(
    'By type',
    [
      { header: t('type'), key: 'type' },
      { header: t('fleet'), key: 'fleet', width: 10 },
      { header: t('investment'), key: 'investment', fmt: money },
      { header: t('bookingsCount'), key: 'bookings', width: 12 },
      { header: t('rentedDays'), key: 'rented_days', width: 12 },
      { header: t('utilization'), key: 'utilization', fmt: percent },
      { header: t('rentalRevenue'), key: 'rental_revenue', fmt: money },
      { header: t('expenses'), key: 'expenses', fmt: money },
      { header: t('rentalProfit'), key: 'rental_profit', fmt: money },
      { header: t('profitPerVehicle'), key: 'profit_per_vehicle', fmt: money },
      { header: 'ROI', key: 'roi', fmt: percent, width: 10 },
      { header: t('unitsSold'), key: 'units_sold', width: 10 },
      { header: t('salesRevenue'), key: 'sales_revenue', fmt: money },
      { header: t('salesProfit'), key: 'sales_profit', fmt: money },
    ],
    report.types.map((r) => ({ ...r, type: t(`type.${r.type}`) })),
  )

  sheet(
    'Ranking',
    [
      { header: t('type'), key: 'type' },
      { header: t('score'), key: 'score', width: 10 },
      { header: 'ROI', key: 'roi', fmt: percent },
      { header: t('utilization'), key: 'utilization', fmt: percent },
      { header: t('profitPerVehicle'), key: 'profit_per_vehicle', fmt: money },
    ],
    report.recommendation.ranking.map((r) => ({ ...r, type: t(`type.${r.type}`) })),
  )

  sheet(
    'Monthly',
    [
      { header: 'Month', key: 'month', width: 12 },
      { header: t('rentalRevenue'), key: 'rental_revenue', fmt: money },
      { header: t('salesRevenue'), key: 'sales_revenue', fmt: money },
      { header: t('expenses'), key: 'expenses', fmt: money },
      { header: t('bookingsCount'), key: 'bookings', width: 12 },
      { header: t('unitsSold'), key: 'units_sold', width: 12 },
    ],
    report.monthly,
  )

  sheet(
    'Top customers',
    [
      { header: t('name'), key: 'name', width: 28 },
      { header: t('phone'), key: 'phone' },
      { header: t('rentals'), key: 'rentals', width: 10 },
      { header: t('sales'), key: 'purchases', width: 10 },
      { header: t('spend'), key: 'spend', fmt: money },
    ],
    report.top_customers,
  )

  sheet(
    'Top vehicles',
    [
      { header: t('plateNo'), key: 'plate_no' },
      { header: t('vehicle'), key: 'name', width: 24 },
      { header: t('type'), key: 'type' },
      { header: t('bookingsCount'), key: 'bookings', width: 12 },
      { header: t('rentedDays'), key: 'rented_days', width: 12 },
      { header: t('rentalRevenue'), key: 'revenue', fmt: money },
      { header: t('expenses'), key: 'expenses', fmt: money },
    ],
    report.top_vehicles.map((r) => ({ ...r, type: t(`type.${r.type}`) })),
  )

  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `mekong-wheels-report-${report.from}-to-${report.to}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
