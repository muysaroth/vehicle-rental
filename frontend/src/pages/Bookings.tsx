import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, BookingStatusBadge, Button, Empty, ErrorNote, Field, Modal, PageHeader, cx, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { addDays, date, dateTime, daysBetween, isoDate, money, vehicleName } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { VEHICLE_TYPES } from '@/lib/types'
import type { Booking, Customer, PaymentMethod, Vehicle, VehicleType } from '@/lib/types'

const TABS = ['', 'reserved', 'active', 'overdue', 'returned', 'cancelled'] as const
const METHODS: PaymentMethod[] = ['cash', 'bank', 'card']

export default function Bookings() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<(typeof TABS)[number]>('')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const creating = params.get('new') === '1'

  const { data, error, reload } = useLoad(() => api.get<Booking[]>('/bookings', { status, search }), [status, search])

  return (
    <div>
      <PageHeader title={t('bookings')}>
        <input placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
        <Button variant="primary" onClick={() => setParams({ new: '1' })}>
          + {t('newBooking')}
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={cx('rounded-lg px-3 py-1.5 text-sm', status === s ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}
          >
            {s ? t(`bstatus.${s}`) : t('all')}
          </button>
        ))}
      </div>

      <ErrorNote error={error} />

      <div className="card overflow-x-auto">
        {data && data.length === 0 ? (
          <Empty />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('bookingNo')}</th>
                <th>{t('customer')}</th>
                <th>{t('vehicle')}</th>
                <th>{t('startDate')}</th>
                <th>{t('endDate')}</th>
                <th className="num">{t('days')}</th>
                <th className="num">{t('total')}</th>
                <th className="num">{t('balance')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((b) => (
                <tr key={b.id} className="cursor-pointer" onClick={() => setOpenId(b.id)}>
                  <td className="font-mono text-xs">{b.booking_no}</td>
                  <td>
                    <div className="font-medium">{b.customer?.name}</div>
                    <div className="text-xs text-muted">{b.customer?.phone}</div>
                  </td>
                  <td>
                    <div>{vehicleName(b.vehicle)}</div>
                    <div className="text-xs text-muted">{b.vehicle?.plate_no}</div>
                  </td>
                  <td>{date(b.start_date)}</td>
                  <td>{date(b.end_date)}</td>
                  <td className="num">{b.days}</td>
                  <td className="num">{money(b.total)}</td>
                  <td className={cx('num', b.balance > 0 && 'font-medium text-amber-700')}>{money(b.balance)}</td>
                  <td>
                    <BookingStatusBadge status={b.status} endDate={b.end_date} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <NewBooking
          onClose={() => setParams({})}
          onCreated={(b) => {
            setParams({})
            void reload()
            setOpenId(b.id)
          }}
        />
      )}

      {openId !== null && <BookingDetail id={openId} onClose={() => setOpenId(null)} onChanged={() => void reload()} />}
    </div>
  )
}

/* ---------------------------------------------------------------- New booking */

