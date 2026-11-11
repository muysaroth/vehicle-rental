import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, ErrorNote, Field } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

const DEMO = [
  ['admin@rental.test', 'admin123', 'role.admin'],
  ['manager@rental.test', 'manager123', 'role.manager'],
  ['staff@rental.test', 'staff123', 'role.staff'],
] as const

export default function Login() {
  const { login } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="text-4xl">🚗</div>
          <h1 className="mt-2 text-2xl font-bold">{t('appName')}</h1>
          <p className="text-sm text-brand-100">{t('appTagline')}</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('signIn')}</h2>
            <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setLang(lang === 'km' ? 'en' : 'km')}>
              {lang === 'km' ? 'English' : 'ខ្មែរ'}
            </button>
          </div>
          <Field label={t('email')}>
            <input type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label={t('password')}>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorNote error={error} />
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {t('signIn')}
          </Button>

          <div className="border-t border-line pt-3">
            <div className="mb-2 text-xs font-medium text-muted">{t('demoAccounts')}</div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map(([e, p, role]) => (
                <button
                  key={e}
                  type="button"
                  className="rounded-lg border border-line px-2 py-1.5 text-xs hover:bg-slate-50"
                  onClick={() => {
                    setEmail(e)
                    setPassword(p)
                  }}
                >
                  {t(role)}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
