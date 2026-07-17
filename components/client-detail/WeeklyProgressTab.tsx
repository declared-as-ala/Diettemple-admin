"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, CheckCircle2, XCircle, AlertCircle, TrendingUp, Info } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface WeeklyProgressTabProps {
  weeklyValidation: any
  weeklyValidationLoading: boolean
  weeklyValidationHistory: any[]
  weeklyValidationHistoryLoading: boolean
}

export default function WeeklyProgressTab({
  weeklyValidation,
  weeklyValidationLoading,
  weeklyValidationHistory,
  weeklyValidationHistoryLoading,
}: WeeklyProgressTabProps) {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">VALIDÉ</Badge>
      case "NOT_VALIDATED":
        return <Badge variant="destructive">NON VALIDÉ</Badge>
      case "IN_PROGRESS":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">EN COURS</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      case "NOT_VALIDATED":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "IN_PROGRESS":
        return <AlertCircle className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />
    }
  }

  const formatDateRange = (start: string, end: string) => {
    try {
      const s = new Date(start)
      const e = new Date(end)
      return `${format(s, "d MMMM", { locale: fr })} — ${format(e, "d MMMM yyyy", { locale: fr })}`
    } catch {
      return "Dates invalides"
    }
  }

  return (
    <div className="space-y-6">
      {/* ── CURRENT WEEK CARD ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Semaine en cours
            </span>
            {weeklyValidation && getStatusBadge(weeklyValidation.status)}
          </CardTitle>
          <CardDescription>
            Statistiques en temps réel et critères de validation pour la semaine actuelle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyValidationLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : !weeklyValidation ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun programme d'entraînement actif pour calculer les validations de cette semaine.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info panel */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border/50 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Période de la semaine</p>
                  <p className="text-xs font-medium mt-1 truncate">
                    {formatDateRange(weeklyValidation.weekStart, weeklyValidation.weekEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Numéro de semaine</p>
                  <p className="text-xs font-medium mt-1">Semaine {weeklyValidation.weekNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Statut actuel</p>
                  <p className="text-xs font-semibold mt-1 flex items-center gap-1.5">
                    {getStatusIcon(weeklyValidation.status)}
                    {weeklyValidation.status === "VALIDATED" ? "Objectifs atteints" : weeklyValidation.status === "NOT_VALIDATED" ? "Objectifs non atteints" : "Validation en cours"}
                  </p>
                </div>
              </div>

              {/* Progress bars */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Workouts */}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Séances d'entraînement</h4>
                    <span className="text-sm font-bold tabular-nums">
                      {weeklyValidation.completedSessions} / {weeklyValidation.maximumWeeklySessions}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden relative">
                    {/* Minimum target marker */}
                    {weeklyValidation.maximumWeeklySessions > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
                        style={{ left: `${(weeklyValidation.minimumWeeklySessions / weeklyValidation.maximumWeeklySessions) * 100}%` }}
                        title={`Minimum requis : ${weeklyValidation.minimumWeeklySessions}`}
                      />
                    )}
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (weeklyValidation.completedSessions / (weeklyValidation.maximumWeeklySessions || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cible requise : de <span className="font-semibold text-foreground">{weeklyValidation.minimumWeeklySessions}</span> à <span className="font-semibold text-foreground">{weeklyValidation.maximumWeeklySessions}</span> séances uniques terminées.
                  </p>
                </div>

                {/* Nutrition */}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jours de nutrition validés</h4>
                    <span className="text-sm font-bold tabular-nums">
                      {weeklyValidation.nutritionSuccessfulDays} / 7
                    </span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
                      style={{ left: `${(6 / 7) * 100}%` }}
                      title="Minimum requis : 6 jours"
                    />
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(weeklyValidation.nutritionSuccessfulDays / 7) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cible requise : au moins <span className="font-semibold text-foreground">6 jours / 7</span> complétés (repas enregistrés conformes).
                  </p>
                </div>
              </div>

              {/* Reasons if failed */}
              {weeklyValidation.status === "NOT_VALIDATED" && weeklyValidation.validationMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Raison de la non-validation :</p>
                    <p className="mt-1 opacity-90">{weeklyValidation.validationMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── HISTORY CARD ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Historique des semaines complétées
          </CardTitle>
          <CardDescription>
            Validation archivée et statistiques de toutes les semaines passées de l'abonnement actuel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyValidationHistoryLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : weeklyValidationHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Aucune semaine archivée dans l'historique pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground border-b border-border text-left uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Semaine</th>
                    <th className="pb-3 font-semibold">Période</th>
                    <th className="pb-3 font-semibold">Séances</th>
                    <th className="pb-3 font-semibold">Nutrition</th>
                    <th className="pb-3 font-semibold">Statut</th>
                    <th className="pb-3 font-semibold text-right">Date de validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {weeklyValidationHistory.map((week) => (
                    <tr key={week._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 font-bold">Semaine {week.weekNumber}</td>
                      <td className="py-3.5 text-muted-foreground text-xs">
                        {formatDateRange(week.weekStart, week.weekEnd)}
                      </td>
                      <td className="py-3.5 tabular-nums">
                        {week.completedSessions} / {week.maximumWeeklySessions}
                      </td>
                      <td className="py-3.5 tabular-nums">
                        {week.nutritionSuccessfulDays} / 7
                      </td>
                      <td className="py-3.5">{getStatusBadge(week.status)}</td>
                      <td className="py-3.5 text-right text-muted-foreground text-xs tabular-nums">
                        {format(new Date(week.validatedAt || week.createdAt), "dd/MM/yyyy HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
