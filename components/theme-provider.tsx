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

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    
    const root = window.document.documentElement
    const body = window.document.body
    
    // Remove existing theme classes
    root.classList.remove("light", "dark")
    body.classList.remove("light", "dark")
    
    // Determine the actual theme to apply
    let themeToApply: "dark" | "light" = "dark"
    
    if (theme === "system") {
      themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    } else {
      themeToApply = theme as "dark" | "light"
    }
    
    // Apply the theme class to both html and body
    root.classList.add(themeToApply)
    body.classList.add(themeToApply)
    
    // Force a repaint
    root.style.colorScheme = themeToApply
    
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, theme)
    } catch (e) {
      console.error("Error saving theme to localStorage:", e)
    }
  }, [theme, storageKey, mounted])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

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
