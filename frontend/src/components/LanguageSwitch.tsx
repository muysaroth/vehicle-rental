import { HiOutlineLanguage } from 'react-icons/hi2'
import { useI18n } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { cx } from './ui'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'km', label: 'ខ្មែរ' },
  { code: 'en', label: 'EN' },
]

/** Segmented ខ្មែរ / EN toggle. The choice is remembered in localStorage by I18nProvider. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()

  return (
    <div
      role="group"
      aria-label="Language / ភាសា"
      className={cx('inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface p-1 text-xs shadow-xs', className)}
    >
      <HiOutlineLanguage className="ml-1.5 size-4 text-muted" aria-hidden />
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={cx(
            'h-full rounded-md px-2.5 font-medium transition-colors',
            lang === code ? 'bg-brand-700 text-white shadow-xs dark:bg-brand-600' : 'text-muted hover:bg-surface-3 hover:text-ink',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
