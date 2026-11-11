import { useState } from 'react'
import { HiOutlineCheckCircle, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash, HiOutlineWrenchScrewdriver } from 'react-icons/hi2'
import { TYPE_COLORS } from '@/components/charts'
import {
  Button,
  Empty,
  ErrorNote,
  Field,
  IconButton,
  Loading,
  Modal,
  PageHeader,
  RowActions,
  SearchInput,
  Toolbar,
  VehicleStatusBadge,
  useLoad,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { money, num } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { VEHICLE_TYPES } from '@/lib/types'
import type { Vehicle, VehiclePurpose, VehicleStatus } from '@/lib/types'

const STATUSES: VehicleStatus[] = ['available', 'reserved', 'rented', 'maintenance', 'sold']
const PURPOSES: VehiclePurpose[] = ['rent', 'sale', 'both']

type Draft = Omit<Vehicle, 'id' | 'status' | 'rentals_count'>

const blank: Draft = {
  plate_no: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  type: 'car',
  color: '',
  seats: 5,
  purpose: 'rent',
  daily_rate: 0,
  sale_price: 0,
  purchase_cost: 0,
  purchased_on: null,
  mileage: 0,
  notes: '',
}

export default function Vehicles() {
  const { t } = useI18n()
  const { canManage } = useAuth()
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [purpose, setPurpose] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const [error, setError] = useState<unknown>(null)

  const { data, reload, error: loadError } = useLoad(
    () => api.get<Vehicle[]>('/vehicles', { type, status, purpose, search }),
    [type, status, purpose, search],
  )

  const setService = async (v: Vehicle, next: 'available' | 'maintenance') => {
    setError(null)
    try {
      await api.put(`/vehicles/${v.id}`, { ...v, status: next })
      await reload()
    } catch (e) {
      setError(e)
    }
  }

  const remove = async (v: Vehicle) => {
    if (!confirm(t('confirmDelete'))) return
    setError(null)
    try {
      await api.del(`/vehicles/${v.id}`)
      await reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <div>
      <PageHeader title={t('vehicles')} description={data ? t('vehicleSummary', { n: data.length }) : undefined}>
        {canManage && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            <HiOutlinePlus />
            {t('addVehicle')}
          </Button>
        )}
      </PageHeader>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} className="w-full sm:w-64" />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{t('type')}: {t('all')}</option>
          {VEHICLE_TYPES.map((v) => (
            <option key={v} value={v}>
              {t(`type.${v}`)}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('status')}: {t('all')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`vstatus.${s}`)}
            </option>
          ))}
        </select>
        <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="">{t('purpose')}: {t('all')}</option>
          <option value="rent">{t('purpose.rent')}</option>
          <option value="sale">{t('purpose.sale')}</option>
        </select>
      </Toolbar>

      <ErrorNote error={error ?? loadError} />

      <div className="card overflow-x-auto">
        {!data && !loadError ? (
          <Loading />
        ) : data && data.length === 0 ? (
          <Empty />
        ) : (
          <table className="table table-compact">
            <thead>
              <tr>
                <th>{t('plateNo')}</th>
                <th>{t('vehicle')}</th>
                <th>{t('type')}</th>
                <th className="num">{t('dailyRate')}</th>
                <th className="num">{t('salePrice')}</th>
                {canManage && <th className="num">{t('purchaseCost')}</th>}
                <th className="num hidden 2xl:table-cell">{t('mileage')}</th>
                <th className="num">{t('rentals')}</th>
                <th>{t('status')}</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {data?.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs whitespace-nowrap">{v.plate_no}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="font-medium">
                      {v.brand} {v.model}
                    </div>
                    <div className="text-xs text-muted">
                      {v.year} · {v.color} · {v.seats} {t('seats')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: TYPE_COLORS[v.type] }} />
                      {t(`type.${v.type}`)}
                    </div>
                    <div className="pl-4 text-xs text-muted">{t(`purpose.${v.purpose}`)}</div>
                  </td>
                  <td className="num">{v.purpose === 'sale' ? <span className="text-muted">—</span> : money(v.daily_rate)}</td>
                  <td className="num">{v.purpose === 'rent' ? <span className="text-muted">—</span> : money(v.sale_price)}</td>
                  {canManage && <td className="num text-muted">{money(v.purchase_cost)}</td>}
                  <td className="num hidden text-muted 2xl:table-cell">{num(v.mileage)}</td>
                  <td className="num">{v.rentals_count ?? 0}</td>
                  <td>
                    <VehicleStatusBadge status={v.status} />
                  </td>
                  {canManage && (
                    <td>
                      <RowActions>
                        {v.status !== 'sold' && (
                          <>
                            {v.status === 'maintenance' ? (
                              <IconButton tone="success" label={t('setAvailable')} icon={HiOutlineCheckCircle} onClick={() => void setService(v, 'available')} />
                            ) : (
                              v.status !== 'rented' && <IconButton label={t('setMaintenance')} icon={HiOutlineWrenchScrewdriver} onClick={() => void setService(v, 'maintenance')} />
                            )}
                            <IconButton label={t('edit')} icon={HiOutlinePencilSquare} onClick={() => setEditing(v)} />
                          </>
                        )}
                        {!v.rentals_count && v.status !== 'sold' && <IconButton tone="danger" label={t('delete')} icon={HiOutlineTrash} onClick={() => void remove(v)} />}
                      </RowActions>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <VehicleForm
          vehicle={editing === 'new' ? null : editing}
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

function VehicleForm({ vehicle, onClose, onSaved }: { vehicle: Vehicle | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<Draft>(vehicle ? { ...vehicle } : blank)
  const [error, setError] = useState<unknown>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    setError(null)
    try {
      if (vehicle) await api.put(`/vehicles/${vehicle.id}`, draft)
      else await api.post('/vehicles', draft)
      onSaved()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={vehicle ? t('editVehicle') : t('addVehicle')}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={() => void save()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Field label={t('plateNo')}>
          <input value={draft.plate_no} onChange={(e) => set('plate_no', e.target.value)} />
        </Field>
        <Field label={t('brand')}>
          <input value={draft.brand} onChange={(e) => set('brand', e.target.value)} />
        </Field>
        <Field label={t('model')}>
          <input value={draft.model} onChange={(e) => set('model', e.target.value)} />
        </Field>
        <Field label={t('year')}>
          <input type="number" value={draft.year} onChange={(e) => set('year', Number(e.target.value))} />
        </Field>
        <Field label={t('type')}>
          <select value={draft.type} onChange={(e) => set('type', e.target.value as Draft['type'])}>
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`type.${v}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('purpose')}>
          <select value={draft.purpose} onChange={(e) => set('purpose', e.target.value as VehiclePurpose)}>
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {t(`purpose.${p}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('color')}>
          <input value={draft.color ?? ''} onChange={(e) => set('color', e.target.value)} />
        </Field>
        <Field label={t('seats')}>
          <input type="number" min="1" value={draft.seats} onChange={(e) => set('seats', Number(e.target.value))} />
        </Field>
        <Field label={t('dailyRate')}>
          <input type="number" min="0" step="0.01" value={draft.daily_rate} onChange={(e) => set('daily_rate', Number(e.target.value))} />
        </Field>
        <Field label={t('salePrice')}>
          <input type="number" min="0" step="0.01" value={draft.sale_price} onChange={(e) => set('sale_price', Number(e.target.value))} />
        </Field>
        <Field label={t('purchaseCost')}>
          <input type="number" min="0" step="0.01" value={draft.purchase_cost} onChange={(e) => set('purchase_cost', Number(e.target.value))} />
        </Field>
        <Field label={t('purchasedOn')}>
          <input type="date" value={draft.purchased_on ?? ''} onChange={(e) => set('purchased_on', e.target.value || null)} />
        </Field>
        <Field label={t('mileage')}>
          <input type="number" min="0" value={draft.mileage} onChange={(e) => set('mileage', Number(e.target.value))} />
        </Field>
        <Field label={t('notes')} className="col-span-2 md:col-span-3">
          <input value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
    </Modal>
  )
}
