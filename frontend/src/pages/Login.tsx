import { useState } from 'react'
import type { FormEvent } from 'react'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { ThemeToggle } from '@/components/ThemeToggle'
import { HiOutlineKey } from 'react-icons/hi2'
import { Logo } from '@/components/Logo'
import { Button, ErrorNote, Field, Spinner, cx } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

const DEMO = [
  ['admin@rental.test', 'admin123', 'role.admin'],
  ['manager@rental.test', 'manager123', 'role.manager'],
  ['staff@rental.test', 'staff123', 'role.staff'],
] as const

// The one-click demo logins are for the classroom. Build with VITE_DEMO_ACCOUNTS=false for real use.
const SHOW_DEMO = import.meta.env.VITE_DEMO_ACCOUNTS !== 'false'

export default function Login() {
  const { login } = useAuth()
  const { t } = useI18n()
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
    <div className="relative grid min-h-full place-items-center overflow-hidden bg-brand-950 p-4 dark:bg-[#06141a]">
      {/* Soft background glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full bg-sky-500/15 blur-3xl" />

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitch />
        <ThemeToggle />
      </div>

      <div className="animate-pop-in relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <Logo size="lg" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{t('appName')}</h1>
          <p className="mt-1 text-sm text-brand-100/80">{t('appTagline')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-2xl shadow-black/30 sm:p-7">
          <div>
            <h2 className="text-lg font-semibold">{t('welcomeBack')}</h2>
            <p className="mt-0.5 text-sm text-muted">{t('signInHint')}</p>
          </div>
          <Field label={t('email')}>
            <input type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label={t('password')}>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorNote error={error} />
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy && <Spinner className="size-4 border-white/40 border-t-white" />}
            {t('signIn')}
          </Button>

          {SHOW_DEMO && (
            <div className="border-t border-line pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
                <HiOutlineKey className="size-3.5" />
                {t('demoAccounts')}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO.map(([e, p, role]) => (
                  <button
                    key={e}
                    type="button"
                    className={cx(
                      'truncate rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                      email === e ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'border-line text-muted hover:bg-surface-2 hover:text-ink',
                    )}
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
          )}
        </form>
      </div>
    </div>
  )
}
