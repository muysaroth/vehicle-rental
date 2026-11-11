import { useState } from 'react'
import { Badge, Button, Empty, ErrorNote, Field, Modal, PageHeader, cx, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { date, dateTime, isoDate, money, vehicleName } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { Customer, PaymentMethod, Sale, SaleMethod, Vehicle } from '@/lib/types'

const SALE_METHODS: SaleMethod[] = ['cash', 'bank', 'installment']
const PAY_METHODS: PaymentMethod[] = ['cash', 'bank', 'card']

export default function Sales() {
  const { t } = useI18n()
  const { canManage } = useAuth()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const { data, reload, error } = useLoad(() => api.get<Sale[]>('/sales', { search }), [search])

  const totals = (data ?? []).reduce((a, s) => ({ total: a.total + s.total, profit: a.profit + s.total - s.cost, balance: a.balance + s.balance }), { total: 0, profit: 0, balance: 0 })

  return (
    <div>
      <PageHeader title={t('sales')}>
        <input placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
        <Button variant="primary" onClick={() => setCreating(true)}>
          + {t('newSale')}
        </Button>
      </PageHeader>

      <ErrorNote error={error} />

      <div className="card overflow-x-auto">
        {data && data.length === 0 ? (
          <Empty />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('saleNo')}</th>
                <th>{t('date')}</th>
                <th>{t('customer')}</th>
                <th>{t('vehicle')}</th>
                <th>{t('method')}</th>
                <th className="num">{t('total')}</th>
                {canManage && <th className="num">{t('profit')}</th>}
                <th className="num">{t('balance')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((s) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => setOpenId(s.id)}>
                  <td className="font-mono text-xs">{s.sale_no}</td>
                  <td>{date(s.sale_date)}</td>
                  <td>{s.customer?.name}</td>
                  <td>
                    <div>{vehicleName(s.vehicle)}</div>
                    <div className="text-xs text-muted">
                      {s.vehicle?.plate_no} · {s.vehicle && t(`type.${s.vehicle.type}`)}
                    </div>
                  </td>
                  <td>{t(`pay.${s.payment_method}`)}</td>
                  <td className="num">{money(s.total)}</td>
                  {canManage && <td className="num text-emerald-700">{money(s.total - s.cost)}</td>}
                  <td className={cx('num', s.balance > 0 && 'font-medium text-amber-700')}>{money(s.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={5} className="px-3 py-2">
                  {t('total')}
                </td>
                <td className="num px-3 py-2">{money(totals.total)}</td>
                {canManage && <td className="num px-3 py-2 text-emerald-700">{money(totals.profit)}</td>}
                <td className="num px-3 py-2">{money(totals.balance)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {creating && (
        <NewSale
          onClose={() => setCreating(false)}
          onCreated={(s) => {
            setCreating(false)
            void reload()
            setOpenId(s.id)
          }}
        />
      )}
      {openId !== null && (
        <SaleDetail
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void reload()}
          onDeleted={() => {
            setOpenId(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}

function NewSale({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Sale) => void }) {
  const { t } = useI18n()
  const vehicles = useLoad(() => api.get<Vehicle[]>('/vehicles', { purpose: 'sale', status: 'available' }), [])
  const customers = useLoad(() => api.get<Customer[]>('/customers'), [])
  const [vehicleId, setVehicleId] = useState<number | ''>('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [saleDate, setSaleDate] = useState(isoDate())
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('0')
  const [method, setMethod] = useState<SaleMethod>('cash')
  const [paid, setPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const total = Math.max(0, Number(price || 0) - Number(discount || 0))

  const pick = (id: number | '') => {
    setVehicleId(id)
    const v = vehicles.data?.find((x) => x.id === id)
    if (v) setPrice(String(v.sale_price))
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const s = await api.post<Sale>('/sales', {
        customer_id: customerId,
        vehicle_id: vehicleId,
        sale_date: saleDate,
        price: Number(price),
        discount: Number(discount || 0),
        payment_method: method,
        amount_paid: paid === '' ? null : Number(paid),
        notes: notes || null,
      })
      onCreated(s)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('newSale')}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={busy || !vehicleId || !customerId} onClick={() => void submit()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('vehicle')} className="col-span-2">
          <select value={vehicleId} onChange={(e) => pick(Number(e.target.value) || '')}>
            <option value="">—</option>
            {vehicles.data?.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleName(v)} {v.year} · {v.plate_no} · {money(v.sale_price)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('customer')} className="col-span-2">
          <select value={customerId} onChange={(e) => setCustomerId(Number(e.target.value) || '')}>
            <option value="">—</option>
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('date')}>
          <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </Field>
        <Field label={t('method')}>
          <select value={method} onChange={(e) => setMethod(e.target.value as SaleMethod)}>
            {SALE_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`pay.${m}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('price')}>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={t('discount')}>
          <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </Field>
        <Field label={`${t('amountPaid')} ${method === 'installment' ? '' : t('optional')}`}>
          <input type="number" min="0" step="0.01" placeholder={method === 'installment' ? '0' : String(total)} value={paid} onChange={(e) => setPaid(e.target.value)} />
        </Field>
        <div className="flex items-end justify-end text-lg font-semibold">
          {t('total')}: {money(total)}
        </div>
        <Field label={t('notes')} className="col-span-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
    </Modal>
  )
}

function SaleDetail({ id, onClose, onChanged, onDeleted }: { id: number; onClose: () => void; onChanged: () => void; onDeleted: () => void }) {
  const { t } = useI18n()
  const { canManage } = useAuth()
  const { data: s, setData } = useLoad(() => api.get<Sale>(`/sales/${id}`), [id])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<unknown>(null)

  if (!s) return <Modal open onClose={onClose} title="…">{t('loading')}</Modal>

  const pay = async () => {
    setError(null)
    try {
      await api.post(`/sales/${s.id}/pay`, { amount: Number(amount), method })
      setData(await api.get<Sale>(`/sales/${s.id}`))
      setAmount('')
      onChanged()
    } catch (e) {
      setError(e)
    }
  }

  const undo = async () => {
    if (!confirm(t('undoSale') + '?')) return
    try {
      await api.del(`/sales/${s.id}`)
      onDeleted()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${s.sale_no} · ${vehicleName(s.vehicle)}`}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted">{t('customer')}</dt>
        <dd>
          {s.customer?.name} · {s.customer?.phone}
        </dd>
        <dt className="text-muted">{t('vehicle')}</dt>
        <dd>
          {vehicleName(s.vehicle)} {s.vehicle?.year} · {s.vehicle?.plate_no}
        </dd>
        <dt className="text-muted">{t('date')}</dt>
        <dd>{date(s.sale_date)}</dd>
        <dt className="text-muted">{t('method')}</dt>
        <dd>
          <Badge tone={s.payment_method === 'installment' ? 'amber' : 'green'}>{t(`pay.${s.payment_method}`)}</Badge>
        </dd>
        <dt className="text-muted">{t('price')}</dt>
        <dd>{money(s.price)}</dd>
        <dt className="text-muted">{t('discount')}</dt>
        <dd>{money(s.discount)}</dd>
        <dt className="font-semibold">{t('total')}</dt>
        <dd className="font-semibold">{money(s.total)}</dd>
        {canManage && (
          <>
            <dt className="text-muted">{t('cost')}</dt>
            <dd>{money(s.cost)}</dd>
            <dt className="text-muted">{t('profit')}</dt>
            <dd className="text-emerald-700">{money(s.total - s.cost)}</dd>
          </>
        )}
        <dt className="text-muted">{t('paid')}</dt>
        <dd>{money(s.paid)}</dd>
        <dt className="text-muted">{t('balance')}</dt>
        <dd className={s.balance > 0 ? 'font-semibold text-amber-700' : ''}>{money(s.balance)}</dd>
      </dl>

      <h4 className="mt-4 mb-2 text-sm font-semibold">{t('payments')}</h4>
      <ul className="divide-y divide-line rounded-lg border border-line text-sm">
        {s.payments?.map((p) => (
          <li key={p.id} className="flex justify-between px-3 py-2">
            <span>
              {dateTime(p.paid_at)} · {t(`pay.${p.method}`)} {p.reference && <span className="text-muted">· {p.reference}</span>}
            </span>
            <span className="tabular-nums">{money(p.amount)}</span>
          </li>
        ))}
      </ul>

      {s.balance > 0 && (
        <div className="mt-4 flex items-end gap-2">
          <Field label={t('amount')} className="flex-1">
            <input type="number" min="0" step="0.01" placeholder={String(s.balance)} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAY_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`pay.${m}`)}
              </option>
            ))}
          </select>
          <Button variant="primary" disabled={!amount} onClick={() => void pay()}>
            {t('pay')}
          </Button>
        </div>
      )}

      <div className="mt-3">
        <ErrorNote error={error} />
      </div>

      {canManage && (
        <div className="mt-4 border-t border-line pt-3 text-right">
          <Button variant="danger" size="sm" onClick={() => void undo()}>
            {t('undoSale')}
          </Button>
        </div>
      )}
    </Modal>
  )
}