function NewBooking({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Booking) => void }) {
  const { t } = useI18n()
  const today = isoDate()
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(addDays(today, 2))
  const [type, setType] = useState<VehicleType | ''>('')
  const [vehicleId, setVehicleId] = useState<number | null>(null)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [rate, setRate] = useState('')
  const [discount, setDiscount] = useState('0')
  const [deposit, setDeposit] = useState('0')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [quick, setQuick] = useState({ name: '', phone: '' })

  const validDates = start && end && end >= start
  const available = useLoad(
    () => (validDates ? api.get<Vehicle[]>('/vehicles/available', { start_date: start, end_date: end, type }) : Promise.resolve([])),
    [start, end, type],
  )
  const customers = useLoad(() => api.get<Customer[]>('/customers'), [])

  const days = validDates ? daysBetween(start, end) : 0
  const gross = days * Number(rate || 0)
  const total = Math.max(0, gross - Number(discount || 0))

  const addCustomer = async () => {
    try {
      const c = await api.post<Customer>('/customers', quick)
      await customers.reload()
      setCustomerId(c.id)
      setQuick({ name: '', phone: '' })
    } catch (e) {
      setError(e)
    }
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const b = await api.post<Booking>('/bookings', {
        customer_id: customerId,
        vehicle_id: vehicleId,
        start_date: start,
        end_date: end,
        daily_rate: Number(rate),
        discount: Number(discount || 0),
        deposit: Number(deposit || 0),
        payment_method: method,
        notes: notes || null,
      })
      onCreated(b)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={t('newBooking')}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={busy || !vehicleId || !customerId || !validDates} onClick={() => void submit()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('startDate')}>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label={t('endDate')}>
              <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('availableVehicles')} {available.data && `(${available.data.length})`}
              </span>
              <select value={type} onChange={(e) => setType(e.target.value as VehicleType | '')} className="py-1 text-xs">
                <option value="">{t('all')}</option>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`type.${v}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-line p-1">
              {!validDates && <p className="p-3 text-sm text-muted">{t('checkAvailability')}</p>}
              {validDates && available.data?.length === 0 && <p className="p-3 text-sm text-muted">{t('noAvailable')}</p>}
              {available.data?.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVehicleId(v.id)
                    setRate(String(v.daily_rate))
                  }}
                  className={cx(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                    v.id === vehicleId ? 'bg-brand-50 ring-2 ring-brand-500' : 'hover:bg-slate-50',
                  )}
                >
                  <span>
                    <span className="font-medium">{vehicleName(v)}</span>{' '}
                    <span className="text-xs text-muted">
                      {v.plate_no} · {t(`type.${v.type}`)} · {v.seats} {t('seats')}
                    </span>
                  </span>
                  <span className="tabular-nums">{money(v.daily_rate)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Field label={t('customer')}>
            <select value={customerId} onChange={(e) => setCustomerId(Number(e.target.value) || '')}>
              <option value="">—</option>
              {customers.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2">
            <input placeholder={t('name')} value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} className="min-w-0 flex-1" />
            <input placeholder={t('phone')} value={quick.phone} onChange={(e) => setQuick({ ...quick, phone: e.target.value })} className="w-32" />
            <Button size="sm" className="h-auto" disabled={!quick.name || !quick.phone} onClick={() => void addCustomer()}>
              + {t('add')}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('dailyRate')}>
              <input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
            </Field>
            <Field label={t('discount')}>
              <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <Field label={t('deposit')}>
              <input type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </Field>
            <Field label={t('method')}>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`pay.${m}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t('notes')}>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <dl className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <dt>
                {t('subtotal')} ({days} {t('days')} × {money(Number(rate || 0))})
              </dt>
              <dd className="tabular-nums">{money(gross)}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>{t('discount')}</dt>
              <dd className="tabular-nums">−{money(Number(discount || 0))}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1 text-base font-semibold">
              <dt>{t('total')}</dt>
              <dd className="tabular-nums">{money(total)}</dd>
            </div>
          </dl>
          <ErrorNote error={error} />
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------- Booking detail */

