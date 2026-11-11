import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlineArrowLeft, HiOutlinePrinter } from 'react-icons/hi2'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { Arrow, Button, ErrorNote, Loading, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { date, dateTime, money, vehicleName } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { Booking, Company, Payment, Sale } from '@/lib/types'

/**
 * Printable rental contract (/print/booking/:id) and sale invoice (/print/sale/:id).
 * Opened in a new tab from the booking / sale detail; the browser's Print dialog
 * can also save it as PDF. Always printed on a white A4 page, even in dark mode.
 */
export default function Print() {
  const { kind, id } = useParams()
  const { t } = useI18n()
  const company = useLoad(() => api.get<Company>('/company'), [])
  const doc = useLoad(() => api.get<Booking | Sale>(`/${kind === 'sale' ? 'sales' : 'bookings'}/${id}`), [kind, id])

  const error = company.error ?? doc.error

  return (
    <div className="min-h-full bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-2 px-4 print:hidden">
        <Button onClick={() => (window.history.length > 1 ? window.history.back() : window.close())}>
          <HiOutlineArrowLeft />
          {t('back')}
        </Button>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Button variant="primary" disabled={!doc.data || !company.data} onClick={() => window.print()}>
            <HiOutlinePrinter />
            {t('print')}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] px-4 print:max-w-none print:px-0">
        {error ? (
          <ErrorNote error={error} />
        ) : !doc.data || !company.data ? (
          <Loading />
        ) : (
          <article className="print-sheet rounded-lg bg-white p-[14mm] text-[13px] leading-relaxed text-slate-900 shadow-lg print:rounded-none print:p-0 print:shadow-none">
            {kind === 'sale' ? <SaleInvoice sale={doc.data as Sale} company={company.data} /> : <RentalContract booking={doc.data as Booking} company={company.data} />}
          </article>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

function Letterhead({ company, title, number, issued }: { company: Company; title: string; number: string; issued: string }) {
  const { t } = useI18n()
  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
      <div>
        <div className="text-xl font-bold">{company.name}</div>
        <div className="text-slate-600">{company.address}</div>
        <div className="text-slate-600">{[company.phone, company.email].filter(Boolean).join(' · ')}</div>
        {company.tax_id && <div className="text-slate-600">VAT TIN: {company.tax_id}</div>}
      </div>
      <div className="text-right">
        <div className="text-lg font-bold uppercase">{title}</div>
        <div className="font-mono text-base">{number}</div>
        <div className="text-slate-600">
          {t('issuedOn')}: {date(issued)}
        </div>
      </div>
    </header>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Rows({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <table className="w-full">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i}>
            <td className="w-40 py-0.5 pr-3 align-top text-slate-500">{k}</td>
            <td className="py-0.5 align-top">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Totals({ rows }: { rows: [ReactNode, number, ('strong' | 'muted')?][] }) {
  return (
    <table className="ml-auto w-72">
      <tbody>
        {rows.map(([k, v, style], i) => (
          <tr key={i} className={style === 'strong' ? 'border-t-2 border-slate-900 text-base font-bold' : ''}>
            <td className={`py-1 pr-4 ${style === 'muted' ? 'text-slate-500' : ''}`}>{k}</td>
            <td className="py-1 text-right tabular-nums">{money(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  const { t } = useI18n()
  if (!payments.length) return null
  return (
    <Block title={t('payments')}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-300 text-left text-slate-500">
            <th className="py-1 font-medium">{t('date')}</th>
            <th className="py-1 font-medium">{t('method')}</th>
            <th className="py-1 font-medium">{t('notes')}</th>
            <th className="py-1 text-right font-medium">{t('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="py-1">{dateTime(p.paid_at)}</td>
              <td className="py-1">{t(`pay.${p.method}`)}</td>
              <td className="py-1 text-slate-500">{p.reference ?? ''}</td>
              <td className="py-1 text-right tabular-nums">{money(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  )
}

function Signatures({ left, right }: { left: string; right: string }) {
  return (
    <div className="mt-14 grid grid-cols-2 gap-16 break-inside-avoid">
      {[left, right].map((label) => (
        <div key={label} className="border-t border-slate-400 pt-1.5 text-center text-slate-600">
          {label}
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- documents */

function RentalContract({ booking: b, company }: { booking: Booking; company: Company }) {
  const { t } = useI18n()
  const v = b.vehicle
  const c = b.customer

  return (
    <div className="space-y-6">
      <Letterhead company={company} title={t('rentalContract')} number={b.booking_no} issued={b.created_at ?? b.start_date} />

      <div className="grid grid-cols-2 gap-8">
        <Block title={t('renter')}>
          <Rows
            rows={[
              [t('name'), <strong key="n">{c?.name}</strong>],
              [t('phone'), c?.phone],
              [t('idCard'), c?.id_card_no ?? '—'],
              [t('license'), c?.license_no ?? '—'],
              [t('address'), c?.address ?? '—'],
            ]}
          />
        </Block>
        <Block title={t('vehicle')}>
          <Rows
            rows={[
              [t('vehicle'), <strong key="v">{`${vehicleName(v)} ${v?.year ?? ''}`}</strong>],
              [t('plateNo'), <span key="p" className="font-mono">{v?.plate_no}</span>],
              [t('color'), v?.color ?? '—'],
              [t('pickedUpAt'), b.pickup_mileage != null ? `${dateTime(b.picked_up_at)} · ${b.pickup_mileage} km` : dateTime(b.picked_up_at)],
              [t('returnedAt'), b.return_mileage != null ? `${dateTime(b.returned_at)} · ${b.return_mileage} km` : dateTime(b.returned_at)],
            ]}
          />
        </Block>
      </div>

      <Block title={t('period')}>
        <div className="flex items-center justify-between rounded border border-slate-300 px-4 py-2.5 text-base">
          <span>
            <strong>{date(b.start_date)}</strong> <Arrow className="text-slate-500" /> <strong>{date(b.end_date)}</strong>
          </span>
          <span>
            {b.days} {t('days')} × {money(b.daily_rate)}
          </span>
        </div>
      </Block>

      <Totals
        rows={[
          [t('subtotal'), b.days * b.daily_rate],
          ...(b.discount > 0 ? [[t('discount'), -b.discount, 'muted'] as [string, number, 'muted']] : []),
          ...(b.late_fee > 0 ? [[t('lateFee'), b.late_fee] as [string, number]] : []),
          [t('total'), b.total, 'strong'],
          [t('paid'), b.paid, 'muted'],
          [t('balance'), b.balance, 'strong'],
        ]}
      />

      <PaymentsTable payments={b.payments ?? []} />

      <Block title={t('rentalTerms')}>
        <ol className="list-decimal space-y-1 pl-5 text-slate-700">
          <li>{t('term1')}</li>
          <li>{t('term2')}</li>
          <li>{t('term3')}</li>
        </ol>
        {b.notes && (
          <p className="mt-2 text-slate-700">
            <span className="text-slate-500">{t('notes')}:</span> {b.notes}
          </p>
        )}
      </Block>

      <Signatures left={t('signatureRenter')} right={`${t('signatureStaff')} (${b.user?.name ?? ''})`} />
    </div>
  )
}

function SaleInvoice({ sale: s, company }: { sale: Sale; company: Company }) {
  const { t } = useI18n()
  const v = s.vehicle
  const c = s.customer

  return (
    <div className="space-y-6">
      <Letterhead company={company} title={t('saleInvoice')} number={s.sale_no} issued={s.sale_date} />

      <div className="grid grid-cols-2 gap-8">
        <Block title={t('buyer')}>
          <Rows
            rows={[
              [t('name'), <strong key="n">{c?.name}</strong>],
              [t('phone'), c?.phone],
              [t('idCard'), c?.id_card_no ?? '—'],
              [t('address'), c?.address ?? '—'],
            ]}
          />
        </Block>
        <Block title={t('details')}>
          <Rows
            rows={[
              [t('date'), date(s.sale_date)],
              [t('method'), t(`pay.${s.payment_method}`)],
            ]}
          />
        </Block>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y-2 border-slate-900 text-left">
            <th className="py-2 font-semibold">{t('vehicle')}</th>
            <th className="py-2 font-semibold">{t('plateNo')}</th>
            <th className="py-2 font-semibold">{t('mileage')}</th>
            <th className="py-2 text-right font-semibold">{t('price')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-300">
            <td className="py-2.5">
              <strong>{`${vehicleName(v)} ${v?.year ?? ''}`}</strong>
              <div className="text-slate-500">{[v && t(`type.${v.type}`), v?.color].filter(Boolean).join(' · ')}</div>
            </td>
            <td className="py-2.5 font-mono">{v?.plate_no}</td>
            <td className="py-2.5">{v?.mileage?.toLocaleString('en-US')} km</td>
            <td className="py-2.5 text-right tabular-nums">{money(s.price)}</td>
          </tr>
        </tbody>
      </table>

      <Totals
        rows={[
          [t('price'), s.price],
          ...(s.discount > 0 ? [[t('discount'), -s.discount, 'muted'] as [string, number, 'muted']] : []),
          [t('total'), s.total, 'strong'],
          [t('paid'), s.paid, 'muted'],
          [t('balance'), s.balance, 'strong'],
        ]}
      />

      <PaymentsTable payments={s.payments ?? []} />

      {s.notes && (
        <p className="text-slate-700">
          <span className="text-slate-500">{t('notes')}:</span> {s.notes}
        </p>
      )}

      <Signatures left={t('signatureBuyer')} right={`${t('signatureStaff')} (${s.user?.name ?? ''})`} />
      <p className="text-center text-slate-500">{t('thankYou')}</p>
    </div>
  )
}
