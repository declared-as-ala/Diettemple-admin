"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getLevelImageUrl } from "@/lib/levelAssets"
import { Activity, TrendingUp, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import type { ProfileData, ExerciseLoadHistoryItem } from "./types"
import { fmtDate, calcCurrentWeek, daysUntil } from "./utils"

interface TrainingTabProps {
  profile: ProfileData
  exerciseHistory: ExerciseLoadHistoryItem[]
  exerciseHistoryLoading: boolean
  restartS1Saving: boolean
  onOpenSubModal: () => void
  onChangePlan: () => void
  onRestartWeek1: () => void
}

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
            {item.muscleGroup || "\u2014"}
            {item.lastCompletedAt && ` . ${fmtDate(item.lastCompletedAt)}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold">{item.lastWeight} kg</p>
          <p className={cn("text-[11px] font-medium", statusColor)}>{statusLabel}</p>
        </div>
      </div>

      {/* Sparkline */}
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

      {/* Expandable sets */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {item.sets.length} sets . Vol. {item.totalVolume} kg
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {(item.sessions && item.sessions.length > 0 ? item.sessions : [{ sessionDate: item.lastCompletedAt, sets: item.sets }]).map((session, sessionIdx) => (
            <div key={`${item.exerciseId}-session-${sessionIdx}`} className="rounded-lg border border-border/70 p-2">
              <p className="text-[11px] text-muted-foreground mb-1">
                Seance {sessionIdx + 1}
                {session.sessionDate ? ` . ${fmtDate(session.sessionDate)}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {session.sets.map((s) => (
                  <span
                    key={`${sessionIdx}-set-${s.setNumber}`}
                    className="inline-flex items-center text-[11px] bg-muted px-2 py-0.5 rounded-md"
                  >
                    S{s.setNumber}: {s.reps}r x {s.weightKg}kg
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

export default function TrainingTab({
  profile,
  exerciseHistory,
  exerciseHistoryLoading,
  restartS1Saving,
  onOpenSubModal,
  onChangePlan,
  onRestartWeek1,
}: TrainingTabProps) {
  const sub = profile.subscription
  const isActive = sub?.effectiveStatus === "ACTIVE"
  const levelName = sub?.levelTemplateId?.name ?? ""
  const levelGender = sub?.levelTemplateId?.gender ?? ""
  const currentWeek = sub ? calcCurrentWeek(sub.startAt) : 0

  if (!sub) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Aucun abonnement actif.</p>
          <Button onClick={onOpenSubModal}>Assigner un plan</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Training plan card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Plan d&apos;entrainement
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={onChangePlan}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Changer de plan
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] text-muted-foreground gap-1.5"
                disabled={!isActive || restartS1Saving}
                onClick={onRestartWeek1}
              >
                {restartS1Saving && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                {restartS1Saving ? "En cours..." : "Repartir S1"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {levelName && (
              <img
                src={getLevelImageUrl(levelName)}
                alt={levelName}
                className="h-14 w-14 rounded-xl object-cover border border-border"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            )}
            <div>
              <p className="font-semibold text-lg">{levelName || "\u2014"}</p>
              <p className="text-sm text-muted-foreground">
                {levelGender === "F" ? "Programme Femme" : "Programme Homme"}
              </p>
            </div>
          </div>

          {/* Week progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Semaine courante
              </span>
              <span
                className={cn(
                  "text-sm font-bold",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {isActive ? `S${currentWeek} / 5` : "\u2014"}
              </span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((w) => (
                <div
                  key={w}
                  className={cn(
                    "flex-1 h-2 rounded-full transition-all",
                    isActive && w < currentWeek
                      ? "bg-primary"
                      : isActive && w === currentWeek
                        ? "bg-primary/60"
                        : "bg-muted"
                  )}
                  title={`Semaine ${w}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {[1, 2, 3, 4, 5].map((w) => (
                <span
                  key={w}
                  className={cn(
                    "text-[10px]",
                    w === currentWeek && isActive
                      ? "text-primary font-bold"
                      : "text-muted-foreground"
                  )}
                >
                  S{w}
                </span>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Debut : {fmtDate(sub.startAt)}</span>
            <span>
              {isActive ? "Fin" : "Termine"} : {fmtDate(sub.endAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Exercise history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Historique des charges par exercice
          </CardTitle>
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
