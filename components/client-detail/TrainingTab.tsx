"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getLevelImageUrl } from "@/lib/levelAssets"
import {
  Activity, TrendingUp, Loader2, ChevronDown, ChevronUp,
  Calendar, CheckCircle2, Clock, PauseCircle, Archive, Trophy,
  Dumbbell, Sparkles, RefreshCw,
} from "lucide-react"
import type { ExerciseLoadHistoryItem, PlanAssignmentData } from "./types"
import { fmtDate } from "./utils"

interface TrainingTabProps {
  planAssignment: PlanAssignmentData | null
  planAssignmentLoading: boolean
  exerciseHistory: ExerciseLoadHistoryItem[]
  exerciseHistoryLoading: boolean
  restartS1Saving: boolean
  onOpenSubModal: () => void
  onAssignWorkoutPlan: () => void
  onChangeWorkoutPlan: () => void
  onRestartWeek1: () => void
  onRenewPlan: () => void
}

// ── Compact Exercise Card with PR highlight & history ─────────────────────────

function ExerciseCard({ item }: { item: ExerciseLoadHistoryItem }) {
  const [expanded, setExpanded] = useState(false)

  // Compute PR from all sessions and sets
  const { prWeight, lastWeightVal, totalSessionsCount, historyRows } = useMemo(() => {
    let maxWeight = Number(item.personalRecord || 0)
    let lastW = Number(item.lastWeight || 0)

    const rows: Array<{
      date: string | null
      setNumber: number
      reps: number
      weight: number
      completed: boolean
      isPr: boolean
    }> = []

    const allSessions = item.sessions && item.sessions.length > 0
      ? item.sessions
      : (item.sets && item.sets.length > 0 ? [{ sessionDate: item.lastCompletedAt, sets: item.sets }] : [])

    allSessions.forEach((sess) => {
      (sess.sets || []).forEach((st) => {
        const w = Number(st.weightKg || 0)
        if (w > maxWeight) maxWeight = w
      })
    })

    if (lastW > maxWeight) maxWeight = lastW

    // Build row entries
    allSessions.forEach((sess) => {
      (sess.sets || []).forEach((st) => {
        const w = Number(st.weightKg || 0)
        rows.push({
          date: sess.sessionDate || sess.completedAt || item.lastCompletedAt || null,
          setNumber: st.setNumber,
          reps: st.reps,
          weight: w,
          completed: st.completed,
          isPr: maxWeight > 0 && w === maxWeight,
        })
      })
    })

    const count = allSessions.length > 0 ? allSessions.length : (item.sets.length > 0 ? 1 : 0)

    return {
      prWeight: maxWeight,
      lastWeightVal: lastW > 0 ? lastW : (rows[0]?.weight ?? 0),
      totalSessionsCount: count,
      historyRows: rows,
    }
  }, [item])

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all shadow-sm">
      {/* Top row: Name & Muscle Group */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-foreground truncate">{item.exerciseName}</h4>
            {prWeight > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Trophy className="h-3 w-3" /> PR: {prWeight} kg
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.muscleGroup || "Exercice général"}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] gap-1 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Masquer" : "Voir l'historique"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/60 text-xs">
        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Record (PR)
          </span>
          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
            <Trophy className="h-3.5 w-3.5" />
            {prWeight > 0 ? `${prWeight} kg` : "—"}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Dernière charge
          </span>
          <span className="text-sm font-bold text-foreground mt-0.5 block">
            {lastWeightVal > 0 ? `${lastWeightVal} kg` : "—"}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Dernière séance
          </span>
          <span className="text-xs font-semibold text-foreground mt-0.5 truncate block">
            {item.lastCompletedAt ? fmtDate(item.lastCompletedAt) : "—"}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Séances réalisées
          </span>
          <span className="text-sm font-bold text-foreground mt-0.5 block">
            {totalSessionsCount}
          </span>
        </div>
      </div>

      {/* Expanded History Table */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/70 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Historique des séries & charges
            </p>
            <span className="text-[11px] text-muted-foreground">
              {historyRows.length} série{historyRows.length > 1 ? "s" : ""} enregistrée{historyRows.length > 1 ? "s" : ""}
            </span>
          </div>

          {historyRows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 italic">
              Aucun détail de série disponible pour cet exercice.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/20">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-semibold text-[11px] bg-muted/40">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-center py-2 px-2">Série</th>
                    <th className="text-center py-2 px-2">Répétitions</th>
                    <th className="text-right py-2 px-3">Charge</th>
                    <th className="text-right py-2 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors",
                        r.isPr && "bg-amber-500/5 font-semibold"
                      )}
                    >
                      <td className="py-2 px-3 text-muted-foreground">
                        {r.date ? fmtDate(r.date) : "—"}
                      </td>
                      <td className="py-2 px-2 text-center text-foreground font-medium">
                        S{r.setNumber || idx + 1}
                      </td>
                      <td className="py-2 px-2 text-center text-foreground font-medium">
                        {r.reps} reps
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-nums">
                        {r.weight} kg
                      </td>
                      <td className="py-2 px-3 text-right">
                        {r.isPr ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            <Trophy className="h-2.5 w-2.5" /> PR
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Validé</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Plan assignment status badge ───────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: {
    label: "Actif",
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  paused: {
    label: "En pause",
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: <PauseCircle className="h-3.5 w-3.5" />,
  },
  archived: {
    label: "Archivé",
    color: "text-muted-foreground bg-muted border-border",
    icon: <Archive className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "Terminé",
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
}

// ── Main Plan Tab Component ───────────────────────────────────────────────────

export default function TrainingTab({
  planAssignment,
  planAssignmentLoading,
  exerciseHistory,
  exerciseHistoryLoading,
  restartS1Saving,
  onOpenSubModal,
  onAssignWorkoutPlan,
  onChangeWorkoutPlan,
  onRestartWeek1,
  onRenewPlan,
}: TrainingTabProps) {
  const [todayMs] = useState(() => Date.now())

  // Sessions completion stats
  const sessionStats = useMemo(() => {
    if (!planAssignment) return { completed: 0, total: 0, remaining: 0, pct: 0 }

    const completed = planAssignment.progress?.completedSessions ?? 0
    const total = planAssignment.progress?.totalScheduledSessions ?? (planAssignment.durationWeeks * 4)
    const remaining = Math.max(0, total - completed)
    const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0

    return { completed, total, remaining, pct }
  }, [planAssignment])

  if (planAssignmentLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!planAssignment) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Aucun programme actif</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Assigne un plan d'entraînement pour permettre au client de suivre ses séances et d'enregistrer ses charges.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={onAssignWorkoutPlan} className="gap-1.5 h-9 text-xs">
                <Activity className="h-4 w-4" />
                Assigner un programme
              </Button>
              <Button variant="outline" onClick={onOpenSubModal} className="h-9 text-xs">
                Configurer l'abonnement
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusMeta = STATUS_META[planAssignment.status] ?? STATUS_META.archived
  const startD = new Date(planAssignment.startDate)
  const endD = new Date(planAssignment.endDate)
  const startMs = startD.getTime()
  const endMs = endD.getTime()
  const totalMs = Math.max(1, endMs - startMs)
  const elapsedMs = Math.max(0, Math.min(totalMs, todayMs - startMs))
  const dayElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000))
  const currentWeekNum =
    planAssignment.progress?.currentWeek ??
    Math.min(planAssignment.durationWeeks, Math.max(1, Math.floor(dayElapsed / 7) + 1))
  const daysLeft =
    planAssignment.progress?.remainingDays ??
    Math.max(0, Math.ceil((endMs - todayMs) / (24 * 60 * 60 * 1000)))

  return (
    <div className="space-y-6">
      {/* ── 1. PLAN HEADER CARD ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-primary" />
              Programme d&apos;entraînement
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold gap-1"
                onClick={onRenewPlan}
              >
                <Calendar className="h-3.5 w-3.5" />
                Renouveler
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold gap-1"
                onClick={onChangeWorkoutPlan}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Changer le plan
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground gap-1.5"
                disabled={planAssignment.status !== "active" || restartS1Saving}
                onClick={onRestartWeek1}
              >
                {restartS1Saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {restartS1Saving ? "…" : "Repartir S1"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Plan identity & banner */}
          <div className="flex items-center gap-4">
            {planAssignment.levelName && (
              <img
                src={getLevelImageUrl(planAssignment.levelName)}
                alt={planAssignment.levelName}
                className="h-16 w-16 rounded-2xl object-cover border border-border shadow-sm flex-shrink-0"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-foreground truncate">
                  {planAssignment.levelName || "Programme DietTemple"}
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
                    statusMeta.color
                  )}
                >
                  {statusMeta.icon}
                  {statusMeta.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {planAssignment.levelGender === "F" ? "Programme Femme" : "Programme Homme"}
                {" · "}
                Durée : <strong>{planAssignment.durationWeeks} semaines</strong>
                {daysLeft > 0 && planAssignment.status === "active" && (
                  <span className="ml-1 text-primary font-semibold">
                    · {daysLeft} jours restants
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Week step progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Progression du cycle</span>
              <span className="font-bold text-foreground">
                Semaine {currentWeekNum} / {planAssignment.durationWeeks}
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: planAssignment.durationWeeks }, (_, index) => index + 1).map((w) => (
                <div
                  key={w}
                  className={cn(
                    "flex-1 h-2.5 rounded-full transition-all",
                    w < currentWeekNum
                      ? "bg-primary"
                      : w === currentWeekNum
                        ? "bg-primary/60 ring-2 ring-primary/30"
                        : "bg-muted"
                  )}
                  title={`Semaine ${w}`}
                />
              ))}
            </div>
          </div>

          {/* Plan dates metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Début</span>
              <span className="font-bold text-foreground mt-0.5 block">{fmtDate(planAssignment.startDate)}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Fin</span>
              <span className="font-bold text-foreground mt-0.5 block">
                {fmtDate(planAssignment.finalActiveDate || planAssignment.endDate)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Statut</span>
              <span className="font-bold text-foreground mt-0.5 block capitalize">{statusMeta.label}</span>
            </div>
            <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Jours restants</span>
              <span className="font-bold text-primary mt-0.5 block">{daysLeft} jours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. WORKOUT SESSIONS COMPLETION KPI (Requirement 6) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between font-semibold">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Séances terminées
            </span>
            <Badge variant="outline" className="text-xs font-bold px-2.5 py-0.5">
              {sessionStats.pct} % complété
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider mb-1">
                Terminées
              </span>
              <span className="text-2xl font-extrabold text-foreground">
                {sessionStats.completed} <span className="text-xs text-muted-foreground font-normal">/ {sessionStats.total}</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider mb-1">
                Restantes
              </span>
              <span className="text-2xl font-extrabold text-foreground">
                {sessionStats.remaining}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-[11px] font-semibold text-primary block uppercase tracking-wider mb-1">
                Complétion
              </span>
              <span className="text-2xl font-extrabold text-primary">
                {sessionStats.pct} %
              </span>
            </div>
          </div>

          {/* Clean progress bar */}
          <div className="space-y-1">
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${sessionStats.pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Début du programme</span>
              <span>{sessionStats.completed} sur {sessionStats.total} séances réalisées</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. EXERCISE LOAD & PR HISTORY (Requirements 7, 8, 9) ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
              <Dumbbell className="h-4 w-4 text-primary" />
              Historique des charges & Records par exercice (PR)
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {exerciseHistory.length} exercice{exerciseHistory.length > 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {exerciseHistoryLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Chargement des charges et PRs...</p>
            </div>
          ) : exerciseHistory.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-border rounded-xl">
              <Dumbbell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Aucun historique de charges enregistré</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Les records (PR) et les charges apparaîtront automatiquement dès que le client validera ses premières séries.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exerciseHistory.map((item) => (
                <ExerciseCard key={item.exerciseId} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
