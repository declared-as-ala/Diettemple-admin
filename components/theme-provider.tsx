"use client"

import * as React from "react"

type Theme = "dark" | "light" | "system"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "diettemple-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    
    try {
      const stored = localStorage.getItem(storageKey) as Theme | null
      if (stored && (stored === "dark" || stored === "light" || stored === "system")) {
        return stored
      }
    } catch (e) {
      console.error("Error reading theme from localStorage:", e)
    }
    
    return defaultTheme
  })

  const applyTheme = React.useCallback((targetTheme: Theme) => {
    if (typeof window === "undefined") return

    const root = window.document.documentElement
    const body = window.document.body

    let themeToApply: "dark" | "light" = "dark"
    if (targetTheme === "system") {
      themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } else {
      themeToApply = targetTheme as "dark" | "light"
    }

    root.classList.remove("light", "dark")
    body.classList.remove("light", "dark")
    root.classList.add(themeToApply)
    body.classList.add(themeToApply)
    root.style.colorScheme = themeToApply

    try {
      localStorage.setItem(storageKey, targetTheme)
    } catch (e) {
      console.error("Error saving theme to localStorage:", e)
    }
  }, [storageKey])

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted, applyTheme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    applyTheme(newTheme)
    setThemeState(newTheme)
  }, [applyTheme])

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme]
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
