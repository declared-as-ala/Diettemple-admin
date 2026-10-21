"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { auth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { fr } from "@/lib/i18n/fr"
import { ChevronLeft, ChevronRight, X, LogOut } from "lucide-react"
import { sectionsForRole } from "./nav"

type SidebarProps = {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "A"

export function Sidebar({ collapsed, onCollapsedChange, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const displayCollapsed = collapsed && !mobileOpen
  const [userName, setUserName] = useState("Admin")
  const [userRole, setUserRole] = useState("admin")
  useEffect(() => {
    const user = auth.getUser()
    if (user) {
      if (user.name) setUserName(user.name)
      if (user.role) setUserRole(user.role)
    }
    const token = auth.getToken()
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      if (payload.name) setUserName(payload.name)
      if (payload.role) setUserRole(payload.role)
    } catch {}
  }, [])

  useEffect(() => {
    onMobileOpenChange(false)
    requestAnimationFrame(() => navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest" }))
  }, [pathname, onMobileOpenChange])

  useEffect(() => {
    if (!mobileOpen) return
    const close = (event: KeyboardEvent) => event.key === "Escape" && onMobileOpenChange(false)
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [mobileOpen, onMobileOpenChange])

  const visibleSections = sectionsForRole(userRole)

  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={() => onMobileOpenChange(false)}
          aria-label="Fermer la navigation"
        />
      )}
      <aside
        aria-label="Navigation principale"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-sidebar-border bg-sidebar",
          "transition-[width,transform] duration-200 ease-[var(--ease-out)]",
          "w-72 -translate-x-full lg:translate-x-0",
          mobileOpen && "translate-x-0",
          collapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4", displayCollapsed ? "justify-center" : "justify-between")}>
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="DietTemple — tableau de bord">
            <span className="relative h-9 w-9 shrink-0">
              <Image src="/logo.png" alt="" fill sizes="36px" className="object-contain" priority />
            </span>
            {!displayCollapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">DietTemple</span>
                <span className="block truncate text-[11px] text-muted-foreground">Coaching</span>
              </span>
            )}
          </Link>
          {!displayCollapsed && (
            <button
              type="button"
              onClick={() => onCollapsedChange(true)}
              aria-label="Réduire le menu"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Fermer la navigation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {displayCollapsed && (
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            aria-label="Agrandir le menu"
            className="mx-auto mt-3 hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Navigation */}
        <nav ref={navRef} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {visibleSections.map((section, si) => (
            <div key={section.label} className={si > 0 ? "mt-5" : ""}>
              {!displayCollapsed ? (
                <h3 className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{section.label}</h3>
              ) : (
                si > 0 && <div className="mx-3 my-3 border-t border-sidebar-border" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      title={displayCollapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-150",
                        "focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                        displayCollapsed && "justify-center px-0"
                      )}
                    >
                      {isActive && <span aria-hidden className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                      {!displayCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className={cn("flex items-center gap-3 rounded-lg p-2", displayCollapsed && "flex-col gap-2")}>
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {initials(userName)}
            </span>
            {!displayCollapsed && (
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{userRole === "employee" ? "Employé" : fr.sidebar.admin}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => auth.logout()}
              title={fr.sidebar.logout}
              aria-label={fr.sidebar.logout}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
