"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Search, Moon, Sun, LogOut, CornerDownLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { fr } from "@/lib/i18n/fr"
import { useTheme } from "@/components/theme-provider"
import { sectionsForRole } from "./nav"

export const OPEN_COMMAND_PALETTE_EVENT = "diettemple:open-command-palette"

function currentRole(): string {
  try {
    const token = auth.getToken()
    if (token) {
      const role = JSON.parse(atob(token.split(".")[1])).role
      if (role) return String(role)
    }
  } catch {}
  return auth.getUser()?.role ?? "admin"
}

/** Ctrl/⌘+K. No open/close animation on purpose: it is a keyboard action used many times a day. */
export function CommandPalette() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState("admin")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setRole(currentRole())
        setOpen((v) => !v)
      }
    }
    const onOpen = () => {
      setRole(currentRole())
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
    }
  }, [])

  const run = useCallback((fn: () => void) => {
    setOpen(false)
    fn()
  }, [])

  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const sections = sectionsForRole(role)

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Palette de commandes"
      overlayClassName="fixed inset-0 z-[110] bg-black/40"
      contentClassName="fixed left-1/2 top-[14vh] z-[111] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none"
    >
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <Command.Input
          placeholder="Aller à une page ou lancer une action…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">Échap</kbd>
      </div>
      <Command.List data-lenis-prevent className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun résultat.</Command.Empty>
        {sections.map((section) => (
          <Command.Group
            key={section.label}
            heading={section.label}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {section.items.map((item) => (
              <Command.Item
                key={item.href}
                value={`${section.label} ${item.label}`}
                onSelect={() => run(() => router.push(item.href))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <CornerDownLeft className="hidden h-3.5 w-3.5 text-muted-foreground aria-selected:block" aria-hidden />
              </Command.Item>
            ))}
          </Command.Group>
        ))}
        <Command.Group
          heading="Actions"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Command.Item
            value="Changer de thème clair sombre"
            onSelect={() => run(() => setTheme(dark ? "light" : "dark"))}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
          >
            {dark ? <Sun className="h-4 w-4 text-muted-foreground" aria-hidden /> : <Moon className="h-4 w-4 text-muted-foreground" aria-hidden />}
            <span className="flex-1">{dark ? "Activer le mode clair" : "Activer le mode sombre"}</span>
          </Command.Item>
          <Command.Item
            value="Se déconnecter"
            onSelect={() => run(() => auth.logout())}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="flex-1">{fr.sidebar.logout}</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
