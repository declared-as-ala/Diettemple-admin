import { format, addDays, formatDistanceToNowStrict } from "date-fns"
import { fr } from "date-fns/locale"
import type { ProfileCompletionFlags } from "./types"

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export function calcCurrentWeek(startAt: string): number {
  const days = Math.floor((Date.now() - new Date(startAt).getTime()) / 86400000)
  return Math.min(Math.max(Math.floor(days / 7) + 1, 1), 5)
}

export function fmtDate(d?: string | null): string {
  if (!d) return "—"
  try {
    return format(new Date(d), "dd MMM yyyy")
  } catch {
    return "—"
  }
}

export function fmtRelative(d?: string | null): string {
  if (!d) return "—"
  try {
    return formatDistanceToNowStrict(new Date(d), { addSuffix: true, locale: fr })
  } catch {
    return "—"
  }
}

export function quickEndDate(days: number): string {
  return format(addDays(new Date(), days), "yyyy-MM-dd")
}

export const LEVEL_COLORS: Record<string, string> = {
  Intiate: "from-slate-700 via-slate-800 to-slate-900",
  Fighter: "from-blue-700 via-blue-900 to-slate-900",
  Warrior: "from-emerald-700 via-emerald-900 to-slate-900",
  Champion: "from-amber-600 via-amber-800 to-slate-900",
  Elite: "from-rose-700 via-rose-900 to-slate-900",
}

export const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Sèche",
  maintain: "Maintien",
  gain_muscle: "Prise de masse",
}

export const COMPLETION_FIELD_LABELS: Record<keyof ProfileCompletionFlags, string> = {
  hasName: "Nom",
  hasPhoto: "Photo",
  hasSexe: "Sexe",
  hasAge: "Âge",
  hasTaille: "Taille",
  hasPoids: "Poids",
  hasEmailOrPhone: "Email / téléphone",
}

export function calcProfileCompletion(completion?: ProfileCompletionFlags | null): number {
  if (!completion) return 0
  const fields = [
    completion.hasName,
    completion.hasPhoto,
    completion.hasSexe,
    completion.hasAge,
    completion.hasTaille,
    completion.hasPoids,
    completion.hasEmailOrPhone,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
}

export function getMissingFields(
  completion?: ProfileCompletionFlags | null
): Array<keyof ProfileCompletionFlags> {
  if (!completion) return []
  return (Object.keys(completion) as Array<keyof ProfileCompletionFlags>).filter(
    (k) => !completion[k]
  )
}

export function formatMoney(amount?: number | null): string {
  const n = Number(amount || 0)
  return `${n.toFixed(2)} TND`
}
