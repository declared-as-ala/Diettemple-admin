"use client"

import { useMemo, useState } from "react"
import { format, addDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, Dumbbell, History, User, Users, Target } from "lucide-react"
import { AdminConfirmDialog, AdminFormSection, AdminModal, AdminModalFooter, AdminSearchableSelect } from "@/components/admin"
import type { LevelTemplate, PlanAssignmentData } from "./types"
import { PLAN_OBJECTIVES, getObjectiveDef, normalizeObjectiveKey } from "@/lib/planObjectives"

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
  onRenew: () => void
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
  onRenew,
}: WorkoutPlanModalProps) {
  const isChange = !!currentAssignment
  const [objectiveFilter, setObjectiveFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [activeOnly, setActiveOnly] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const filteredTemplates = useMemo(() => {
    return templates
      .filter((template) => !isChange || template._id !== currentAssignment?.planTemplateId)
      .filter((template) => (template.gender || "M") === selectedGender)
      .filter((template) => !activeOnly || template.isActive !== false)
      .filter((template) => {
        if (objectiveFilter === "all") return true
        const key = normalizeObjectiveKey(template.objective)
        return key === objectiveFilter
      })
      .filter((template) => {
        if (levelFilter === "all") return true
        return (template.level || "").toUpperCase() === levelFilter
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
  }, [activeOnly, currentAssignment?.planTemplateId, isChange, levelFilter, objectiveFilter, selectedGender, templates])

  const selectedPlan = templates.find((template) => template._id === selectedTemplate)
  const durationWeeks = selectedPlan?.weeks?.length || 0

  const endDate = (() => {
    if (!startDate) return ""
    try {
      if (!durationWeeks) return ""
      return format(addDays(new Date(`${startDate}T12:00:00`), durationWeeks * 7 - 1), "yyyy-MM-dd")
    } catch {
      return ""
    }
  })()

  const endDateDisplay = (() => {
    if (!endDate) return "—"
    try {
      return format(new Date(endDate), "d MMMM yyyy")
    } catch {
      return endDate
    }
  })()

  const submit = () => {
    if (isChange) setConfirmOpen(true)
    else onSave()
  }

  return (
    <>
      <AdminModal
        open={open}
        onOpenChange={onOpenChange}
        title="Sélectionner un programme d'entraînement"
        description="Filtrez par sexe, objectif et niveau pour affecter le plan d'entraînement approprié."
        icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}
        size="lg"
        busy={saving}
        dirty={Boolean(selectedTemplate || note)}
        footer={(requestClose) => (
          <AdminModalFooter
            status={selectedPlan ? `Plan sélectionné : ${selectedPlan.name}` : "Aucun plan sélectionné"}
            statusTone={selectedPlan ? "valid" : "warning"}
            submitLabel={isChange ? "Continuer vers la confirmation" : "Assigner le programme"}
            loadingLabel="Enregistrement…"
            loading={saving}
            submitDisabled={!selectedTemplate || !startDate || selectedTemplate === currentAssignment?.planTemplateId}
            onCancel={requestClose}
            onSubmit={submit}
          />
        )}
      >
        <div className="space-y-5">
          {isChange && (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Plan actuel : {currentAssignment?.levelName ?? "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentAssignment?.durationWeeks} semaines · le prochain cycle commence à la fin du plan · progression préservée.
                  </p>
                </div>
              </div>
              <Button type="button" onClick={onRenew} className="shrink-0 text-xs">
                Renouveler le même plan
              </Button>
            </div>
          )}

          {/* Sexe, Objectif, Niveau filters */}
          <AdminFormSection
            title="Rechercher et filtrer"
            description="Filtrez la bibliothèque de programmes par sexe, objectif et niveau."
            icon={<Target className="h-5 w-5" aria-hidden="true" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Sexe */}
              <div className="space-y-1.5">
                <Label className="text-xs">Sexe</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["M", "F"] as const).map((gender) => (
                    <Button
                      key={gender}
                      type="button"
                      variant={selectedGender === gender ? "default" : "outline"}
                      size="sm"
                      className="h-10 text-xs"
                      onClick={() => {
                        onGenderChange(gender)
                        if (gender !== selectedGender) onSelectTemplate("", "", gender)
                      }}
                    >
                      {gender === "M" ? <User className="h-3.5 w-3.5 mr-1" /> : <Users className="h-3.5 w-3.5 mr-1" />}
                      {gender === "M" ? "Hommes" : "Femmes"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Objectif */}
              <div className="space-y-1.5">
                <Label htmlFor="workout-objective-filter" className="text-xs">Objectif</Label>
                <select
                  id="workout-objective-filter"
                  value={objectiveFilter}
                  onChange={(event) => setObjectiveFilter(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Tous les objectifs</option>
                  {PLAN_OBJECTIVES.map((obj) => (
                    <option key={obj.key} value={obj.key}>
                      {obj.label}
                    </option>
                  ))}
                  <option value="unclassified">Non classés</option>
                </select>
              </div>

              {/* Niveau */}
              <div className="space-y-1.5">
                <Label htmlFor="workout-level-filter" className="text-xs">Niveau</Label>
                <select
                  id="workout-level-filter"
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Tous les niveaux</option>
                  {["INITIATE", "FIGHTER", "WARRIOR", "CHAMPION", "ELITE"].map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0) + level.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Disponibilité */}
              <div className="space-y-1.5 flex flex-col justify-end pb-1">
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={activeOnly}
                    onChange={(event) => setActiveOnly(event.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  Actifs uniquement
                </label>
              </div>
            </div>
          </AdminFormSection>

          <AdminFormSection
            title="Programme sélectionné"
            description={isChange ? "Choisissez le nouveau plan de remplacement." : "Sélectionnez le plan à assigner."}
          >
            <AdminSearchableSelect
              items={filteredTemplates}
              selectedKeys={selectedTemplate ? [selectedTemplate] : []}
              onSelectionChange={(keys) => {
                const nextKey = keys[0]
                if (!nextKey) {
                  onSelectTemplate("", "", selectedGender)
                  return
                }
                const plan = templates.find((template) => template._id === nextKey)
                if (plan) onSelectTemplate(plan._id, plan.name, (plan.gender || "M") as "M" | "F")
              }}
              getKey={(template) => template._id}
              getLabel={(template) => template.clientDisplayName || template.name}
              getSearchText={(template) => `${template.name} ${template.clientDisplayName || ""} ${template.level || ""} ${template.gender || ""} ${template.objective || ""}`}
              renderMeta={(template) => {
                const objDef = getObjectiveDef(template.objective)
                const lvl = template.level ? template.level.charAt(0).toUpperCase() + template.level.slice(1).toLowerCase() : "Initiate"
                return `${objDef.label} · ${lvl} · ${template.gender === "F" ? "Femme" : "Homme"}`
              }}
              maxSelections={1}
              placeholder="Rechercher par nom, niveau ou objectif…"
              emptyText="Aucun programme ne correspond aux filtres sélectionnés."
              loading={templatesLoading}
              label="Programme d'entraînement"
            />
          </AdminFormSection>

          <AdminFormSection
            title="Date et note d'affectation"
            description="La durée et la date de fin sont calculées automatiquement depuis le cycle."
            icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="workout-start-date" className="text-xs">Date de début</Label>
                <Input
                  id="workout-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="h-10 bg-muted/30 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date de fin automatique</Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground font-medium">
                  {endDateDisplay}
                </div>
              </div>
            </div>
            <div className="space-y-1.5 mt-3">
              <Label htmlFor="workout-note" className="text-xs">Note coach <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
              <Input
                id="workout-note"
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Ex. Attention aux charges sur le développé couché."
                className="h-10 bg-muted/30 text-xs"
              />
            </div>
          </AdminFormSection>

          {selectedPlan && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-foreground space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">{selectedPlan.name}</p>
                <span className="font-semibold text-primary">
                  {getObjectiveDef(selectedPlan.objective).label}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground pt-1">
                <p>Niveau dérivé : <strong className="text-foreground">{selectedPlan.level ? selectedPlan.level.charAt(0).toUpperCase() + selectedPlan.level.slice(1).toLowerCase() : "Initiate"}</strong></p>
                <p>Sexe cible : <strong className="text-foreground">{selectedPlan.gender === "F" ? "Femme" : "Homme"}</strong></p>
                <p>Date effective : <strong className="text-foreground">{startDate || "À définir"}</strong></p>
                <p className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Durée : <strong className="text-foreground">{durationWeeks ? `${durationWeeks} semaines` : "5 semaines"}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Changer le programme du client ?"
        description={
          selectedPlan
            ? `Le programme « ${currentAssignment?.levelName ?? "actuel"} » sera remplacé par « ${selectedPlan.name} » à partir du ${startDate}. Les séances passées et les records restent préservés.`
            : undefined
        }
        confirmLabel="Confirmer le changement"
        cancelLabel="Annuler"
        loading={saving}
        onConfirm={onSave}
      />
    </>
  )
}
