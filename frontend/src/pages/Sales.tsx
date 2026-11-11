import { useState } from 'react'
import { HiOutlineArrowUturnLeft, HiOutlineBanknotes, HiOutlineClock, HiOutlineCreditCard, HiOutlineArrowTrendingUp, HiOutlinePlus } from 'react-icons/hi2'
import { Badge, Button, DetailList, Empty, ErrorNote, Field, Loading, Modal, PageHeader, SearchInput, Stat, Toolbar, cx, useLoad } from '@/components/ui'
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
        <Button variant="primary" onClick={() => setCreating(true)}>
          <HiOutlinePlus />
          {t('newSale')}
        </Button>
      </PageHeader>

      {data && data.length > 0 && (
        <div className={cx('mb-6 grid gap-4', canManage ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          <Stat icon={HiOutlineBanknotes} iconTone="blue" label={t('total')} value={money(totals.total)} hint={`${data.length} ${t('sales')}`} />
          {canManage && <Stat icon={HiOutlineArrowTrendingUp} iconTone="green" label={t('profit')} value={money(totals.profit)} tone="green" />}
          <Stat icon={HiOutlineClock} iconTone="amber" label={t('balance')} value={money(totals.balance)} />
        </div>
      )}

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} className="w-full sm:w-72" />
      </Toolbar>

      <ErrorNote error={error} />

      <div className="card overflow-x-auto">
        {!data && !error ? (
          <Loading />
        ) : data && data.length === 0 ? (
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
                  <td className="font-mono text-xs text-muted">{s.sale_no}</td>
                  <td className="whitespace-nowrap">{date(s.sale_date)}</td>
                  <td className="font-medium whitespace-nowrap">{s.customer?.name}</td>
                  <td className="whitespace-nowrap">
                    <div>{vehicleName(s.vehicle)}</div>
                    <div className="text-xs text-muted">
                      {s.vehicle?.plate_no} · {s.vehicle && t(`type.${s.vehicle.type}`)}
                    </div>
                  </td>
                  <td>
                    <Badge tone={s.payment_method === 'installment' ? 'amber' : 'slate'}>{t(`pay.${s.payment_method}`)}</Badge>
                  </td>
                  <td className="num font-medium">{money(s.total)}</td>
                  {canManage && <td className="num text-emerald-700">{money(s.total - s.cost)}</td>}
                  <td className={cx('num', s.balance > 0 ? 'font-medium text-amber-700' : 'text-muted')}>{money(s.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={5}>{t('total')}</td>
                <td className="num">{money(totals.total)}</td>
                {canManage && <td className="num text-emerald-700">{money(totals.profit)}</td>}
                <td className="num">{money(totals.balance)}</td>
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
      <div className="grid grid-cols-2 gap-4">
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
        <Field label={`${t('amountPaid')} ${method === 'installment' ? '' : t('optional')}`} className="col-span-2">
          <input type="number" min="0" step="0.01" placeholder={method === 'installment' ? '0' : String(total)} value={paid} onChange={(e) => setPaid(e.target.value)} />
        </Field>
        <Field label={t('notes')} className="col-span-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="col-span-2 flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
          <span className="text-sm font-medium text-muted">{t('total')}</span>
          <span className="text-xl font-semibold tabular-nums">{money(total)}</span>
        </div>
      </div>
      <div className="mt-4">
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

  if (!s)
    return (
      <Modal open onClose={onClose} title="…">
        <Loading />
      </Modal>
    )

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
      <DetailList
        rows={[
          [t('customer'), `${s.customer?.name ?? ''} · ${s.customer?.phone ?? ''}`],
          [t('vehicle'), `${vehicleName(s.vehicle)} ${s.vehicle?.year ?? ''} · ${s.vehicle?.plate_no ?? ''}`],
          [t('date'), date(s.sale_date)],
          [t('method'), <Badge key="m" tone={s.payment_method === 'installment' ? 'amber' : 'green'}>{t(`pay.${s.payment_method}`)}</Badge>],
          [t('price'), money(s.price)],
          [t('discount'), money(s.discount)],
          [t('total'), money(s.total), 'strong'],
          canManage && [t('cost'), money(s.cost)],
          canManage && [t('profit'), <span key="p" className="text-emerald-700">{money(s.total - s.cost)}</span>],
          [t('paid'), money(s.paid)],
          [t('balance'), money(s.balance), s.balance > 0 ? 'warn' : undefined],
        ]}
      />

      <h4 className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t('payments')}</h4>
      {s.payments?.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {s.payments.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 px-4 py-2.5">
              <span>
                {dateTime(p.paid_at)} · {t(`pay.${p.method}`)} {p.reference && <span className="text-muted">· {p.reference}</span>}
              </span>
              <span className="font-medium tabular-nums">{money(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{t('none')}</p>
      )}

      {s.balance > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface-2 p-4">
          <Field label={t('amount')} className="min-w-32 flex-1">
            <input type="number" min="0" step="0.01" placeholder={String(s.balance)} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={t('method')}>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`pay.${m}`)}
                </option>
              ))}
            </select>
          </Field>
          <Button variant="primary" disabled={!amount} onClick={() => void pay()}>
            <HiOutlineCreditCard />
            {t('pay')}
          </Button>
        </div>
      )}

      <div className="mt-4">
        <ErrorNote error={error} />
      </div>

      {canManage && (
        <div className="mt-5 flex justify-end border-t border-line pt-4">
          <Button variant="danger" size="sm" onClick={() => void undo()}>
            <HiOutlineArrowUturnLeft />
            {t('undoSale')}
          </Button>
        </div>
      )}
    </Modal>
  )
}
