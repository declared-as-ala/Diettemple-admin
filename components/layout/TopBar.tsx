"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fr } from "@/lib/i18n/fr"
import {
  Search,
  Moon,
  Sun,
  Bell,
} from "lucide-react"

export function TopBar() {
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeToggle = () => {
    if (!mounted) return
    
    const currentTheme = theme === "system" 
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme
    const newTheme = currentTheme === "dark" ? "light" : "dark"
    
    // Update state
    setTheme(newTheme)
    
    // Force immediate DOM update
    if (typeof window !== "undefined") {
      const root = document.documentElement
      root.classList.remove("light", "dark")
      root.classList.add(newTheme)
      
      // Also update body if needed
      const body = document.body
      body.classList.remove("light", "dark")
      body.classList.add(newTheme)
      
      // Save to localStorage immediately
      try {
        localStorage.setItem("diettemple-theme", newTheme)
      } catch (e) {
        console.error("Error saving theme:", e)
      }
    }
  }

  const displayTheme = mounted 
    ? (theme === "system" 
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme)
    : "dark"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={fr.topBar.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-border focus:bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
            <span className="sr-only">{fr.topBar.notifications}</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className="h-9 w-9"
          >
            {displayTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">{fr.topBar.toggleTheme}</span>
          </Button>

        </div>
      </div>
    </header>
  )
}
