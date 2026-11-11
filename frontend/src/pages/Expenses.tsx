import { useState } from 'react'
import { HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import { Meter } from '@/components/charts'
import { Arrow, Badge, Button, Empty, ErrorNote, Field, IconButton, Loading, Modal, PageHeader, RowActions, Stat, Toolbar, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { addDays, date, isoDate, money, vehicleName } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { EXPENSE_CATEGORIES } from '@/lib/types'
import type { Expense, ExpenseCategory, Vehicle } from '@/lib/types'

export default function Expenses() {
  const { t } = useI18n()
  const [from, setFrom] = useState(addDays(isoDate(), -30))
  const [to, setTo] = useState(isoDate())
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [error, setError] = useState<unknown>(null)
  const { data, reload, error: loadError } = useLoad(() => api.get<Expense[]>('/expenses', { from, to, category }), [from, to, category])
  const vehicles = useLoad(() => api.get<Vehicle[]>('/vehicles'), [])

  const total = (data ?? []).reduce((a, e) => a + e.amount, 0)
  const byCat = EXPENSE_CATEGORIES.map((c) => [c, (data ?? []).filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0)] as const)

  const remove = async (e: Expense) => {
    if (!confirm(t('confirmDelete'))) return
    try {
      await api.del(`/expenses/${e.id}`)
      await reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <PageHeader title={t('expenses')}>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <HiOutlinePlus />
          {t('addExpense')}
        </Button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label={t('total')} value={money(total)} hint={data ? `${data.length} ${t('expenses')}` : undefined} />
        {byCat.map(([c, v]) => (
          <div key={c} className="card p-4">
            <div className="truncate text-xs font-medium text-muted">{t(`cat.${c}`)}</div>
            <div className="mt-1.5 truncate text-lg font-semibold tabular-nums">{money(v)}</div>
            <div className="mt-2">
              <Meter value={total ? v / total : 0} color="#f59e0b" />
            </div>
          </div>
        ))}
      </div>

      <Toolbar>
        <div className="flex items-center gap-2">
          <input type="date" aria-label={t('from')} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Arrow />
          <input type="date" aria-label={t('to')} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">
            {t('category')}: {t('all')}
          </option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`cat.${c}`)}
            </option>
          ))}
        </select>
      </Toolbar>

      <ErrorNote error={error ?? loadError} />

      <div className="card overflow-x-auto">
        {!data && !loadError ? (
          <Loading />
        ) : data && data.length === 0 ? (
          <Empty />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('category')}</th>
                <th>{t('vehicle')}</th>
                <th>{t('description')}</th>
                <th className="num">{t('amount')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{date(e.spent_on)}</td>
                  <td>
                    <Badge>{t(`cat.${e.category}`)}</Badge>
                  </td>
                  <td>
                    {e.vehicle ? (
                      <>
                        <div>{vehicleName(e.vehicle)}</div>
                        <div className="text-xs text-muted">{e.vehicle.plate_no}</div>
                      </>
                    ) : (
                      <span className="text-muted">{t('generalExpense')}</span>
                    )}
                  </td>
                  <td className="text-muted">{e.description}</td>
                  <td className="num font-medium">{money(e.amount)}</td>
                  <td>
                    <RowActions>
                      <IconButton label={t('edit')} icon={HiOutlinePencilSquare} onClick={() => setEditing(e)} />
                      <IconButton tone="danger" label={t('delete')} icon={HiOutlineTrash} onClick={() => void remove(e)} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ExpenseForm
          expense={editing === 'new' ? null : editing}
          vehicles={vehicles.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}

function ExpenseForm({ expense, vehicles, onClose, onSaved }: { expense: Expense | null; vehicles: Vehicle[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [vehicleId, setVehicleId] = useState<number | ''>(expense?.vehicle_id ?? '')
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? isoDate())
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'maintenance')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [error, setError] = useState<unknown>(null)

  const save = async () => {
    setError(null)
    const body = { vehicle_id: vehicleId || null, spent_on: spentOn, category, amount: Number(amount), description: description || null }
    try {
      if (expense) await api.put(`/expenses/${expense.id}`, body)
      else await api.post('/expenses', body)
      onSaved()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('addExpense')}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={() => void save()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('date')}>
          <input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
        </Field>
        <Field label={t('category')}>
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`cat.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('vehicle')} className="col-span-2">
          <select value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value) || '')}>
            <option value="">{t('generalExpense')}</option>
            {vehicles
              .filter((v) => v.status !== 'sold')
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleName(v)} · {v.plate_no}
                </option>
              ))}
          </select>
        </Field>
        <Field label={t('amount')}>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t('description')}>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <ErrorNote error={error} />
      </div>
    </Modal>
  )
}
