import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'rental.theme'

/** Saved choice, else the operating system preference. index.html applies the same rule before first paint. */
function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface ThemeCtx {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = initialTheme()
    apply(t)
    return t
  })

  const setTheme = (next: Theme) => {
    localStorage.setItem(KEY, next)
    apply(next)
    setThemeState(next)
  }

  return <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme outside ThemeProvider')
  return ctx
}
