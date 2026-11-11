import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { cx } from './ui'

/** Sun / moon button that flips between light and dark mode. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  const label = theme === 'dark' ? t('lightMode') : t('darkMode')
  const Icon = theme === 'dark' ? HiOutlineSun : HiOutlineMoon

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cx('inline-grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted shadow-sm transition-colors hover:bg-surface-3 hover:text-ink', className)}
    >
      <Icon className="size-4" />
    </button>
  )
}
