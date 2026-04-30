"use client"

import { useMemo } from "react"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogBody, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, User, Users, Calendar, Clock, CheckCircle2 } from "lucide-react"
import type { LevelTemplate, PlanAssignmentData } from "./types"

const PLAN_WEEKS = 5
const PLAN_DAYS = PLAN_WEEKS * 7

interface WorkoutPlanModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  clientId: string
  currentAssignment: PlanAssignmentData | null
  templates: LevelTemplate[]
  templatesLoading: boolean
  selectedTemplate: string
  onSelectTemplate: (id: string, name: string, gender: "M" | "F") => void
  selectedGender: "M" | "F"
  onGenderChange: (g: "M" | "F") => void
  startDate: string
  onStartDateChange: (d: string) => void
  note: string
  onNoteChange: (n: string) => void
  saving: boolean
  onSave: () => void
}

export default function WorkoutPlanModal({
  open,
  onOpenChange,
  currentAssignment,
  templates,
  templatesLoading,
  selectedTemplate,
  onSelectTemplate,
  selectedGender,
  onGenderChange,
  startDate,
  onStartDateChange,
  note,
  onNoteChange,
  saving,
  onSave,
}: WorkoutPlanModalProps) {
  const isChange = !!currentAssignment
  const filteredTemplates = templates.filter((t) => (t.gender || "M") === selectedGender)

  const endDate = useMemo(() => {
    if (!startDate) return ""
    try {
      return format(addDays(new Date(startDate), PLAN_DAYS - 1), "yyyy-MM-dd")
    } catch {
      return ""
    }
  }, [startDate])

  const endDateDisplay = useMemo(() => {
    if (!endDate) return "—"
    try {
      return format(new Date(endDate), "d MMMM yyyy")
    } catch {
      return endDate
    }
  }, [endDate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isChange ? "Changer le programme" : "Assigner un programme"}
          </DialogTitle>
          <DialogDescription>
            {isChange
              ? "L'ancien programme sera archivé. Un nouveau programme de 5 semaines démarrera."
              : "Sélectionnez un programme et une date de début. La durée est fixe : 5 semaines."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Warning for change */}
          {isChange && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Attention — changement de programme
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Le programme actif <strong>{currentAssignment?.levelName ?? "actuel"}</strong> sera archivé.
                L&apos;historique des séances est conservé.
              </p>
            </div>
          )}

          {/* Fixed duration info */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">Durée fixe : 5 semaines</p>
              <p className="text-xs text-muted-foreground">35 jours · La date de fin est calculée automatiquement</p>
            </div>
          </div>

          {/* Start date + auto end date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                <Calendar className="h-3 w-3 inline mr-1" />
                Date de début
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                Date de fin (auto)
              </Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                {endDateDisplay}
              </div>
            </div>
          </div>

          {/* Gender selector */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Programme
            </Label>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-muted-foreground">Genre :</span>
              <div className="flex gap-1.5">
                {(["M", "F"] as const).map((g) => {
                  const hasAny = templates.some((t) => (t.gender || "M") === g)
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={!hasAny}
                      onClick={() => {
                        onGenderChange(g)
                        const first = templates.find((t) => (t.gender || "M") === g)
                        if (first) onSelectTemplate(first._id, first.name || "", g)
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        selectedGender === g
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-muted",
                        !hasAny && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {g === "M" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      {g === "M" ? "Homme" : "Femme"}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Template list */}
            {templatesLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filteredTemplates.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">
                    Aucun programme disponible pour ce genre.
                  </p>
                ) : (
                  filteredTemplates.map((t) => {
                    const isPick = selectedTemplate === t._id
                    const isCurrent = currentAssignment?.planTemplateId === t._id
                    return (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => onSelectTemplate(t._id, t.name || "", (t.gender || "M") as "M" | "F")}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between gap-2",
                          isPick ? "bg-primary/10 font-medium" : "hover:bg-muted/80"
                        )}
                      >
                        <span className="truncate">{t.name || t._id}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCurrent && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Actuel</span>
                          )}
                          {isPick && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Note (optionnel)</Label>
            <Input
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ex: Programme intensif démarrage semaine 1"
              className="h-8 text-sm"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !selectedTemplate || !startDate}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving
              ? "Enregistrement…"
              : isChange
                ? "Changer le programme"
                : "Assigner le programme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
