import { useState } from 'react'
import { BookingStatusBadge, Button, Empty, ErrorNote, Field, Modal, PageHeader, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { date, money, vehicleName } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { Customer } from '@/lib/types'

type Draft = Pick<Customer, 'name' | 'phone' | 'email' | 'id_card_no' | 'license_no' | 'address' | 'notes'>

const blank: Draft = { name: '', phone: '', email: '', id_card_no: '', license_no: '', address: '', notes: '' }

export default function Customers() {
  const { t } = useI18n()
  const { canManage } = useAuth()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [error, setError] = useState<unknown>(null)
  const { data, reload } = useLoad(() => api.get<Customer[]>('/customers', { search }), [search])

  const remove = async (c: Customer) => {
    if (!confirm(t('confirmDelete'))) return
    setError(null)
    try {
      await api.del(`/customers/${c.id}`)
      await reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <div>
      <PageHeader title={t('customers')}>
        <input placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
        <Button variant="primary" onClick={() => setEditing('new')}>
          + {t('addCustomer')}
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
                <th>{t('name')}</th>
                <th>{t('phone')}</th>
                <th>{t('idCard')}</th>
                <th>{t('license')}</th>
                <th>{t('address')}</th>
                <th className="num">{t('rentals')}</th>
                <th className="num">{t('sales')}</th>
                <th className="num">{t('spend')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button type="button" className="font-medium text-brand-700 dark:text-brand-300 hover:underline" onClick={() => setViewing(c.id)}>
                      {c.name}
                    </button>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.id_card_no ?? '—'}</td>
                  <td>{c.license_no ?? '—'}</td>
                  <td>{c.address ?? '—'}</td>
                  <td className="num">{c.bookings_count}</td>
                  <td className="num">{c.sales_count}</td>
                  <td className="num">{money(Number(c.rental_spend ?? 0) + Number(c.purchase_spend ?? 0))}</td>
                  <td className="whitespace-nowrap text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                      {t('edit')}
                    </Button>
                    {canManage && !c.bookings_count && !c.sales_count && (
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void remove(c)}>
                        {t('delete')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <CustomerForm
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}
      {viewing !== null && <CustomerHistory id={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function CustomerForm({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<Draft>(customer ? { ...customer } : blank)
  const [error, setError] = useState<unknown>(null)
  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    setError(null)
    try {
      const body = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v === '' ? null : v]))
      if (customer) await api.put(`/customers/${customer.id}`, body)
      else await api.post('/customers', body)
      onSaved()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? t('editCustomer') : t('addCustomer')}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={() => void save()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('name')} className="col-span-2">
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label={t('phone')}>
          <input value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label={t('email')}>
          <input value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label={t('idCard')}>
          <input value={draft.id_card_no ?? ''} onChange={(e) => set('id_card_no', e.target.value)} />
        </Field>
        <Field label={t('license')}>
          <input value={draft.license_no ?? ''} onChange={(e) => set('license_no', e.target.value)} />
        </Field>
        <Field label={t('address')} className="col-span-2">
          <input value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label={t('notes')} className="col-span-2">
          <textarea rows={2} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
    </Modal>
  )
}

function CustomerHistory({ id, onClose }: { id: number; onClose: () => void }) {
  const { t } = useI18n()
  const { data: c } = useLoad(() => api.get<Customer>(`/customers/${id}`), [id])

  return (
    <Modal open wide onClose={onClose} title={c ? `${c.name} · ${c.phone}` : '…'}>
      {!c ? (
        t('loading')
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              {t('bookings')} ({c.bookings?.length})
            </h4>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
              <table className="table">
                <tbody>
                  {c.bookings?.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-xs">{b.booking_no}</td>
                      <td>{vehicleName(b.vehicle)}</td>
                      <td>
                        {date(b.start_date)} → {date(b.end_date)}
                      </td>
                      <td className="num">{money(b.total)}</td>
                      <td>
                        <BookingStatusBadge status={b.status} endDate={b.end_date} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!!c.sales?.length && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">{t('sales')}</h4>
              <table className="table rounded-lg border border-line">
                <tbody>
                  {c.sales.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">{s.sale_no}</td>
                      <td>{vehicleName(s.vehicle)}</td>
                      <td>{date(s.sale_date)}</td>
                      <td className="num">{money(s.total)}</td>
                      <td className="num">
                        {t('balance')} {money(s.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
