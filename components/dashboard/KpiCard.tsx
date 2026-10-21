"use client"

import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import CountUp from "@/components/CountUp"
import { cn } from "@/lib/utils"
import { AnimatedText } from "./AnimatedText"

export interface Trend {
  /** Signed change (same unit as the KPI). */
  delta: number
  /** What it is compared against, e.g. "depuis le début de la période". */
  label: string
  /** For KPIs where a decrease is good (e.g. expired subscriptions). */
  invert?: boolean
}

export function TrendBadge({ trend }: { trend: Trend }) {
  const flat = trend.delta === 0
  const good = trend.invert ? trend.delta < 0 : trend.delta > 0
  const Icon = flat ? Minus : trend.delta > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        flat ? "bg-muted text-muted-foreground" : good ? "bg-[var(--trend-up-bg)] text-[var(--trend-up)]" : "bg-[var(--trend-down-bg)] text-[var(--trend-down)]"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {trend.delta > 0 ? "+" : ""}
      {trend.delta}
      <span className="sr-only"> {trend.label}</span>
    </span>
  )
}

export function KpiCard({
  label,
  value,
  icon,
  hint,
  trend,
  highlight = false,
  onClick,
  actionLabel,
}: {
  label: string
  value: number
  icon: ReactNode
  hint?: string
  trend?: Trend
  /** Coral outline for the one KPI that needs attention. */
  highlight?: boolean
  onClick?: () => void
  actionLabel?: string
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5",
        highlight ? "border-primary/60" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <AnimatedText text={label} className="text-[13px] font-medium" />
        <span aria-hidden className="shrink-0">
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <CountUp to={value} duration={1.2} separator=" " className="num text-3xl font-semibold leading-none text-foreground" />
        {trend && <TrendBadge trend={trend} />}
      </div>
      <div className="mt-auto flex min-h-5 items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{trend ? trend.label : hint}</span>
        {onClick && (
          <button
            type="button"
            onClick={onClick}
            className="shrink-0 rounded font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {actionLabel ?? "Voir"} →
          </button>
        )}
      </div>
    </div>
  )
}
