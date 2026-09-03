"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { auth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { fr } from "@/lib/i18n/fr"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Layers,
  LayoutList,
  Activity,
  User,
  ChefHat,
  Package,
  ShoppingCart,
  Video,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const OVERVIEW_ITEMS = [
  { href: "/admin/dashboard", label: fr.sidebar.dashboard, icon: LayoutDashboard },
]
const CLIENTS_ITEMS = [
  { href: "/admin/clients", label: fr.sidebar.clients, icon: User },
]
const TRAINING_ITEMS = [
  { href: "/admin/level-templates", label: fr.sidebar.levelTemplates, icon: Layers },
  { href: "/admin/session-templates", label: fr.sidebar.sessionTemplates, icon: LayoutList },
  { href: "/admin/exercises", label: fr.sidebar.exercises, icon: Activity },
]
const NUTRITION_ITEMS = [
  { href: "/admin/recipes", label: fr.sidebar.recipes, icon: ChefHat },
  { href: "/admin/level-home-content", label: "Contenu Home (Niveau)", icon: Video },
]
const BOUTIQUE_ITEMS = [
  { href: "/admin/products", label: fr.sidebar.products, icon: Package },
  { href: "/admin/orders", label: fr.sidebar.orders, icon: ShoppingCart },
]
const MARKETING_ITEMS = [
  { href: "/admin/leads", label: "Rendez-vous", icon: Users },
  { href: "/admin/landing-videos", label: "Vidéos Landing", icon: Video },
]

const ALL_SECTIONS = [
  { label: "OVERVIEW", items: OVERVIEW_ITEMS },
  { label: fr.sidebar.clients, items: CLIENTS_ITEMS },
  { label: fr.sidebar.training, items: TRAINING_ITEMS },
  { label: fr.sidebar.nutritionSection, items: NUTRITION_ITEMS },
  { label: fr.sidebar.boutique, items: BOUTIQUE_ITEMS },
  { label: "MARKETING", items: MARKETING_ITEMS },
]

type SidebarProps = {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

export function Sidebar({ collapsed, onCollapsedChange, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const displayCollapsed = collapsed && !mobileOpen
  const [userName, setUserName] = useState("Admin")
  const [userRole, setUserRole] = useState("admin")
  useEffect(() => {
    const token = auth.getToken()
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setUserName(payload.name || "Admin")
      setUserRole(payload.role || "admin")
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

  const visibleSections = ALL_SECTIONS.map(section => {
    if (userRole === "employee") {
      if (section.label === "OVERVIEW" || section.label === "MARKETING") {
        return null;
      }
      const filteredItems = section.items.filter(item => {
        if (section.label === fr.sidebar.nutritionSection) {
          return item.href === "/admin/recipes";
        }
        if (section.label === fr.sidebar.boutique) {
          return item.href === "/admin/products";
        }
        return true;
      });
      if (filteredItems.length === 0) return null;
      return { ...section, items: filteredItems };
    }
    return section;
  }).filter(Boolean) as typeof ALL_SECTIONS;

  return (<>
    {mobileOpen && <button className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] lg:hidden" onClick={() => onMobileOpenChange(false)} aria-label="Fermer la navigation" />}
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-300 ease-in-out",
        "w-72 -translate-x-full lg:translate-x-0",
        mobileOpen && "translate-x-0",
        collapsed ? "lg:w-20" : "lg:w-64"
      )}
    >
      <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3 overflow-hidden transition-all", displayCollapsed && "justify-center")}>
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image src="/logo.png" alt="DietTemple" fill className="object-contain" priority />
          </div>
          {!displayCollapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-sidebar-foreground truncate">DietTemple</h1>
              <p className="text-xs text-muted-foreground truncate">Coaching</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent lg:inline-flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onMobileOpenChange(false)} className="lg:hidden" aria-label="Fermer la navigation">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav ref={navRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-4">
        {visibleSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {!displayCollapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.label}
              </h3>
            )}
            {displayCollapsed && si > 0 && <div className="mx-4 my-3 border-t border-sidebar-border/50" />}
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                      : "text-sidebar-foreground",
                    displayCollapsed && "justify-center"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-pulse")} />
                  {!displayCollapsed && <span className="font-medium truncate flex-1">{item.label}</span>}
                  {displayCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        {!displayCollapsed ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sidebar-accent/50">
            <div className="relative w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-sidebar-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {userRole === "employee" ? "Employé" : fr.sidebar.admin}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
          </div>
        )}
      </div>
    </aside>
  </>)
}
