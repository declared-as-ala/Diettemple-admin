"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Moon, Sun, Bell, Menu, LogOut, ChevronRight, CheckCircle2 } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { auth } from "@/lib/auth"
import { fr } from "@/lib/i18n/fr"
import { breadcrumbsFor } from "./nav"
import { OPEN_COMMAND_PALETTE_EVENT } from "./CommandPalette"

const iconButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [userName, setUserName] = useState("Admin")
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform))
    const user = auth.getUser()
    if (user?.name) setUserName(user.name)
  }, [])

  const displayTheme = mounted
    ? theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme
    : "light"
  const toggleTheme = () => setTheme(displayTheme === "dark" ? "light" : "dark")
  const toggleLabel = displayTheme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"
  const crumbs = breadcrumbsFor(pathname)
  const openPalette = () => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onMenuClick} className={`${iconButton} lg:hidden`} aria-label="Ouvrir la navigation">
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Fil d'Ariane" className="hidden min-w-0 flex-1 sm:block">
          <ol className="flex items-center gap-1.5 text-sm">
            <li>
              <Link href="/admin/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
                DietTemple
              </Link>
            </li>
            {crumbs.map((c, i) => (
              <Fragment key={c.href}>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                <li className="min-w-0 truncate">
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page" className="font-medium text-foreground">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {c.label}
                    </Link>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
        <div className="flex-1 sm:hidden" />

        <button
          type="button"
          onClick={openPalette}
          aria-label={fr.topBar.searchPlaceholder}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground shadow-[var(--shadow-card)] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden flex-1 truncate text-left sm:block">Rechercher…</span>
          <kbd className="hidden rounded border border-border px-1.5 font-mono text-[10px] sm:block">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={iconButton} aria-label={fr.topBar.notifications}>
              <Bell className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>{fr.topBar.notifications}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              Aucune nouvelle notification
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button type="button" onClick={toggleTheme} className={iconButton} title={toggleLabel} aria-label={toggleLabel}>
          {displayTheme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menu utilisateur"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {userName.trim().charAt(0).toUpperCase() || "A"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggleTheme}>
              {displayTheme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {toggleLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => auth.logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              {fr.sidebar.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
