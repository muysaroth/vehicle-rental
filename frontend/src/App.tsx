import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AuthProvider, useAuth } from '@/lib/auth'
import { I18nProvider } from '@/lib/i18n'
import Bookings from '@/pages/Bookings'
import Customers from '@/pages/Customers'
import Dashboard from '@/pages/Dashboard'
import Expenses from '@/pages/Expenses'
import Login from '@/pages/Login'
import Reports from '@/pages/Reports'
import Sales from '@/pages/Sales'
import Users from '@/pages/Users'
import Vehicles from '@/pages/Vehicles'

// Served under /app by Laravel in production, at / by the Vite dev server.
const basename = import.meta.env.PROD ? '/app' : '/'

function Guard({ when, children }: { when: boolean; children: ReactNode }) {
  return when ? children : <Navigate to="/" replace />
}

function Routed() {
  const { user, ready, canManage, isAdmin } = useAuth()

  if (!ready) return <div className="grid h-full place-items-center text-muted">…</div>
  if (!user) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="sales" element={<Sales />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="customers" element={<Customers />} />
        <Route path="expenses" element={<Guard when={canManage}><Expenses /></Guard>} />
        <Route path="reports" element={<Guard when={canManage}><Reports /></Guard>} />
        <Route path="users" element={<Guard when={isAdmin}><Users /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter basename={basename}>
          <Routed />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}
