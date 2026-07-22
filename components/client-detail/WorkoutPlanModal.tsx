"use client"

import { useMemo, useState } from "react"
import { format, addDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, Dumbbell, History, User, Users } from "lucide-react"
import { AdminConfirmDialog, AdminFormSection, AdminModal, AdminModalFooter, AdminSearchableSelect } from "@/components/admin"
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
  const [levelFilter, setLevelFilter] = useState("all")
  const [activeOnly, setActiveOnly] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const filteredTemplates = useMemo(() => templates
    .filter((template) => (template.gender || "M") === selectedGender)
    .filter((template) => !activeOnly || template.isActive !== false)
    .filter((template) => levelFilter === "all" || template.level === levelFilter)
    .sort((a, b) => a.name.localeCompare(b.name, "fr")), [activeOnly, levelFilter, selectedGender, templates])
  const selectedPlan = templates.find((template) => template._id === selectedTemplate)

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

  const submit = () => {
    if (isChange) setConfirmOpen(true)
    else onSave()
  }

  return (
    <>
      <AdminModal open={open} onOpenChange={onOpenChange} title="Sélectionner un plan" description="Choisissez le programme qui déterminera automatiquement le niveau du client." icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />} size="lg" busy={saving} dirty={Boolean(selectedTemplate || note)} footer={(requestClose) => <AdminModalFooter status={selectedPlan ? `Plan sélectionné : ${selectedPlan.name}` : "Aucun plan sélectionné"} statusTone={selectedPlan ? "valid" : "warning"} submitLabel={isChange ? "Continuer vers la confirmation" : "Assigner le plan"} loadingLabel="Enregistrement…" loading={saving} submitDisabled={!selectedTemplate || !startDate || selectedTemplate === currentAssignment?.planTemplateId} onCancel={requestClose} onSubmit={submit} />}>
        <div className="space-y-5">
          {isChange && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><History className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">L’historique sera préservé</p><p className="mt-1">Le plan actuel « {currentAssignment?.levelName ?? "actuel"} » sera archivé sans supprimer la progression passée.</p></div></div>}

          <AdminFormSection title="Rechercher et filtrer" description="La recherche est effectuée dans les plans déjà chargés." icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2"><Label>Sexe</Label><div className="grid grid-cols-2 gap-2">{(["M", "F"] as const).map((gender) => <Button key={gender} type="button" variant={selectedGender === gender ? "default" : "outline"} size="lg" onClick={() => onGenderChange(gender)}><span className="sr-only">Filtrer par </span>{gender === "M" ? <User className="h-4 w-4" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}{gender === "M" ? "Homme" : "Femme"}</Button>)}</div></div>
              <div className="space-y-2"><Label htmlFor="workout-level-filter">Niveau</Label><select id="workout-level-filter" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-600"><option value="all">Tous les niveaux</option>{["INITIATE", "FIGHTER", "WARRIOR", "CHAMPION", "ELITE"].map((level) => <option key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</option>)}</select></div>
              <div className="space-y-2"><Label>Disponibilité</Label><label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"><input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} className="h-4 w-4" /> Plans actifs uniquement</label></div>
            </div>
          </AdminFormSection>

          <AdminFormSection title="Plans disponibles" description="Le plan actuel est indiqué et ne peut pas être sélectionné à nouveau.">
            <AdminSearchableSelect items={filteredTemplates} selectedKeys={selectedTemplate ? [selectedTemplate] : []} onSelectionChange={(keys) => { const plan = templates.find((template) => template._id === keys[0]); if (plan) onSelectTemplate(plan._id, plan.name, (plan.gender || "M") as "M" | "F") }} getKey={(template) => template._id} getLabel={(template) => template.name} getSearchText={(template) => `${template.name} ${template.level || ""} ${template.gender || ""}`} renderMeta={(template) => `${template.level ? template.level.charAt(0) + template.level.slice(1).toLowerCase() : "Niveau non renseigné"} · ${template.gender === "F" ? "Femme" : "Homme"} · ${template.weeks?.length ?? PLAN_WEEKS} semaines${currentAssignment?.planTemplateId === template._id ? " · Plan actuel" : ""}`} maxSelections={1} disabledKeys={currentAssignment?.planTemplateId ? [currentAssignment.planTemplateId] : []} placeholder="Rechercher par nom de plan…" emptyText="Aucun plan ne correspond aux filtres." loading={templatesLoading} label="Plans disponibles" />
          </AdminFormSection>

          <AdminFormSection title="Affectation" description="La date de fin est calculée automatiquement sur 35 jours." icon={<Calendar className="h-5 w-5" aria-hidden="true" />}>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="workout-start-date">Date de début</Label><Input id="workout-start-date" type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="h-11 bg-white" /></div><div className="space-y-2"><Label>Date de fin automatique</Label><div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700">{endDateDisplay}</div></div></div>
            <div className="space-y-2"><Label htmlFor="workout-note">Note <span className="font-normal text-slate-500">(optionnel)</span></Label><Input id="workout-note" value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Ex. Démarrage progressif, attention au genou gauche." className="h-11 bg-white" /></div>
          </AdminFormSection>

          {selectedPlan && <div className="rounded-xl border border-lime-200 bg-lime-50 p-4 text-sm text-lime-950"><p className="font-semibold">{selectedPlan.name}</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><p>Niveau actuel : {currentAssignment?.levelName ?? "Non affecté"}</p><p>Nouveau niveau dérivé : {selectedPlan.level ? selectedPlan.level.charAt(0) + selectedPlan.level.slice(1).toLowerCase() : selectedPlan.name}</p><p>Date effective : {startDate || "À définir"}</p><p className="flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" /> 5 semaines</p></div></div>}
        </div>
      </AdminModal>

      <AdminConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Changer le plan du client ?" description={selectedPlan ? `Le plan « ${currentAssignment?.levelName ?? "actuel"} » sera remplacé par « ${selectedPlan.name} » à partir du ${startDate}. La progression historique restera préservée.` : undefined} confirmLabel="Confirmer le changement" cancelLabel="Continuer la modification" loading={saving} onConfirm={onSave} />
    </>
  )
}
