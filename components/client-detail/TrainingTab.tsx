"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getLevelImageUrl } from "@/lib/levelAssets"
import {
  Activity, TrendingUp, Loader2, ChevronDown, ChevronUp,
  Calendar, CheckCircle2, Clock, AlertCircle, PauseCircle, Archive,
} from "lucide-react"
import type { ProfileData, ExerciseLoadHistoryItem, PlanAssignmentData } from "./types"
import { fmtDate, calcCurrentWeek } from "./utils"

interface TrainingTabProps {
  profile: ProfileData
  planAssignment: PlanAssignmentData | null
  planAssignmentLoading: boolean
  exerciseHistory: ExerciseLoadHistoryItem[]
  exerciseHistoryLoading: boolean
  restartS1Saving: boolean
  onOpenSubModal: () => void
  onAssignWorkoutPlan: () => void
  onChangeWorkoutPlan: () => void
  onRestartWeek1: () => void
}

// ── Exercise load card ────────────────────────────────────────────────────────

function ExerciseCard({ item }: { item: ExerciseLoadHistoryItem }) {
  const [expanded, setExpanded] = useState(false)

  const statusColor =
    item.progressionStatus === "eligible"
      ? "text-emerald-500"
      : item.progressionStatus === "failed"
        ? "text-red-500"
        : "text-muted-foreground"
  const statusLabel =
    item.progressionStatus === "eligible"
      ? "Progression possible"
      : item.progressionStatus === "failed"
        ? "Echec"
        : "Stable"

  return (
    <div className="rounded-xl border border-border p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{item.exerciseName}</p>
          <p className="text-[11px] text-muted-foreground">
            {item.muscleGroup || "—"}
            {item.lastCompletedAt && ` · ${fmtDate(item.lastCompletedAt)}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold">{item.lastWeight} kg</p>
          <p className={cn("text-[11px] font-medium", statusColor)}>{statusLabel}</p>
        </div>
      </div>

      {item.sets.length > 0 && (
        <div className="flex items-end gap-0.5 h-8">
          {(() => {
            const max = Math.max(...item.sets.map((s) => s.weightKg || 0), 1)
            return item.sets.map((s) => {
              const h = Math.max(12, Math.round(((s.weightKg || 0) / max) * 100))
              return (
                <div
                  key={`bar-${s.setNumber}`}
                  title={`S${s.setNumber}: ${s.weightKg}kg x ${s.reps}`}
                  className="flex-1 min-w-0 rounded-sm bg-primary/60 hover:bg-primary/90 transition-colors cursor-default"
                  style={{ height: `${h}%` }}
                />
              )
            })
          })()}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {item.sets.length} sets · Vol. {item.totalVolume} kg
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {(item.sessions && item.sessions.length > 0
            ? item.sessions
            : [{ sessionDate: item.lastCompletedAt, sets: item.sets }]
          ).map((session, sessionIdx) => (
            <div key={`${item.exerciseId}-session-${sessionIdx}`} className="rounded-lg border border-border/70 p-2">
              <p className="text-[11px] text-muted-foreground mb-1">
                Séance {sessionIdx + 1}
                {session.sessionDate ? ` · ${fmtDate(session.sessionDate)}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {session.sets.map((s) => (
                  <span
                    key={`${sessionIdx}-set-${s.setNumber}`}
                    className="inline-flex items-center text-[11px] bg-muted px-2 py-0.5 rounded-md"
                  >
                    S{s.setNumber}: {s.reps}r × {s.weightKg}kg
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Plan assignment status badge ───────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:   { label: "Actif",    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  paused:   { label: "En pause", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",          icon: <PauseCircle  className="h-3 w-3" /> },
  archived: { label: "Archivé",  color: "text-muted-foreground bg-muted border-border",                                                     icon: <Archive      className="h-3 w-3" /> },
  completed:{ label: "Terminé",  color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",                icon: <CheckCircle2 className="h-3 w-3" /> },
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrainingTab({
  profile,
  planAssignment,
  planAssignmentLoading,
  exerciseHistory,
  exerciseHistoryLoading,
  restartS1Saving,
  onOpenSubModal,
  onAssignWorkoutPlan,
  onChangeWorkoutPlan,
  onRestartWeek1,
}: TrainingTabProps) {
  const sub = profile.subscription
  const isActive = sub?.effectiveStatus === "ACTIVE"

  // ── Workout plan section (PlanAssignment) ──────────────────────────────────

  const renderWorkoutPlanCard = () => {
    if (planAssignmentLoading) {
      return (
        <Card>
          <CardContent className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )
    }

    if (!planAssignment) {
      return (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <div>
              <p className="font-medium">Aucun programme assigné</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Assigne un programme de 5 semaines pour que le client puisse s&apos;entraîner.
              </p>
            </div>
            <Button onClick={onAssignWorkoutPlan} className="gap-2">
              <Activity className="h-4 w-4" />
              Assigner un programme
            </Button>
          </CardContent>
        </Card>
      )
    }

    const statusMeta = STATUS_META[planAssignment.status] ?? STATUS_META.archived
    const startD = new Date(planAssignment.startDate)
    const endD = new Date(planAssignment.endDate)
    const todayMs = Date.now()
    const startMs = startD.getTime()
    const endMs = endD.getTime()
    const totalMs = endMs - startMs
    const elapsedMs = Math.max(0, Math.min(totalMs, todayMs - startMs))
    const progressPct = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0
    const dayElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000))
    const currentWeekNum = Math.min(5, Math.max(1, Math.floor(dayElapsed / 7) + 1))
    const daysLeft = Math.max(0, Math.ceil((endMs - todayMs) / (24 * 60 * 60 * 1000)))

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Programme d&apos;entraînement
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onChangeWorkoutPlan}>
                <TrendingUp className="h-3 w-3 mr-1" />
                Changer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] text-muted-foreground gap-1.5"
                disabled={planAssignment.status !== "active" || restartS1Saving}
                onClick={onRestartWeek1}
              >
                {restartS1Saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {restartS1Saving ? "…" : "Repartir S1"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Plan name + gender + status */}
          <div className="flex items-center gap-4">
            {planAssignment.levelName && (
              <img
                src={getLevelImageUrl(planAssignment.levelName)}
                alt={planAssignment.levelName}
                className="h-14 w-14 rounded-xl object-cover border border-border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base truncate">
                  {planAssignment.levelName || "—"}
                </p>
                <span className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                  statusMeta.color
                )}>
                  {statusMeta.icon}
                  {statusMeta.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {planAssignment.levelGender === "F" ? "Programme Femme" : "Programme Homme"}
                {" · "}
                <Clock className="h-3 w-3 inline" /> 5 semaines fixes
              </p>
            </div>
          </div>

          {/* Week progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Progression</span>
              <span className="text-sm font-bold">
                S{currentWeekNum} / 5
              </span>
            </div>
            <div className="flex gap-1.5 mb-1">
              {[1, 2, 3, 4, 5].map((w) => (
                <div
                  key={w}
                  className={cn(
                    "flex-1 h-2 rounded-full transition-all",
                    w < currentWeekNum
                      ? "bg-primary"
                      : w === currentWeekNum
                        ? "bg-primary/50"
                        : "bg-muted"
                  )}
                  title={`Semaine ${w}`}
                />
              ))}
            </div>
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((w) => (
                <span
                  key={w}
                  className={cn(
                    "text-[10px]",
                    w === currentWeekNum ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  S{w}
                </span>
              ))}
            </div>
          </div>

          {/* Dates + days left */}
          <div className="flex gap-4 flex-wrap text-xs text-muted-foreground border-t border-border pt-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Début : <strong className="text-foreground ml-1">{fmtDate(planAssignment.startDate)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Fin : <strong className="text-foreground ml-1">{fmtDate(planAssignment.endDate)}</strong>
            </span>
            {planAssignment.status === "active" && daysLeft > 0 && (
              <span className="flex items-center gap-1 text-primary font-medium">
                <Clock className="h-3 w-3" />
                {daysLeft}j restants
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Legacy subscription plan info (fallback when no PlanAssignment) ────────

  const renderLegacyPlanCard = () => {
    if (!sub || planAssignment) return null
    const levelName = sub.levelTemplateId?.name ?? ""
    const currentWeek = calcCurrentWeek(sub.startAt)
    return (
      <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Plan lié à l&apos;abonnement (legacy)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Ce client utilise encore le système legacy où le programme est lié à l&apos;abonnement.
            Migrez-le vers un programme indépendant en cliquant sur «&nbsp;Assigner un programme&nbsp;».
          </p>
          <div className="flex items-center gap-3">
            {levelName && (
              <img
                src={getLevelImageUrl(levelName)}
                alt={levelName}
                className="h-10 w-10 rounded-lg object-cover border border-border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
            <div>
              <p className="font-medium text-sm">{levelName || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {isActive ? `Semaine ${currentWeek} / 5` : "Abonnement expiré"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={onAssignWorkoutPlan} className="h-7 text-xs gap-1">
              <Activity className="h-3 w-3" />
              Assigner un programme
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground gap-1.5"
              disabled={!isActive || restartS1Saving}
              onClick={onRestartWeek1}
            >
              {restartS1Saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Repartir S1
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── No subscription at all ─────────────────────────────────────────────────

  if (!sub && !planAssignment && !planAssignmentLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Aucun abonnement actif.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={onOpenSubModal}>Configurer l&apos;abonnement</Button>
            <Button variant="outline" onClick={onAssignWorkoutPlan}>Assigner un programme</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Workout plan (PlanAssignment) card ─────────────────────────── */}
      {renderWorkoutPlanCard()}

      {/* ── Legacy plan fallback ─────────────────────────────────────── */}
      {renderLegacyPlanCard()}

      {/* ── Exercise load history ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historique des charges par exercice</CardTitle>
        </CardHeader>
        <CardContent>
          {exerciseHistoryLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : exerciseHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucun historique de charges disponible.
            </p>
          ) : (
            <div className="space-y-3">
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
