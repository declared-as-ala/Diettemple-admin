"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import {
  Dumbbell, TrendingUp, Users, Award, ChevronRight,
  Loader2, Activity, Search, ArrowUpDown,
} from "lucide-react"

const GOLD = "#D4AF37"
const GOLD_DIM = "rgba(212,175,55,0.15)"

type UserSummary = {
  userId: string
  name: string
  email: string
  totalVolumeKg: number
  totalSessions: number
  lastSessionAt: string | null
  topExercises: Array<{ exerciseName: string; maxWeightKg: number; totalVolumeKg: number }>
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`
  return `${kg.toLocaleString()} kg`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function MedalBadge({ rank }: { rank: number }) {
  const config =
    rank === 1 ? { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" } :
    rank === 2 ? { bg: "bg-slate-400/15", text: "text-slate-400", border: "border-slate-400/25" } :
    rank === 3 ? { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-400/25" } :
    { bg: "bg-muted", text: "text-muted-foreground", border: "border-border/50" }
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}>
      {rank}
    </span>
  )
}

export default function WeightTrackingPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"volume" | "sessions">("volume")

  useEffect(() => {
    api.getWeightAnalytics()
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err?.response?.data?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users
    .filter((u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === "volume" ? b.totalVolumeKg - a.totalVolumeKg : b.totalSessions - a.totalSessions
    )

  const totalVolume = users.reduce((s, u) => s + u.totalVolumeKg, 0)
  const totalSessions = users.reduce((s, u) => s + u.totalSessions, 0)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: GOLD_DIM, border: `1px solid ${GOLD}33` }}>
          <Dumbbell className="h-6 w-6" style={{ color: GOLD }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Suivi des charges</h1>
          <p className="text-sm text-muted-foreground">Volume soulevé et progression par client</p>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-500/20 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground font-medium">Volume total</p>
            <div className="p-2 rounded-xl" style={{ background: GOLD_DIM }}>
              <TrendingUp className="h-4 w-4" style={{ color: GOLD }} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{formatVolume(totalVolume)}</p>
          <p className="text-xs text-muted-foreground mt-1">cumulé tous clients</p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground font-medium">Clients suivis</p>
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{users.length}</p>
          <p className="text-xs text-muted-foreground mt-1">avec séances enregistrées</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground font-medium">Séances totales</p>
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Award className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{totalSessions}</p>
          <p className="text-xs text-muted-foreground mt-1">complétées</p>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Table header with search + sort */}
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Activity className="h-4 w-4" style={{ color: GOLD }} />
            <h2 className="font-bold text-foreground">Classement des clients</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 w-48"
                style={{ "--tw-ring-color": GOLD } as any}
              />
            </div>
            {/* Sort toggle */}
            <button
              onClick={() => setSortBy((s) => s === "volume" ? "sessions" : "volume")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === "volume" ? "Volume" : "Séances"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-20 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">
              {search ? "Aucun résultat pour cette recherche." : "Aucune séance enregistrée."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/20">
                  <th className="px-5 py-3 text-left font-semibold">#</th>
                  <th className="px-5 py-3 text-left font-semibold">Client</th>
                  <th className="px-5 py-3 text-right font-semibold">Volume total</th>
                  <th className="px-5 py-3 text-right font-semibold">Séances</th>
                  <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Dernière séance</th>
                  <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Meilleur exercice</th>
                  <th className="px-5 py-3 text-center font-semibold">Détail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, idx) => {
                  const rank = users.findIndex((u) => u.userId === user.userId) + 1
                  return (
                    <tr
                      key={user.userId}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/admin/weight-tracking/${user.userId}`)}
                    >
                      <td className="px-5 py-4">
                        <MedalBadge rank={rank} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                               style={{ background: GOLD_DIM, color: GOLD }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-extrabold text-base" style={{ color: GOLD }}>
                          {formatVolume(user.totalVolumeKg)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-muted text-foreground font-semibold text-sm">
                          {user.totalSessions}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-sm hidden md:table-cell">
                        {formatDate(user.lastSessionAt)}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {user.topExercises[0] ? (
                          <div>
                            <p className="font-semibold text-foreground text-xs truncate max-w-[160px]">
                              {user.topExercises[0].exerciseName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              max <span className="font-bold" style={{ color: GOLD }}>{user.topExercises[0].maxWeightKg} kg</span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <button
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all group-hover:text-amber-400 group-hover:border-amber-500/30"
                            style={{ color: GOLD, borderColor: `${GOLD}33`, background: GOLD_DIM }}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/weight-tracking/${user.userId}`)
                            }}
                          >
                            Voir <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
