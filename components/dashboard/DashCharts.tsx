"use client"

import { useState, type ReactNode } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, Table2 } from "lucide-react"
import { format, parseISO, isValid } from "date-fns"
import { cn } from "@/lib/utils"
import { AnimatedText } from "./AnimatedText"

const INK = "var(--chart-1)"
const CORAL = "var(--chart-2)"
const GREY = "var(--chart-3)"
const TICK = { fill: "var(--muted-foreground)", fontSize: 11 }

/* ── frame: title, legend, chart/table switch (the table is the accessible alternative) ── */
function ChartFrame({
  title,
  description,
  legend,
  table,
  children,
  className,
}: {
  title: string
  description: string
  legend?: Array<{ label: string; color: string }>
  table: { headers: string[]; rows: Array<Array<string | number>> }
  children: ReactNode
  className?: string
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <section className={cn("flex flex-col rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5", className)}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-foreground">
            <AnimatedText text={title} />
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          aria-label={asTable ? "Afficher le graphique" : "Afficher sous forme de tableau"}
          title={asTable ? "Graphique" : "Tableau"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {asTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
        </button>
      </header>
      {legend && legend.length > 1 && !asTable && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {asTable ? (
        <div data-lenis-prevent className="max-h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
              <tr>
                {table.headers.map((h, i) => (
                  <th key={h} scope="col" className={cn("px-3 py-2 font-medium", i > 0 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((cell, j) => (
                    <td key={j} className={cn("px-3 py-1.5", j > 0 && "num text-right")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

/* ── tooltip ── */
type TipPayload = { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }
function ChartTooltip({ active, payload, label, labelFormatter }: { active?: boolean; payload?: TipPayload[]; label?: string | number; labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null
  const head = label != null && label !== "" ? (labelFormatter ? labelFormatter(String(label)) : String(label)) : payload[0]?.name
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {head && <p className="mb-1 font-medium text-foreground">{head}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-muted-foreground">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {label != null && label !== "" && <span>{p.name}</span>}
            <span className="num ml-auto font-medium text-foreground">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const shortDate = (s: string) => {
  const d = parseISO(s)
  return isValid(d) ? format(d, "dd/MM") : s
}

/* ── 1. subscriptions over time ── */
export function SubscriptionsOverTime({ data }: { data: Array<{ date: string; active: number; expired: number }> }) {
  return (
    <ChartFrame
      title="Abonnements dans le temps"
      description="Actifs et expirés sur la période"
      legend={[
        { label: "Actifs", color: INK },
        { label: "Expirés", color: CORAL },
      ]}
      table={{ headers: ["Date", "Actifs", "Expirés"], rows: data.map((d) => [shortDate(d.date), d.active, d.expired]) }}
    >
      <div className="h-60" role="img" aria-label="Courbes des abonnements actifs et expirés dans le temps">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={28} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <Tooltip content={<ChartTooltip labelFormatter={shortDate} />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="active" name="Actifs" stroke={INK} strokeWidth={2} fill={INK} fillOpacity={0.07} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
            <Area type="monotone" dataKey="expired" name="Expirés" stroke={CORAL} strokeWidth={2} fill={CORAL} fillOpacity={0.08} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

/* ── 2. status split (donut) ── */
export function StatusDonut({ active, expired }: { active: number; expired: number }) {
  const total = active + expired
  const data = [
    { name: "Actifs", value: active, color: INK },
    { name: "Expirés", value: expired, color: CORAL },
  ]
  return (
    <ChartFrame
      title="Répartition des abonnements"
      description="Actifs vs expirés"
      table={{ headers: ["Statut", "Abonnements", "Part"], rows: data.map((d) => [d.name, d.value, total ? `${Math.round((d.value / total) * 100)} %` : "—"]) }}
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-around">
        <div className="relative h-44 w-44 shrink-0" role="img" aria-label={`${active} abonnements actifs, ${expired} expirés`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={total ? data : [{ name: "Aucun", value: 1, color: "var(--border)" }]} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={total ? 2 : 0} stroke="var(--card)" strokeWidth={2} startAngle={90} endAngle={-270}>
                {(total ? data : [{ color: "var(--border)" }]).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              {total > 0 && <Tooltip content={<ChartTooltip />} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="num text-2xl font-semibold leading-none">{total}</span>
            <span className="mt-1 text-[11px] text-muted-foreground">abonnements</span>
          </div>
        </div>
        <ul className="w-full max-w-[200px] space-y-2 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="num ml-auto font-medium">{d.value}</span>
              <span className="num w-10 text-right text-xs text-muted-foreground">{total ? Math.round((d.value / total) * 100) : 0} %</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  )
}

/* ── horizontal bars (plans, actions) ── */
function HorizontalBars({ data, unit, color = INK, label }: { data: Array<{ name: string; value: number }>; unit: string; color?: string; label: string }) {
  const height = Math.max(160, data.length * 38 + 24)
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={110} tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip />} />
          <Bar dataKey="value" name={unit} fill={color} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── 3. distribution by plan ── */
export function PlanDistribution({ data }: { data: Array<{ levelName: string; count: number }> }) {
  const rows = data.map((d) => ({ name: d.levelName, value: d.count })).sort((a, b) => b.value - a.value)
  return (
    <ChartFrame
      title="Répartition par plan"
      description="Abonnements actifs, plans encore en base uniquement"
      table={{ headers: ["Plan", "Clients"], rows: rows.map((r) => [r.name, r.value]) }}
    >
      {rows.length === 0 ? (
        <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Aucune donnée à afficher pour les plans actuels (ou pas d’abonnement actif sur ces plans).
        </p>
      ) : (
        <HorizontalBars data={rows} unit="Clients" label="Nombre de clients actifs par plan" />
      )}
    </ChartFrame>
  )
}

/* ── 4. subscription actions ── */
export function SubscriptionActions({ counts }: { counts: { renew?: number; change_level?: number; cancel?: number; assign?: number } }) {
  const rows = [
    { name: "Renouvellements", value: counts.renew ?? 0 },
    { name: "Changements de plan", value: counts.change_level ?? 0 },
    { name: "Attributions", value: counts.assign ?? 0 },
    { name: "Annulations", value: counts.cancel ?? 0 },
  ]
  return (
    <ChartFrame
      title="Actions sur les abonnements"
      description="Opérations réalisées sur la période"
      table={{ headers: ["Action", "Nombre"], rows: rows.map((r) => [r.name, r.value]) }}
    >
      <HorizontalBars data={rows} unit="Actions" color={GREY} label="Nombre d'actions par type d'opération" />
    </ChartFrame>
  )
}
