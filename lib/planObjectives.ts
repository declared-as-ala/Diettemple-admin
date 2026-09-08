import React from "react"
import {
  Dumbbell,
  Flame,
  TrendingDown,
  RefreshCw,
  Activity,
  Zap,
  HeartPulse,
  Folder,
  TrendingUp,
} from "lucide-react"

export interface PlanObjectiveDef {
  key: string
  label: string
  shortLabel?: string
  description: string
  icon: React.ElementType
  color: string
  badgeColor: string
}

export const PLAN_OBJECTIVES: PlanObjectiveDef[] = [
  {
    key: "mass_gain",
    label: "Prise de masse",
    shortLabel: "Masse",
    description: "Programmes orientés hypertrophie et développement de la masse musculaire.",
    icon: TrendingUp,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    key: "cutting",
    label: "Sèche",
    shortLabel: "Sèche",
    description: "Programmes orientés définition musculaire et préservation de la masse maigre.",
    icon: Flame,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    key: "weight_loss",
    label: "Perte de poids",
    shortLabel: "Perte de poids",
    description: "Programmes orientés dépense énergétique et réduction du tissu adipeux.",
    icon: TrendingDown,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    key: "body_recomposition",
    label: "Recomposition corporelle",
    shortLabel: "Recomposition",
    description: "Programmes combinant renforcement musculaire et réduction de masse grasse.",
    icon: RefreshCw,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    key: "maintenance",
    label: "Maintien",
    shortLabel: "Maintien",
    description: "Programmes de stabilisation, régularité et maintien de la condition physique.",
    icon: Activity,
    color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    badgeColor: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
  },
  {
    key: "performance",
    label: "Performance",
    shortLabel: "Performance",
    description: "Programmes de force athlétique, explosivité, puissance et endurance.",
    icon: Zap,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    badgeColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  {
    key: "fitness",
    label: "Remise en forme",
    shortLabel: "Remise en forme",
    description: "Programmes de reprise d'activité, santé globale, mobilité et vitalité.",
    icon: HeartPulse,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  },
]

export const UNCLASSIFIED_OBJECTIVE: PlanObjectiveDef = {
  key: "unclassified",
  label: "Non classés",
  shortLabel: "Non classés",
  description: "Programmes sans objectif spécifique attribué. À classifier par le coach.",
  icon: Folder,
  color: "text-muted-foreground bg-muted/60 border-border",
  badgeColor: "bg-muted text-muted-foreground border-border",
}

export function getObjectiveDef(key?: string | null): PlanObjectiveDef {
  if (!key) return UNCLASSIFIED_OBJECTIVE
  const found = PLAN_OBJECTIVES.find((o) => o.key === key)
  if (found) return found
  // Custom objective fallback
  return {
    key,
    label: key,
    shortLabel: key,
    description: `Programmes orientés ${key}.`,
    icon: Dumbbell,
    color: "text-primary bg-primary/10 border-primary/20",
    badgeColor: "bg-primary/15 text-primary border-primary/30",
  }
}

export function normalizeObjectiveKey(val?: string | null): string {
  if (!val) return "unclassified"
  const clean = val.trim().toLowerCase()
  if (clean === "mass_gain" || clean === "prise de masse" || clean === "masse") return "mass_gain"
  if (clean === "cutting" || clean === "sèche" || clean === "seche") return "cutting"
  if (clean === "weight_loss" || clean === "perte de poids" || clean === "perte") return "weight_loss"
  if (clean === "body_recomposition" || clean === "recomposition" || clean === "recomposition corporelle") return "body_recomposition"
  if (clean === "maintenance" || clean === "maintien") return "maintenance"
  if (clean === "performance" || clean === "force") return "performance"
  if (clean === "fitness" || clean === "remise en forme" || clean === "santé") return "fitness"
  return val
}
