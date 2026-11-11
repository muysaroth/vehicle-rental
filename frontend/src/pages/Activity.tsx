import { useState } from 'react'
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2'
import { Arrow, Badge, Button, Empty, ErrorNote, Loading, PageHeader, SearchInput, Toolbar, useLoad } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import type { ActivityAction, ActivityLog, Paginated, User } from '@/lib/types'

const ACTIONS: ActivityAction[] = ['created', 'updated', 'deleted', 'login', 'logout', 'password']
const SUBJECTS = ['Booking', 'Sale', 'Payment', 'Vehicle', 'Customer', 'Expense', 'User']

const actionTone: Record<ActivityAction, 'green' | 'blue' | 'red' | 'slate' | 'violet' | 'amber'> = {
  created: 'green',
  updated: 'blue',
  deleted: 'red',
  login: 'slate',
  logout: 'slate',
  password: 'amber',
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function Changes({ log }: { log: ActivityLog }) {
  if (!log.changes) return <span className="text-muted">—</span>
  const entries = Object.entries(log.changes)

  return (
    <ul className="space-y-0.5 text-xs">
      {entries.slice(0, 6).map(([field, value]) => (
        <li key={field} className="truncate">
          <span className="font-medium text-muted">{field}:</span>{' '}
          {log.action === 'updated' && Array.isArray(value) ? (
            <>
              <span className="text-red-600 line-through decoration-red-300">{show(value[0])}</span> <Arrow /> <span className="text-emerald-700">{show(value[1])}</span>
            </>
          ) : (
            show(value)
          )}
        </li>
      ))}
      {entries.length > 6 && <li className="text-muted">+{entries.length - 6}</li>}
    </ul>
  )
}

export default function Activity() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [subject, setSubject] = useState('')
  const [page, setPage] = useState(1)

  const users = useLoad(() => api.get<User[]>('/users'), [])
  const { data, error } = useLoad(
    () => api.get<Paginated<ActivityLog>>('/activity', { search, user_id: userId, action, subject_type: subject, page }),
    [search, userId, action, subject, page],
  )

  // Any filter change starts again from page 1.
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  return (
    <div>
      <PageHeader title={t('activity')} description={t('activityHelp')} />

      <Toolbar>
        <SearchInput value={search} onChange={filter(setSearch)} className="w-full sm:w-64" />
        <select value={userId} onChange={(e) => filter(setUserId)(e.target.value)}>
          <option value="">
            {t('user')}: {t('all')}
          </option>
          {users.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select value={action} onChange={(e) => filter(setAction)(e.target.value)}>
          <option value="">
            {t('action')}: {t('all')}
          </option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {t(`act.${a}`)}
            </option>
          ))}
        </select>
        <select value={subject} onChange={(e) => filter(setSubject)(e.target.value)}>
          <option value="">
            {t('record')}: {t('all')}
          </option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {t(`subj.${s}`)}
            </option>
          ))}
        </select>
      </Toolbar>

      <ErrorNote error={error} />

      <div className="card overflow-x-auto">
        {!data && !error ? (
          <Loading />
        ) : data && data.data.length === 0 ? (
          <Empty />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('when')}</th>
                <th>{t('user')}</th>
                <th>{t('action')}</th>
                <th>{t('record')}</th>
                <th>{t('changes')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap">
                    <div>{new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-muted">{new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="font-medium">{log.user_name ?? '—'}</div>
                    {log.ip && <div className="font-mono text-xs text-muted">{log.ip}</div>}
                  </td>
                  <td>
                    <Badge dot tone={actionTone[log.action]}>
                      {t(`act.${log.action}`)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap">
                    {log.subject_type ? (
                      <>
                        <div className="text-xs text-muted">{t(`subj.${log.subject_type}`)}</div>
                        <div className="font-medium">{log.subject_label}</div>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="max-w-md">
                    <Changes log={log} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
          <span>{t('pageOf', { page: data.current_page, pages: data.last_page })}</span>
          <div className="flex gap-2">
            <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <HiOutlineChevronLeft />
              {t('previous')}
            </Button>
            <Button size="sm" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>
              {t('next')}
              <HiOutlineChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
