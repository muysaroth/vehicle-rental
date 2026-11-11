import { useState } from 'react'
import type { FormEvent } from 'react'
import { HiOutlineCheckCircle } from 'react-icons/hi2'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { Button, ErrorNote, Field, Modal } from './ui'

/** Change your own password. The server signs out every other session. */
export function ChangePassword({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const mismatch = confirm !== '' && next !== confirm

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (mismatch) return
    setBusy(true)
    setError(null)
    try {
      await api.put('/auth/password', { current_password: current, password: next, password_confirmation: confirm })
      setDone(true)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('changePassword')}
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            {t('close')}
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button variant="primary" disabled={busy || !current || next.length < 8 || next !== confirm} onClick={() => void submit()}>
              {t('save')}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <HiOutlineCheckCircle className="size-7" />
          </div>
          <p className="text-sm">{t('passwordChanged')}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <Field label={t('currentPassword')}>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          </Field>
          <Field label={`${t('newPassword')} · ${t('passwordRule')}`}>
            <input type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label={t('confirmPassword')}>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {mismatch && <p className="text-sm text-red-600">{t('passwordMismatch')}</p>}
          <ErrorNote error={error} />
          {/* Lets Enter submit the form. */}
          <button type="submit" hidden />
        </form>
      )}
    </Modal>
  )
}
