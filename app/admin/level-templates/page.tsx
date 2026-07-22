"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { ConfirmModal } from "@/components/shared/ConfirmModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  AdminFormErrorSummary,
  AdminFormSection,
  AdminModal,
  AdminModalFooter,
  type AdminFormError,
} from "@/components/admin"
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Folder,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  User,
  Users,
} from "lucide-react"

type FolderType = "male" | "female" | "unclassified" | null

const PLAN_LEVELS = [
  { value: "INITIATE", label: "Initiate", description: "Découverte et bases" },
  { value: "FIGHTER", label: "Fighter", description: "Rythme régulier" },
  { value: "WARRIOR", label: "Warrior", description: "Progression soutenue" },
  { value: "CHAMPION", label: "Champion", description: "Performance avancée" },
  { value: "ELITE", label: "Elite", description: "Exigence maximale" },
] as const

type LevelTemplateRow = {
  _id: string
  name?: string
  description?: string
  gender?: string
  isActive?: boolean
  weeks?: Array<{ days?: Record<string, unknown[]> }>
}

function countSessions(template: LevelTemplateRow): number {
  if (!template?.weeks?.length) return 0
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  return template.weeks.reduce((sum, w) => {
    const d = w.days || {}
    return sum + dayKeys.reduce((s, k) => s + (d[k]?.length || 0), 0)
  }, 0)
}

function countConfiguredWeeks(template: LevelTemplateRow): number {
  if (!template?.weeks?.length) return 0
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  return template.weeks.filter((w) => {
    const d = w.days || {}
    return dayKeys.some((k) => (d[k]?.length || 0) > 0)
  }).length
}

