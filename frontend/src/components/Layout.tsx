import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBanknotes,
  HiOutlineBars3,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineKey,
  HiOutlineChevronRight,
  HiOutlineHome,
  HiOutlineReceiptPercent,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { ChangePassword } from './ChangePassword'
import { LanguageSwitch } from './LanguageSwitch'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { cx } from './ui'

interface NavItem {
  to: string
  label: string
  icon: IconType
  show: boolean
}

function initials(name = ''): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function Sidebar({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const [changing, setChanging] = useState(false)

  return (
    <div className="flex h-full flex-col bg-brand-900 text-brand-50 dark:bg-[#0a1a1f]">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo />
        <div className="min-w-0">
          <div className="truncate font-bold tracking-tight text-white">{t('appName')}</div>
          <div className="line-clamp-2 text-[11px] leading-snug text-brand-200/80">{t('appTagline')}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items
          .filter((i) => i.show)
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cx(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-white/12 font-semibold text-white' : 'text-brand-100/85 hover:bg-white/6 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-brand-300" />}
                  <Icon className={cx('size-5 shrink-0', isActive ? 'text-brand-200' : 'text-brand-200/70 group-hover:text-brand-200')} />
                  <span className="leading-snug">{label}</span>
                </>
              )}
            </NavLink>
          ))}
      </nav>

      <div className="m-3 flex items-center gap-1.5 rounded-xl bg-white/6 p-3">
        <div className="mr-1.5 grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white">{initials(user?.name)}</div>
        <div className="min-w-0 flex-1 text-sm">
          <div className="truncate font-medium text-white">{user?.name}</div>
          <div className="truncate text-xs text-brand-200/80">{user && t(`role.${user.role}`)}</div>
        </div>
        <button
          type="button"
          onClick={() => setChanging(true)}
          title={t('changePassword')}
          aria-label={t('changePassword')}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <HiOutlineKey className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          title={t('logout')}
          aria-label={t('logout')}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <HiOutlineArrowRightOnRectangle className="size-5" />
        </button>
      </div>
      {changing && <ChangePassword onClose={() => setChanging(false)} />}
    </div>
  )
}

export function Layout() {
  const { canManage, isAdmin } = useAuth()
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)

  const items: NavItem[] = [
    { to: '/', label: t('dashboard'), icon: HiOutlineHome, show: true },
    { to: '/bookings', label: t('bookings'), icon: HiOutlineCalendarDays, show: true },
    { to: '/sales', label: t('sales'), icon: HiOutlineBanknotes, show: true },
    { to: '/vehicles', label: t('vehicles'), icon: HiOutlineTruck, show: true },
    { to: '/customers', label: t('customers'), icon: HiOutlineUserGroup, show: true },
    { to: '/expenses', label: t('expenses'), icon: HiOutlineReceiptPercent, show: canManage },
    { to: '/reports', label: t('reports'), icon: HiOutlineChartBar, show: canManage },
    { to: '/users', label: t('users'), icon: HiOutlineUsers, show: isAdmin },
    { to: '/activity', label: t('activity'), icon: HiOutlineClipboardDocumentList, show: isAdmin },
  ]

  const current = items.find((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <Sidebar items={items} />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
          <aside className="animate-slide-in relative h-full w-72 max-w-[85vw] shadow-2xl">
            <Sidebar items={items} onNavigate={() => setDrawer(false)} />
            <button
              type="button"
              aria-label={t('close')}
              onClick={() => setDrawer(false)}
              className="absolute top-4 -right-12 grid size-9 place-items-center rounded-lg bg-surface text-ink shadow"
            >
              <HiOutlineXMark className="size-5" />
            </button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label={t('menu')}
            onClick={() => setDrawer(true)}
            className="-ml-1 grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink lg:hidden"
          >
            <HiOutlineBars3 className="size-6" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm">
            <span className="hidden text-muted sm:inline">{t('appName')}</span>
            <HiOutlineChevronRight className="hidden size-3.5 shrink-0 text-muted/60 sm:block" />
            <span className="truncate font-medium text-ink">{current?.label}</span>
          </div>
          <LanguageSwitch />
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
