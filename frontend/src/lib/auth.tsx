import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api'
import type { User } from './types'

interface Auth {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  canManage: boolean
  isAdmin: boolean
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(() => !getToken())

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    if (getToken()) {
      api
        .get<User>('/auth/me')
        .then(setUser)
        .catch(() => setToken(null))
        .finally(() => setReady(true))
    }
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password })
    setToken(res.token)
    setUser(res.user)
  }

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined)
    setToken(null)
    setUser(null)
  }

  const canManage = user?.role === 'admin' || user?.role === 'manager'

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, canManage, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): Auth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