export default function LevelTemplatesPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [list, setList] = useState<LevelTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedFolder, setSelectedFolder] = useState<FolderType>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newGender, setNewGender] = useState<"M" | "F">("M")
  const [newDescription, setNewDescription] = useState("")
  const [newLevel, setNewLevel] = useState<'INITIATE' | 'FIGHTER' | 'WARRIOR' | 'CHAMPION' | 'ELITE'>('INITIATE')
  const [newIsActive, setNewIsActive] = useState(true)
  const [newMinSessions, setNewMinSessions] = useState(3)
  const [newMaxSessions, setNewMaxSessions] = useState(5)
  const [createErrors, setCreateErrors] = useState<AdminFormError[]>([])
  const planNameRef = useRef<HTMLInputElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<LevelTemplateRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filteredList = useCallback(() => {
    if (!selectedFolder) return list
    if (selectedFolder === "male") return list.filter((t) => (t.gender || "M") === "M")
    if (selectedFolder === "female") return list.filter((t) => t.gender === "F")
    return list.filter((t) => !t.gender || (t.gender !== "M" && t.gender !== "F"))
  }, [list, selectedFolder])

  const folderStats = useCallback(() => {
    const male = list.filter((t) => (t.gender || "M") === "M")
    const female = list.filter((t) => t.gender === "F")
    const unclassified = list.filter((t) => !t.gender || (t.gender !== "M" && t.gender !== "F"))
    return {
      male: { count: male.length, sessions: male.reduce((s, t) => s + countSessions(t), 0) },
      female: { count: female.length, sessions: female.reduce((s, t) => s + countSessions(t), 0) },
      unclassified: { count: unclassified.length, sessions: unclassified.reduce((s, t) => s + countSessions(t), 0) },
    }
  }, [list])

  const handleOpenFolder = (folder: FolderType) => {
    setSelectedFolder(folder)
    setSearch("")
    if (folder === "male") setNewGender("M")
    else if (folder === "female") setNewGender("F")
    else setNewGender("M")
  }

  const handleBack = () => {
    setSelectedFolder(null)
    setSearch("")
  }

  const load = useCallback(async (searchQuery: string) => {
    setLoading(true)
    try {
      const q = searchQuery.trim()
      const data = await api.getLevelTemplates({ limit: 100, search: q || undefined })
      setList((data.levelTemplates || []) as LevelTemplateRow[])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur de chargement", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const t = setTimeout(() => {
      void load(search)
    }, 300)
    return () => clearTimeout(t)
  }, [search, load])

  const handleCreate = async () => {
    const name = newName.trim()
    const errors: AdminFormError[] = []
    if (!name) errors.push({ field: "plan-name", message: "Le nom du plan est obligatoire." })
    if (!newLevel) errors.push({ field: "plan-level", message: "Veuillez sélectionner un niveau." })
    if (newMinSessions < 1 || newMinSessions > 7) {
      errors.push({ field: "minSessions", message: "Le minimum doit être compris entre 1 et 7." })
    }
    if (newMaxSessions < 1 || newMaxSessions > 7) {
      errors.push({ field: "maxSessions", message: "Le maximum doit être compris entre 1 et 7." })
    } else if (newMaxSessions < newMinSessions) {
      errors.push({ field: "maxSessions", message: "Le maximum doit être supérieur ou égal au minimum." })
    }
    setCreateErrors(errors)
    if (errors.length > 0) {
      requestAnimationFrame(() => document.getElementById(errors[0].field ?? "")?.focus())
      return
    }
    setCreating(true)
    try {
      const data = await api.createLevelTemplate({
        name,
        level: newLevel,
        gender: newGender,
        isActive: newIsActive,
        description: newDescription.trim() || undefined,
        minimumSessionsPerWeek: newMinSessions,
        maximumSessionsPerWeek: newMaxSessions,
      })
      const created = (data as { levelTemplate?: { _id: string } })?.levelTemplate
      toast("Plan créé", "success")
      setCreateOpen(false)
      setNewName("")
      setNewDescription("")
      setNewLevel('INITIATE')
      setNewIsActive(true)
      setNewMinSessions(3)
      setNewMaxSessions(5)
      setCreateErrors([])
      if (selectedFolder === "male") setNewGender("M")
      else if (selectedFolder === "female") setNewGender("F")
      else setNewGender("M")
      if (created?._id) {
        router.push(`/admin/level-templates/${created._id}`)
      } else {
        await load("")
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      const message = e.response?.data?.message || e.message || "Impossible de créer le plan. Vérifiez les informations puis réessayez."
      setCreateErrors([{ message }])
      toast(message, "error")
    } finally {
      setCreating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.deleteLevelTemplate(deleteTarget._id)
      toast("Plan supprimé", "success")
      await load(search)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Impossible de supprimer ce plan", "error")
      throw err
    } finally {
      setDeleteLoading(false)
    }
  }

  const stats = folderStats()
  const currentList = filteredList()
  const defaultGender = selectedFolder === "female" ? "F" : "M"
  const createDirty = Boolean(
    newName || newDescription || newLevel !== "INITIATE" || newGender !== defaultGender ||
    !newIsActive || newMinSessions !== 3 || newMaxSessions !== 5
  )
  const hasCreateValidationError = createErrors.length > 0 || newMaxSessions < newMinSessions

  const folderSearchPlaceholder = !selectedFolder
    ? "Rechercher un dossier…"
    : `Rechercher dans ${selectedFolder === "male" ? "Dossier Hommes" : selectedFolder === "female" ? "Dossier Femmes" : "Dossier non classé"}…`

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {!selectedFolder ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">Plans</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Organisez vos plans par catégorie — Hommes, Femmes ou non classé.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour aux dossiers
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedFolder === "male" ? "Dossier Hommes" : selectedFolder === "female" ? "Dossier Femmes" : "Dossier non classé"}
              </h1>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load(search)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {selectedFolder ? "Créer un plan" : "Créer un plan"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={folderSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {!selectedFolder
            ? `${list.length} dossier${list.length !== 1 ? "s" : ""}`
            : `${currentList.length} plan${currentList.length !== 1 ? "s" : ""}`}
        </p>
      </div>

{loading && list.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedFolder ? (
        list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Aucun dossier</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Créez un plan puis ajoutez les séances sur les 5 semaines. Depuis la fiche client, vous pourrez affecter ce plan
              à l&apos;abonnement.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un plan
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stats.male.count > 0 && (
              <button
                onClick={() => handleOpenFolder("male")}
                className="group relative flex flex-col items-center p-8 rounded-2xl border border-border bg-card hover:bg-accent hover:border-yellow-500/50 transition-all duration-200 text-left"
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                    {stats.male.count} plan{stats.male.count !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Folder className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Dossier Hommes</h3>
                <p className="text-sm text-muted-foreground mb-3">{stats.male.sessions} séance{stats.male.sessions !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                  Plans d&apos;entraînement masculins
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400 group-hover:underline">
                  Ouvrir le dossier
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            )}
            {stats.female.count > 0 && (
              <button
                onClick={() => handleOpenFolder("female")}
                className="group relative flex flex-col items-center p-8 rounded-2xl border border-border bg-card hover:bg-accent hover:border-pink-500/50 transition-all duration-200 text-left"
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20">
                    {stats.female.count} plan{stats.female.count !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Folder className="w-10 h-10 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Dossier Femmes</h3>
                <p className="text-sm text-muted-foreground mb-3">{stats.female.sessions} séance{stats.female.sessions !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                  Plans d&apos;entraînement féminins
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 dark:text-pink-400 group-hover:underline">
                  Ouvrir le dossier
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            )}
            {stats.unclassified.count > 0 && (
              <button
                onClick={() => handleOpenFolder("unclassified")}
                className="group relative flex flex-col items-center p-8 rounded-2xl border border-border bg-card hover:bg-accent hover:border-gray-500/50 transition-all duration-200 text-left"
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20">
                    {stats.unclassified.count} plan{stats.unclassified.count !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-500/20 to-gray-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Folder className="w-10 h-10 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Dossier non classé</h3>
                <p className="text-sm text-muted-foreground mb-3">{stats.unclassified.sessions} séance{stats.unclassified.sessions !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                  Plans sans genre assigné
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:underline">
                  Ouvrir le dossier
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            )}
            {(stats.male.count === 0 && stats.female.count === 0 && stats.unclassified.count === 0) && (
              <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                <p className="text-sm font-medium text-foreground">Aucun plan</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Créez un plan puis ajoutez les séances sur les 5 semaines.
                </p>
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un plan
                </Button>
              </div>
            )}
          </div>
        )
      ) : currentList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            {search ? "Aucun résultat" : "Aucun plan"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {search
              ? "Essayez avec un autre terme de recherche."
              : selectedFolder === "unclassified"
              ? "Aucun plan sans genre assigné."
              : `Créez un plan ${selectedFolder === "male" ? "masculin" : selectedFolder === "female" ? "féminin" : ""} puis ajoutez les séances.`}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {currentList.map((t) => {
            const sessions = countSessions(t)
            const weeks = countConfiguredWeeks(t)
            const gender = t.gender === "F" ? "F" : "M"
            return (
              <div
                key={t._id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{t.name ?? "—"}</p>
                    {t.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={t.isActive !== false ? "default" : "secondary"} className="text-[10px]">
                      {t.isActive !== false ? "Actif" : "Inactif"}
                    </Badge>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium"
                      title={gender === "F" ? "Femme" : "Homme"}
                    >
                      {gender === "F" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {gender === "F" ? "F" : "M"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {weeks}/5 sem.
                  </span>
                  <span>{sessions} séance{sessions !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Link href={`/admin/level-templates/${t._id}`} className="flex-1">
                    <Button size="sm" className="w-full" variant="default">
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Planning
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Button>
                  </Link>
                  <Link href={`/admin/level-templates/${t._id}?tab=info`}>
                    <Button size="sm" variant="outline" title="Informations">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Supprimer le plan"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AdminModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Créer un plan"
        description="Configurez les informations générales, le niveau et le rythme du programme."
        icon={<LayoutGrid className="h-5 w-5" aria-hidden="true" />}
        size="lg"
        busy={creating}
        dirty={createDirty}
        initialFocusRef={planNameRef}
        footer={(requestClose) => (
          <AdminModalFooter
            status={createDirty ? "Modifications non enregistrées" : "Renseignez les informations du plan"}
            statusTone={hasCreateValidationError ? "warning" : createDirty ? "neutral" : "valid"}
            submitLabel="Créer le plan"
            loadingLabel="Création…"
            loading={creating}
            onCancel={requestClose}
            onSubmit={() => void handleCreate()}
          />
        )}
      >
        <div className="space-y-5">
          <AdminFormErrorSummary errors={createErrors} />

          <AdminFormSection
            title="Informations générales"
            description="Identifiez le programme et définissez sa visibilité."
            icon={<BadgeCheck className="h-5 w-5" aria-hidden="true" />}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="plan-name">Nom du plan *</Label>
                <Input
                  ref={planNameRef}
                  id="plan-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Ex. Plan Fitness Beginner"
                  aria-invalid={createErrors.some((error) => error.field === "plan-name")}
                  disabled={creating}
                />
                {createErrors.some((error) => error.field === "plan-name") && (
                  <p className="text-sm text-red-700">Le nom du plan est obligatoire.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={newIsActive ? "default" : "outline"} onClick={() => setNewIsActive(true)} aria-pressed={newIsActive} disabled={creating}>Actif</Button>
                  <Button type="button" variant={!newIsActive ? "default" : "outline"} onClick={() => setNewIsActive(false)} aria-pressed={!newIsActive} disabled={creating}>Inactif</Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sexe / dossier</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant={newGender === "M" ? "default" : "outline"} size="lg" className="justify-start" onClick={() => setNewGender("M")} aria-pressed={newGender === "M"} disabled={creating || selectedFolder === "female"}>
                  <User className="h-4 w-4" aria-hidden="true" /> Homme
                </Button>
                <Button type="button" variant={newGender === "F" ? "default" : "outline"} size="lg" className="justify-start" onClick={() => setNewGender("F")} aria-pressed={newGender === "F"} disabled={creating || selectedFolder === "male"}>
                  <Users className="h-4 w-4" aria-hidden="true" /> Femme
                </Button>
              </div>
              {selectedFolder && selectedFolder !== "unclassified" && (
                <p className="text-sm text-slate-600">Le dossier courant détermine le sexe de ce plan.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-desc">Description <span className="font-normal text-slate-500">(optionnel)</span></Label>
              <Textarea
                id="plan-desc"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Décrivez l’objectif, le public cible et la structure du plan."
                className="min-h-24 resize-y"
                disabled={creating}
              />
            </div>
          </AdminFormSection>

          <AdminFormSection
            id="plan-level"
            title="Classification"
            description="Le niveau reste distinct du nom et déterminera le niveau des clients affectés."
            icon={<CircleCheck className="h-5 w-5" aria-hidden="true" />}
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" role="radiogroup" aria-label="Niveau du plan">
              {PLAN_LEVELS.map((level) => {
                const selected = newLevel === level.value
                return (
                  <button
                    key={level.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setNewLevel(level.value)}
                    disabled={creating}
                    className={cn(
                      "relative min-h-24 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 focus-visible:ring-offset-2 disabled:opacity-50",
                      selected ? "border-lime-500 bg-lime-50 text-slate-950" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {selected && <CircleCheck className="absolute right-2 top-2 h-4 w-4 text-lime-700" aria-hidden="true" />}
                    <span className="block pr-5 text-sm font-semibold">{level.label}</span>
                    <span className="mt-1 block text-xs leading-4 text-slate-500">{level.description}</span>
                  </button>
                )
              })}
            </div>
          </AdminFormSection>

          <AdminFormSection
            title="Durée et fréquence"
            description="Le planning est créé sur cinq semaines avec une fréquence cible modifiable."
            icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="plan-weeks">Nombre de semaines</Label>
                <Input id="plan-weeks" value="5" readOnly aria-readonly="true" className="bg-slate-100 text-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minSessions">Séances minimum / semaine</Label>
                <Input id="minSessions" type="number" min={1} max={7} value={newMinSessions} onChange={(event) => setNewMinSessions(Number(event.target.value) || 1)} aria-invalid={createErrors.some((error) => error.field === "minSessions")} disabled={creating} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSessions">Séances maximum / semaine</Label>
                <Input id="maxSessions" type="number" min={1} max={7} value={newMaxSessions} onChange={(event) => setNewMaxSessions(Number(event.target.value) || 1)} aria-invalid={newMaxSessions < newMinSessions || createErrors.some((error) => error.field === "maxSessions")} disabled={creating} />
                {newMaxSessions < newMinSessions && <p className="text-sm text-red-700">Le maximum doit être supérieur ou égal au minimum.</p>}
              </div>
            </div>
            <div className="rounded-xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-950" aria-live="polite">
              Ce plan dure 5 semaines avec {newMinSessions} à {newMaxSessions} séances par semaine.
            </div>
          </AdminFormSection>

          <AdminFormSection
            title="Image et présentation"
            description="L’illustration de niveau existante sera utilisée automatiquement. Aucun envoi d’image supplémentaire n’est requis."
            icon={<LayoutGrid className="h-5 w-5" aria-hidden="true" />}
          >
            <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Présentation automatique</p>
                <p className="mt-1 text-sm text-slate-600">Niveau sélectionné : {PLAN_LEVELS.find((level) => level.value === newLevel)?.label}</p>
              </div>
              <Badge variant="outline">5 semaines</Badge>
            </div>
          </AdminFormSection>
        </div>
      </AdminModal>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Supprimer ce plan ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.name ?? "Sans nom"} » sera définitivement supprimé. Les clients avec cet abonnement peuvent être impactés — vérifiez les affectations avant de continuer.`
            : undefined
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
