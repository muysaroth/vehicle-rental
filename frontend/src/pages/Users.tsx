import { useState } from 'react'
import { HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import { Badge, Button, ErrorNote, Field, IconButton, Loading, Modal, PageHeader, RowActions, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import type { Role, User } from '@/lib/types'

const ROLES: Role[] = ['admin', 'manager', 'staff']

const roleTone = { admin: 'violet', manager: 'blue', staff: 'slate' } as const

export default function Users() {
  const { t } = useI18n()
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [error, setError] = useState<unknown>(null)
  const { data, reload, error: loadError } = useLoad(() => api.get<User[]>('/users'), [])

  const remove = async (u: User) => {
    if (!confirm(t('confirmDelete'))) return
    setError(null)
    try {
      await api.del(`/users/${u.id}`)
      await reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <div>
      <PageHeader title={t('users')}>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <HiOutlinePlus />
          {t('addUser')}
        </Button>
      </PageHeader>
      <ErrorNote error={error ?? loadError} />
      <div className="card overflow-x-auto">
        {!data && !loadError ? (
          <Loading />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('email')}</th>
                <th>{t('role')}</th>
                <th>{t('status')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                        {u.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    <Badge tone={roleTone[u.role]}>{t(`role.${u.role}`)}</Badge>
                  </td>
                  <td>
                    {u.is_active ? (
                      <Badge dot tone="green">
                        {t('active')}
                      </Badge>
                    ) : (
                      <Badge dot>{t('inactive')}</Badge>
                    )}
                  </td>
                  <td>
                    <RowActions>
                      <IconButton label={t('edit')} icon={HiOutlinePencilSquare} onClick={() => setEditing(u)} />
                      <IconButton tone="danger" label={t('delete')} icon={HiOutlineTrash} onClick={() => void remove(u)} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing && (
        <UserForm
          user={editing === 'new' ? null : editing}
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

function UserForm({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(user?.role ?? 'staff')
  const [active, setActive] = useState(user?.is_active ?? true)
  const [error, setError] = useState<unknown>(null)

  const save = async () => {
    setError(null)
    const body = { name, email, role, is_active: active, password: password || null }
    try {
      if (user) await api.put(`/users/${user.id}`, body)
      else await api.post('/users', body)
      onSaved()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? t('editUser') : t('addUser')}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={() => void save()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t('name')}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('email')}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={`${t('password')} · ${t('passwordRule')}`}>
          <input type="password" autoComplete="new-password" minLength={8} value={password} placeholder={user ? t('passwordKeep') : ''} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label={t('role')}>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}`)}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {t('active')}
        </label>
        <ErrorNote error={error} />
      </div>
    </Modal>
  )
}
