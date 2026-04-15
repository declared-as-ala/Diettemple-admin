"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import {
  ArrowLeft, Dumbbell, Clock, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, Loader2, BarChart2, Activity,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────────

type ExSet = { setNumber: number; reps: number; weightKg: number }
type ExerciseLog = { exerciseName: string; totalVolumeKg: number; sets: ExSet[] }
type Session = {
  sessionId: string
  completedAt: string
  durationSeconds: number | null
  totalVolumeKg: number
  exercises: ExerciseLog[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const GOLD = "#D4AF37"
const GOLD_DIM = "rgba(212,175,55,0.15)"

function formatDuration(s: number | null): string {
  if (!s) return "—"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}min`
}

function formatDate(iso: string, short = false): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: short ? undefined : "short",
    day: "numeric",
    month: "short",
    year: short ? undefined : "numeric",
  })
}

function formatVol(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`
  return `${kg.toLocaleString()} kg`
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ color: "#fff", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontSize: 12, margin: "2px 0" }}>
          {p.name}: <strong>{p.value} kg</strong>
        </p>
      ))}
    </div>
  )
}

// ── Delta badge ────────────────────────────────────────────────────────────────

function DeltaBadge({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null || prev === 0) return null
  const diff = current - prev
  const pct = Math.round((diff / prev) * 100)
  if (diff === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted">
      <Minus className="h-3 w-3" /> 0%
    </span>
  )
  const positive = diff > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${positive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{pct}%
    </span>
  )
}

// ── SetTable ──────────────────────────────────────────────────────────────────