function BookingDetail({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n()
  const { data: b, setData, error: loadError } = useLoad(() => api.get<Booking>(`/bookings/${id}`), [id])
  const [mode, setMode] = useState<'view' | 'pickup' | 'return' | 'pay'>('view')
  const [mileage, setMileage] = useState('')
  const [lateFee, setLateFee] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  if (!b) return <Modal open onClose={onClose} title="…">{loadError ? <ErrorNote error={loadError} /> : t('loading')}</Modal>

  const today = isoDate()
  const late = b.status === 'active' && b.end_date < today ? daysBetween(b.end_date, today) - 1 : 0
  const suggestedLate = late * b.daily_rate
  const returnTotal = b.days * b.daily_rate - b.discount + Number(lateFee === '' ? suggestedLate : lateFee)

  const act = async (path: string, body: object = {}) => {
    setBusy(true)
    setError(null)
    try {
      const fresh = await api.post<Booking>(`/bookings/${b.id}/${path}`, body)
      const full = await api.get<Booking>(`/bookings/${fresh.id}`)
      setData(full)
      setMode('view')
      setAmount('')
      onChanged()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const open = (m: typeof mode) => {
    setError(null)
    setMode(m)
    setMileage(String(b.vehicle?.mileage ?? ''))
    setLateFee('')
    setAmount(m === 'pay' ? String(b.balance) : '')
  }

  return (
    <Modal open wide onClose={onClose} title={`${b.booking_no} · ${b.customer?.name}`}>
      <div className="grid gap-5 md:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">{t('status')}</dt>
          <dd>
            <BookingStatusBadge status={b.status} endDate={b.end_date} /> {late > 0 && <Badge tone="red">{t('lateDays', { n: late })}</Badge>}
          </dd>
          <dt className="text-muted">{t('customer')}</dt>
          <dd>
            {b.customer?.name} · {b.customer?.phone}
            {b.customer?.license_no && <div className="text-xs text-muted">{t('license')}: {b.customer.license_no}</div>}
          </dd>
          <dt className="text-muted">{t('vehicle')}</dt>
          <dd>
            {vehicleName(b.vehicle)} · {b.vehicle?.plate_no}
          </dd>
          <dt className="text-muted">{t('period')}</dt>
          <dd>
            {date(b.start_date)} → {date(b.end_date)} ({b.days} {t('days')})
          </dd>
          <dt className="text-muted">{t('dailyRate')}</dt>
          <dd>{money(b.daily_rate)}</dd>
          <dt className="text-muted">{t('discount')}</dt>
          <dd>{money(b.discount)}</dd>
          {b.late_fee > 0 && (
            <>
              <dt className="text-muted">{t('lateFee')}</dt>
              <dd>{money(b.late_fee)}</dd>
            </>
          )}
          <dt className="font-semibold">{t('total')}</dt>
          <dd className="font-semibold">{money(b.total)}</dd>
          <dt className="text-muted">{t('paid')}</dt>
          <dd>{money(b.paid)}</dd>
          <dt className="text-muted">{t('balance')}</dt>
          <dd className={b.balance > 0 ? 'font-semibold text-amber-700' : ''}>{money(b.balance)}</dd>
          <dt className="text-muted">{t('pickedUpAt')}</dt>
          <dd>
            {dateTime(b.picked_up_at)} {b.pickup_mileage != null && `· ${b.pickup_mileage} km`}
          </dd>
          <dt className="text-muted">{t('returnedAt')}</dt>
          <dd>
            {dateTime(b.returned_at)} {b.return_mileage != null && `· ${b.return_mileage} km`}
          </dd>
          <dt className="text-muted">{t('staff')}</dt>
          <dd>{b.user?.name}</dd>
          {b.notes && (
            <>
              <dt className="text-muted">{t('notes')}</dt>
              <dd>{b.notes}</dd>
            </>
          )}
        </dl>

        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">{t('payments')}</h4>
            {b.payments?.length ? (
              <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex justify-between px-3 py-2">
                    <span>
                      {dateTime(p.paid_at)} · {t(`pay.${p.method}`)} {p.reference && <span className="text-muted">· {p.reference}</span>}
                    </span>
                    <span className="tabular-nums">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('none')}</p>
            )}
          </div>

          {mode === 'view' && (
            <div className="flex flex-wrap gap-2">
              {b.status === 'reserved' && (
                <Button variant="primary" onClick={() => open('pickup')}>
                  {t('pickup')}
                </Button>
              )}
              {b.status === 'active' && (
                <Button variant="success" onClick={() => open('return')}>
                  {t('return')}
                </Button>
              )}
              {b.status !== 'cancelled' && b.balance > 0 && <Button onClick={() => open('pay')}>{t('pay')}</Button>}
              {b.status === 'reserved' && (
                <Button variant="danger" disabled={busy} onClick={() => confirm(t('cancelBooking') + '?') && void act('cancel')}>
                  {t('cancelBooking')}
                </Button>
              )}
            </div>
          )}

          {mode === 'pickup' && (
            <div className="space-y-3 rounded-lg border border-line p-3">
              <Field label={t('mileage')}>
                <input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <Button variant="primary" disabled={busy} onClick={() => void act('pickup', { mileage: mileage ? Number(mileage) : null })}>
                  {t('pickup')}
                </Button>
                <Button onClick={() => setMode('view')}>{t('cancel')}</Button>
              </div>
            </div>
          )}

          {mode === 'return' && (
            <div className="space-y-3 rounded-lg border border-line p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('mileage')}>
                  <input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
                </Field>
                <Field label={`${t('lateFee')}${late ? ` (${t('lateDays', { n: late })})` : ''}`}>
                  <input type="number" min="0" step="0.01" placeholder={String(suggestedLate)} value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
                </Field>
                <Field label={`${t('collectNow')} (${t('balance')} ${money(returnTotal - b.paid)})`}>
                  <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label={t('method')}>
                  <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {t(`pay.${m}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  disabled={busy}
                  onClick={() =>
                    void act('return', {
                      mileage: mileage ? Number(mileage) : null,
                      late_fee: lateFee === '' ? null : Number(lateFee),
                      payment_amount: amount ? Number(amount) : null,
                      payment_method: method,
                    })
                  }
                >
                  {t('return')} · {money(returnTotal)}
                </Button>
                <Button onClick={() => setMode('view')}>{t('cancel')}</Button>
              </div>
            </div>
          )}

          {mode === 'pay' && (
            <div className="space-y-3 rounded-lg border border-line p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('amount')}>
                  <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label={t('method')}>
                  <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {t(`pay.${m}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" disabled={busy || !amount} onClick={() => void act('pay', { amount: Number(amount), method })}>
                  {t('pay')}
                </Button>
                <Button onClick={() => setMode('view')}>{t('cancel')}</Button>
              </div>
            </div>
          )}

          <ErrorNote error={error} />
        </div>
      </div>
    </Modal>
  )
}
