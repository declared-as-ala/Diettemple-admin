import {
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
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { fr } from "@/lib/i18n/fr"

export type NavItem = { href: string; label: string; icon: LucideIcon }
export type NavSection = { label: string; items: NavItem[] }

const BOUTIQUE_ITEMS: NavItem[] = [
  { href: "/admin/products", label: fr.sidebar.products, icon: Package },
  { href: "/admin/orders", label: fr.sidebar.orders, icon: ShoppingCart },
]

export const ALL_SECTIONS: NavSection[] = [
  { label: "Vue d'ensemble", items: [{ href: "/admin/dashboard", label: fr.sidebar.dashboard, icon: LayoutDashboard }] },
  { label: fr.sidebar.clients, items: [{ href: "/admin/clients", label: fr.sidebar.clients, icon: User }] },
  {
    label: fr.sidebar.training,
    items: [
      { href: "/admin/level-templates", label: fr.sidebar.levelTemplates, icon: Layers },
      { href: "/admin/session-templates", label: fr.sidebar.sessionTemplates, icon: LayoutList },
      { href: "/admin/exercises", label: fr.sidebar.exercises, icon: Activity },
    ],
  },
  {
    label: fr.sidebar.nutritionSection,
    items: [
      { href: "/admin/recipes", label: fr.sidebar.recipes, icon: ChefHat },
      { href: "/admin/level-home-content", label: "Contenu Home (Niveau)", icon: Video },
    ],
  },
  { label: fr.sidebar.boutique, items: BOUTIQUE_ITEMS },
  {
    label: "Marketing",
    items: [
      { href: "/admin/leads", label: "Rendez-vous", icon: Users },
      { href: "/admin/landing-videos", label: "Vidéos Landing", icon: Video },
    ],
  },
  { label: "Administration", items: [{ href: "/admin/team", label: "Équipe & Accès", icon: ShieldCheck }] },
]

/** Employees only see the shop. */
export const EMPLOYEE_SECTIONS: NavSection[] = [{ label: fr.sidebar.boutique, items: BOUTIQUE_ITEMS }]

export const sectionsForRole = (role: string): NavSection[] => (role === "employee" ? EMPLOYEE_SECTIONS : ALL_SECTIONS)

/** Breadcrumb trail for a pathname, labelled from the navigation (unknown segments are humanised). */
export function breadcrumbsFor(pathname: string): Array<{ label: string; href: string }> {
  const flat = ALL_SECTIONS.flatMap((s) => s.items)
  const parts = pathname.split("/").filter(Boolean)
  const crumbs: Array<{ label: string; href: string }> = []
  let href = ""
  parts.forEach((part, i) => {
    href += `/${part}`
    if (i === 0) return // "admin"
    const known = flat.find((n) => n.href === href)
    const isId = /^[0-9a-f]{24}$/i.test(part) || part === "new"
    const label = known?.label ?? (part === "new" ? "Nouveau" : isId ? "Détail" : decodeURIComponent(part).replace(/-/g, " "))
    crumbs.push({ label: label.charAt(0).toUpperCase() + label.slice(1), href })
  })
  return crumbs
}