function SetTable({ sets, prevSets }: { sets: ExSet[]; prevSets?: ExSet[] }) {
  if (!sets.length) return (
    <p className="text-xs text-muted-foreground italic py-1">Aucune série enregistrée</p>
  )
  return (
    <table className="w-full text-xs mt-2">
      <thead>
        <tr className="text-muted-foreground border-b border-border/30">
          <th className="text-left pb-1.5 font-semibold">Série</th>
          <th className="text-center pb-1.5 font-semibold">Reps</th>
          <th className="text-center pb-1.5 font-semibold">Charge</th>
          <th className="text-center pb-1.5 font-semibold">Vol.</th>
          <th className="text-right pb-1.5 font-semibold">vs préc.</th>
        </tr>
      </thead>
      <tbody>
        {sets.map((set, i) => {
          const prev = prevSets?.[i] ?? null
          const vol = set.reps * set.weightKg
          return (
            <tr key={set.setNumber} className={`border-b border-border/20 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
              <td className="py-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ background: GOLD_DIM, color: GOLD }}>
                  {set.setNumber}
                </span>
              </td>
              <td className="text-center py-1.5 font-semibold text-foreground">{set.reps}</td>
              <td className="text-center py-1.5 font-bold" style={{ color: GOLD }}>{set.weightKg} kg</td>
              <td className="text-center py-1.5 text-muted-foreground">{vol.toLocaleString()} kg</td>
              <td className="text-right py-1.5">
                {prev ? <DeltaBadge current={set.weightKg} prev={prev.weightKg} /> : <span className="text-muted-foreground">—</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserWeightDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [data, setData] = useState<{ user: { name: string; email: string }; sessions: Session[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    api.getUserWeightDetail(userId)
      .then((d) => {
        setData(d)
        // Default select first top exercise
        const map: Record<string, number> = {}
        d.sessions.forEach((s: Session) => s.exercises.forEach((ex) => {
          if (ex.exerciseName) map[ex.exerciseName] = (map[ex.exerciseName] ?? 0) + ex.totalVolumeKg
        }))
        const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (top) setSelectedExercise(top)
      })
      .catch((err) => setError(err?.response?.data?.message ?? "Erreur"))
      .finally(() => setLoading(false))
  }, [userId])

  const toggleSession = (id: string) => setExpandedSessions((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const { exerciseVolumeMap, topExercises, barChartData, progressionData, totalVolume, avgDuration } = useMemo(() => {
    if (!data) return { exerciseVolumeMap: {}, topExercises: [], barChartData: [], progressionData: [], totalVolume: 0, avgDuration: null }

    const eMap: Record<string, number> = {}
    data.sessions.forEach((s) => s.exercises.forEach((ex) => {
      if (ex.exerciseName) eMap[ex.exerciseName] = (eMap[ex.exerciseName] ?? 0) + ex.totalVolumeKg
    }))

    const top5 = Object.entries(eMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)

    const barData = Object.entries(eMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, vol]) => ({ name: name.length > 14 ? name.slice(0, 14) + "…" : name, volume: Math.round(vol) }))

    // Progression for selected exercise — oldest first
    const prog = [...data.sessions].reverse()
      .filter((s) => s.exercises.some((ex) => ex.exerciseName === selectedExercise))
      .map((s) => {
        const ex = s.exercises.find((e) => e.exerciseName === selectedExercise)!
        const maxW = ex.sets.length ? Math.max(...ex.sets.map((st) => st.weightKg)) : 0
        const totalR = ex.sets.reduce((sum, st) => sum + st.reps, 0)
        return {
          date: formatDate(s.completedAt, true),
          maxWeight: maxW,
          totalReps: totalR,
          volume: Math.round(ex.totalVolumeKg),
        }
      })

    const tVol = data.sessions.reduce((s, sess) => s + sess.totalVolumeKg, 0)
    const withDur = data.sessions.filter((s) => s.durationSeconds)
    const avgDur = withDur.length ? Math.round(withDur.reduce((a, s) => a + (s.durationSeconds ?? 0), 0) / withDur.length) : null

    return { exerciseVolumeMap: eMap, topExercises: top5, barChartData: barData, progressionData: prog, totalVolume: tVol, avgDuration: avgDur }
  }, [data, selectedExercise])

  // ── Load / error states ───────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-80">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
    </div>
  )
  if (error || !data) return (
    <div className="p-6 text-destructive text-center">{error ?? "Utilisateur introuvable"}</div>
  )

  const { user, sessions } = data

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
               style={{ background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD}33` }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{user.name}</h1>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          {sessions.length} séance{sessions.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Stats cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: <TrendingUp className="h-5 w-5" style={{ color: GOLD }} />,
            label: "Volume total soulevé",
            value: formatVol(totalVolume),
            bg: "border-amber-500/20",
            iconBg: "bg-amber-500/10",
          },
          {
            icon: <Dumbbell className="h-5 w-5 text-blue-400" />,
            label: "Séances complétées",
            value: String(sessions.length),
            bg: "border-blue-500/20",
            iconBg: "bg-blue-500/10",
          },
          {
            icon: <Clock className="h-5 w-5 text-emerald-400" />,
            label: "Durée moyenne",
            value: formatDuration(avgDuration),
            bg: "border-emerald-500/20",
            iconBg: "bg-emerald-500/10",
          },
        ].map(({ icon, label, value, bg, iconBg }) => (
          <div key={label} className={`rounded-2xl border bg-card p-5 ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Volume bar chart ────────────────────────────────────────────── */}
      {barChartData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg" style={{ background: GOLD_DIM }}>
              <BarChart2 className="h-4 w-4" style={{ color: GOLD }} />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Volume par exercice</h2>
              <p className="text-xs text-muted-foreground">Total cumulé sur toutes les séances</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={barChartData} margin={{ top: 0, right: 0, bottom: 24, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} angle={-18} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `${v} kg`} width={65} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 10 }}
                labelStyle={{ color: "#fff", fontWeight: 700 }}
                formatter={(v: number | string | undefined) => [`${Number(v ?? 0).toLocaleString()} kg`, "Volume"] as [string, string]}
              />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {barChartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? GOLD : "#334155"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Progression line chart ──────────────────────────────────────── */}
      {topExercises.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg" style={{ background: GOLD_DIM }}>
              <TrendingUp className="h-4 w-4" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground">Progression par exercice</h2>
              <p className="text-xs text-muted-foreground">Charge max et volume par séance</p>
            </div>
          </div>

          {/* Exercise tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {topExercises.map((ex) => (
              <button
                key={ex}
                onClick={() => setSelectedExercise(ex)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedExercise === ex
                    ? "border-amber-500/40 text-amber-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
                style={selectedExercise === ex ? { background: GOLD_DIM } : {}}
              >
                {ex.length > 20 ? ex.slice(0, 20) + "…" : ex}
              </button>
            ))}
          </div>

          {progressionData.length < 2 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Pas assez de données pour afficher la progression.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={progressionData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `${v} kg`} width={55} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `${v} reps`} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="maxWeight"
                  name="Charge max (kg)"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  dot={{ fill: GOLD, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: GOLD }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalReps"
                  name="Total reps"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ fill: "#60a5fa", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#60a5fa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Session history ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Dumbbell className="h-4 w-4" style={{ color: GOLD }} />
          <h2 className="font-bold text-foreground">Historique des séances</h2>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {sessions.length} séance{sessions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Aucune séance enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {sessions.map((sess, sIdx) => {
              const expanded = expandedSessions.has(sess.sessionId)
              const prevSession = sessions[sIdx + 1] ?? null

              return (
                <div key={sess.sessionId}>
                  {/* Session row */}
                  <button
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors text-left"
                    onClick={() => toggleSession(sess.sessionId)}
                  >
                    {/* Session number badge */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                         style={{ background: GOLD_DIM, color: GOLD }}>
                      {sessions.length - sIdx}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{formatDate(sess.completedAt)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sess.exercises.length} exercice{sess.exercises.length !== 1 ? "s" : ""}
                        {sess.durationSeconds ? ` · ${formatDuration(sess.durationSeconds)}` : ""}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-sm" style={{ color: GOLD }}>{formatVol(sess.totalVolumeKg)}</p>
                      {prevSession && (
                        <div className="mt-0.5 flex justify-end">
                          <DeltaBadge current={sess.totalVolumeKg} prev={prevSession.totalVolumeKg} />
                        </div>
                      )}
                    </div>

                    {expanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  {/* Expanded exercises */}
                  {expanded && (
                    <div className="px-6 pb-5 pt-1 space-y-4 bg-muted/5">
                      {sess.exercises.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Aucun exercice enregistré.</p>
                      ) : (
                        sess.exercises.map((ex, exIdx) => {
                          const prevEx = prevSession?.exercises.find((e) => e.exerciseName === ex.exerciseName) ?? null
                          return (
                            <div key={exIdx} className="rounded-xl border border-border/50 bg-card p-4">
                              {/* Exercise header */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                       style={{ background: GOLD_DIM, color: GOLD }}>
                                    {exIdx + 1}
                                  </div>
                                  <p className="font-semibold text-foreground text-sm">{ex.exerciseName || "Exercice"}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {prevEx && <DeltaBadge current={ex.totalVolumeKg} prev={prevEx.totalVolumeKg} />}
                                  <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: GOLD, background: GOLD_DIM }}>
                                    {formatVol(ex.totalVolumeKg)}
                                  </span>
                                </div>
                              </div>

                              {/* Sets table */}
                              <SetTable sets={ex.sets} prevSets={prevEx?.sets} />
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
