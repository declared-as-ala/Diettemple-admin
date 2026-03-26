"use client"

import { useState, useEffect } from "react"
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
const NUTRITION_ITEMS = [{ href: "/admin/recipes", label: fr.sidebar.recipes, icon: ChefHat }]
const BOUTIQUE_ITEMS = [
  { href: "/admin/products", label: fr.sidebar.products, icon: Package },
  { href: "/admin/orders", label: fr.sidebar.orders, icon: ShoppingCart },
]

const ALL_SECTIONS = [
  { label: "OVERVIEW", items: OVERVIEW_ITEMS },
  { label: fr.sidebar.clients, items: CLIENTS_ITEMS },
  { label: fr.sidebar.training, items: TRAINING_ITEMS },
  { label: fr.sidebar.nutritionSection, items: NUTRITION_ITEMS },
  { label: fr.sidebar.boutique, items: BOUTIQUE_ITEMS },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [userName, setUserName] = useState("Admin")
  useEffect(() => {
    const token = auth.getToken()
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setUserName(payload.name || "Admin")
    } catch {}
  }, [])

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3 overflow-hidden transition-all", collapsed && "justify-center")}>
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image src="/logo.png" alt="DietTemple" fill className="object-contain" priority />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-sidebar-foreground truncate">DietTemple</h1>
              <p className="text-xs text-muted-foreground truncate">Coaching</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {ALL_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {!collapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.label}
              </h3>
            )}
            {collapsed && si > 0 && <div className="mx-4 my-3 border-t border-sidebar-border/50" />}
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                      : "text-sidebar-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "animate-pulse")} />
                  {!collapsed && <span className="font-medium truncate flex-1">{item.label}</span>}
                  {collapsed && (
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
        {!collapsed ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sidebar-accent/50">
            <div className="relative w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-sidebar-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{fr.sidebar.admin}</p>
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
  )
}
