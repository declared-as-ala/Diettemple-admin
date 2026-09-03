"use client"

import { useMemo, useState } from "react"
import { format, addDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, Dumbbell, History, User, Users } from "lucide-react"
import { AdminConfirmDialog, AdminFormSection, AdminModal, AdminModalFooter, AdminSearchableSelect } from "@/components/admin"
import type { LevelTemplate, PlanAssignmentData } from "./types"

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
  const [levelFilter, setLevelFilter] = useState("all")
  const [activeOnly, setActiveOnly] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const filteredTemplates = useMemo(() => templates
    .filter((template) => (template.gender || "M") === selectedGender)
    .filter((template) => !activeOnly || template.isActive !== false)
    .filter((template) => levelFilter === "all" || template.level === levelFilter)
    .sort((a, b) => a.name.localeCompare(b.name, "fr")), [activeOnly, levelFilter, selectedGender, templates])
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
      <AdminModal open={open} onOpenChange={onOpenChange} title="Sélectionner un plan" description="Choisissez le programme qui déterminera automatiquement le niveau du client." icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />} size="lg" busy={saving} dirty={Boolean(selectedTemplate || note)} footer={(requestClose) => <AdminModalFooter status={selectedPlan ? `Plan sélectionné : ${selectedPlan.name}` : "Aucun plan sélectionné"} statusTone={selectedPlan ? "valid" : "warning"} submitLabel={isChange ? "Continuer vers la confirmation" : "Assigner le plan"} loadingLabel="Enregistrement…" loading={saving} submitDisabled={!selectedTemplate || !startDate || selectedTemplate === currentAssignment?.planTemplateId} onCancel={requestClose} onSubmit={submit} />}>
        <div className="space-y-5">
          {isChange && <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><History className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="font-semibold">Plan actuel : {currentAssignment?.levelName ?? "—"}</p><p className="mt-1 text-muted-foreground">{currentAssignment?.durationWeeks} semaines · le prochain cycle commence à la fin du plan · historique préservé.</p></div></div><Button type="button" onClick={onRenew} className="shrink-0">Renouveler le même plan</Button></div>}

          <AdminFormSection title="Rechercher et filtrer" description="La recherche est effectuée dans les plans déjà chargés." icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2"><Label>Sexe</Label><div className="grid grid-cols-2 gap-2">{(["M", "F"] as const).map((gender) => <Button key={gender} type="button" variant={selectedGender === gender ? "default" : "outline"} size="lg" onClick={() => onGenderChange(gender)}><span className="sr-only">Filtrer par </span>{gender === "M" ? <User className="h-4 w-4" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}{gender === "M" ? "Homme" : "Femme"}</Button>)}</div></div>
              <div className="space-y-2"><Label htmlFor="workout-level-filter">Niveau</Label><select id="workout-level-filter" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"><option value="all">Tous les niveaux</option>{["INITIATE", "FIGHTER", "WARRIOR", "CHAMPION", "ELITE"].map((level) => <option key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</option>)}</select></div>
              <div className="space-y-2"><Label>Disponibilité</Label><label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-foreground"><input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} className="h-4 w-4 accent-primary" /> Plans actifs uniquement</label></div>
            </div>
          </AdminFormSection>

          <AdminFormSection title="Plans disponibles" description="Le plan actuel est indiqué et ne peut pas être sélectionné à nouveau.">
            <AdminSearchableSelect items={filteredTemplates} selectedKeys={selectedTemplate ? [selectedTemplate] : []} onSelectionChange={(keys) => { const plan = templates.find((template) => template._id === keys[0]); if (plan) onSelectTemplate(plan._id, plan.name, (plan.gender || "M") as "M" | "F") }} getKey={(template) => template._id} getLabel={(template) => template.clientDisplayName || template.name} getSearchText={(template) => `${template.name} ${template.clientDisplayName || ""} ${template.level || ""} ${template.gender || ""}`} renderMeta={(template) => `Nom interne : ${template.name} · ${template.level ? template.level.charAt(0) + template.level.slice(1).toLowerCase() : "Niveau non renseigné"} · ${template.gender === "F" ? "Femme" : "Homme"}${currentAssignment?.planTemplateId === template._id ? " · Plan actuel" : ""}`} maxSelections={1} disabledKeys={currentAssignment?.planTemplateId ? [currentAssignment.planTemplateId] : []} placeholder="Rechercher par nom interne ou nom client…" emptyText="Aucun plan ne correspond aux filtres." loading={templatesLoading} label="Plans disponibles" />
          </AdminFormSection>

          <AdminFormSection title="Affectation" description="La durée et la date de fin sont calculées depuis les semaines du plan." icon={<Calendar className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="workout-start-date">Date de début</Label><Input id="workout-start-date" type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="h-11 bg-muted/30" /></div><div className="space-y-2"><Label>Date de fin automatique</Label><div className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-3 text-sm text-muted-foreground">{endDateDisplay}</div></div></div>
            <div className="space-y-2"><Label htmlFor="workout-note">Note <span className="font-normal text-muted-foreground">(optionnel)</span></Label><Input id="workout-note" value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Ex. Démarrage progressif, attention au genou gauche." className="h-11 bg-muted/30" /></div>
          </AdminFormSection>

          {selectedPlan && <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground"><p className="font-semibold">{selectedPlan.name}</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><p>Niveau actuel : {currentAssignment?.levelName ?? "Non affecté"}</p><p>Nouveau niveau dérivé : {selectedPlan.level ? selectedPlan.level.charAt(0) + selectedPlan.level.slice(1).toLowerCase() : selectedPlan.name}</p><p>Date effective : {startDate || "À définir"}</p><p className="flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" /> {durationWeeks ? `${durationWeeks} semaine${durationWeeks > 1 ? "s" : ""}` : "Durée non configurée"}</p></div></div>}
        </div>
      </AdminModal>

      <AdminConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Changer le plan du client ?" description={selectedPlan ? `Le plan « ${currentAssignment?.levelName ?? "actuel"} » sera remplacé par « ${selectedPlan.name} » à partir du ${startDate}. La progression historique restera préservée.` : undefined} confirmLabel="Confirmer le changement" cancelLabel="Continuer la modification" loading={saving} onConfirm={onSave} />
    </>
  )
}
