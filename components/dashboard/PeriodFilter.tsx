"use client"

import { cn } from "@/lib/utils"

/** Ranges understood by GET /admin/dashboard/charts and /stats. */
export const PERIODS = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "12m", label: "12 mois" },
] as const

export type PeriodValue = (typeof PERIODS)[number]["value"]

export function PeriodFilter({ value, onChange, disabled }: { value: PeriodValue; onChange: (v: PeriodValue) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Période" className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-[var(--shadow-card)]">
      {PERIODS.map((p) => {
        const active = p.value === value
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(p.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
