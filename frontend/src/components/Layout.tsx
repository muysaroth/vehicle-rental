import { NavLink, Outlet } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineHome,
  HiOutlineReceiptPercent,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { cx } from './ui'

interface NavItem {
  to: string
  label: string
  icon: IconType
  show: boolean
}

export function Layout() {
  const { user, logout, canManage, isAdmin } = useAuth()
  const { t, lang, setLang } = useI18n()

  const items: NavItem[] = [
    { to: '/', label: t('dashboard'), icon: HiOutlineHome, show: true },
    { to: '/bookings', label: t('bookings'), icon: HiOutlineCalendarDays, show: true },
    { to: '/sales', label: t('sales'), icon: HiOutlineBanknotes, show: true },
    { to: '/vehicles', label: t('vehicles'), icon: HiOutlineTruck, show: true },
    { to: '/customers', label: t('customers'), icon: HiOutlineUserGroup, show: true },
    { to: '/expenses', label: t('expenses'), icon: HiOutlineReceiptPercent, show: canManage },
    { to: '/reports', label: t('reports'), icon: HiOutlineChartBar, show: canManage },
    { to: '/users', label: t('users'), icon: HiOutlineUsers, show: isAdmin },
  ]

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col bg-brand-900 text-brand-50">
        <div className="px-5 py-5">
          <div className="text-lg font-bold tracking-tight">🚗 {t('appName')}</div>
          <div className="text-xs text-brand-200">{t('appTagline')}</div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {items
            .filter((i) => i.show)
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-white/15 font-semibold text-white' : 'text-brand-100 hover:bg-white/10',
                  )
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4 text-sm">
          <div className="flex overflow-hidden rounded-lg border border-white/20 text-xs">
            {(['km', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cx('flex-1 py-1.5', lang === l ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-white/10')}
              >
                {l === 'km' ? 'ខ្មែរ' : 'English'}
              </button>
            ))}
          </div>
          <div>
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-brand-200">{user && t(`role.${user.role}`)}</div>
          </div>
          <button type="button" onClick={() => void logout()} className="flex items-center gap-2 text-brand-100 hover:text-white">
            <HiOutlineArrowRightOnRectangle className="size-5" />
            {t('logout')}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
