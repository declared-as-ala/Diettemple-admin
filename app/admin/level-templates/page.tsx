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
  clientDisplayName?: string
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
  const [newClientDisplayName, setNewClientDisplayName] = useState("")
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
    const clientDisplayName = newClientDisplayName.trim()
    const errors: AdminFormError[] = []
    if (!name) errors.push({ field: "plan-name", message: "Le nom interne du plan est obligatoire." })
    if (!clientDisplayName) errors.push({ field: "plan-client-name", message: "Veuillez saisir le nom affiché au client." })
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
        clientDisplayName,
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
      setNewClientDisplayName("")
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
      setDeleteTarget(null)
      await load("")
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur lors de la suppression", "error")
    } finally {
      setDeleteLoading(false)
    }
  }

  const currentFolderList = filteredList()
  const createDirty = Boolean(newName || newClientDisplayName || newDescription || newMinSessions !== 3 || newMaxSessions !== 5)
  const hasCreateValidationError = createErrors.length > 0

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedFolder && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                Retour aux dossiers
              </Button>
            )}
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {selectedFolder === "male"
                ? "Dossier Hommes"
                : selectedFolder === "female"
                ? "Dossier Femmes"
                : selectedFolder === "unclassified"
                ? "Dossier Non classés"
                : "Plans par niveau"}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {selectedFolder
              ? `${currentFolderList.length} plan${currentFolderList.length !== 1 ? "s" : ""} dans ce dossier`
              : "Organisez les programmes par sexe et structurez les 5 semaines d’entraînement"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load(search)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Créer un plan
          </Button>
        </div>
      </div>

      {!selectedFolder && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(() => {
            const stats = folderStats()
            return (
              <>
                <div
                  onClick={() => handleOpenFolder("male")}
                  className="group relative cursor-pointer rounded-2xl border border-border bg-card/60 p-6 transition-all hover:border-primary/40 hover:bg-card hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
                      <User className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">Dossier Hommes</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Plans d’entraînement structurés pour les hommes.</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 text-xs font-medium text-muted-foreground">
                    <span>{stats.male.count} plans</span>
                    <span>{stats.male.sessions} séances</span>
                  </div>
                </div>

                <div
                  onClick={() => handleOpenFolder("female")}
                  className="group relative cursor-pointer rounded-2xl border border-border bg-card/60 p-6 transition-all hover:border-primary/40 hover:bg-card hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-pink-500/10 p-3 text-pink-500">
                      <Users className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">Dossier Femmes</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Plans d’entraînement structurés pour les femmes.</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 text-xs font-medium text-muted-foreground">
                    <span>{stats.female.count} plans</span>
                    <span>{stats.female.sessions} séances</span>
                  </div>
                </div>

                {stats.unclassified.count > 0 && (
                  <div
                    onClick={() => handleOpenFolder("unclassified")}
                    className="group relative cursor-pointer rounded-2xl border border-border bg-card/60 p-6 transition-all hover:border-primary/40 hover:bg-card hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
                        <Folder className="h-6 w-6" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-foreground">Dossier Non classés</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Plans sans filtre de sexe spécifié.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 text-xs font-medium text-muted-foreground">
                      <span>{stats.unclassified.count} plans</span>
                      <span>{stats.unclassified.sessions} séances</span>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {selectedFolder && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom interne ou nom client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {currentFolderList.length} plan{currentFolderList.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {selectedFolder && (
        loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl border border-border bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : currentFolderList.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/40 p-12 text-center text-muted-foreground">
            Aucun plan trouvé dans ce dossier.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentFolderList.map((t) => {
              const sessionCount = countSessions(t)
              const configuredWeeks = countConfiguredWeeks(t)
              return (
                <div
                  key={t._id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-foreground truncate">{t.name || "Sans nom"}</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                          Nom client : {t.clientDisplayName || t.name || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant={t.isActive !== false ? "default" : "secondary"}>
                          {t.isActive !== false ? "Actif" : "Inactif"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t.gender === "F" ? <Users className="h-3.5 w-3.5 inline" /> : <User className="h-3.5 w-3.5 inline" />}
                        </span>
                      </div>
                    </div>

                    {t.description && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {configuredWeeks}/5 sem.
                      </span>
                      <span>•</span>
                      <span>{sessionCount} séance{sessionCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5 pt-4 border-t border-border/50">
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
        )
      )}

      <AdminModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Créer un plan"
        description="Configurez les noms d’identification, le niveau et la visibilité client du programme."
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
            description="Définissez le nom interne pour l’équipe et le nom commercial visible par le client."
            icon={<BadgeCheck className="h-5 w-5" aria-hidden="true" />}
          >
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="plan-name" className="font-semibold text-foreground flex items-center gap-2">
                  Nom interne du plan *
                </Label>
                <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md flex items-center gap-1">
                  Visible uniquement par l'équipe
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Visible uniquement par les coachs et les administrateurs.</p>
              <Input
                ref={planNameRef}
                id="plan-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Ex. Initiate_2_A"
                aria-invalid={createErrors.some((error) => error.field === "plan-name")}
                disabled={creating}
                className="h-11 bg-card"
              />
              {createErrors.some((error) => error.field === "plan-name") && (
                <p className="text-sm text-destructive font-medium">Le nom interne du plan est obligatoire.</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="plan-client-name" className="font-semibold text-foreground flex items-center gap-2">
                  Nom affiché au client *
                </Label>
                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  Visible application & espaces clients
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Nom propre et compréhensible affiché dans l’application mobile et les espaces clients.</p>
              <Input
                id="plan-client-name"
                value={newClientDisplayName}
                onChange={(event) => setNewClientDisplayName(event.target.value)}
                placeholder="Ex. Programme Initiate — Fondations"
                aria-invalid={createErrors.some((error) => error.field === "plan-client-name")}
                disabled={creating}
                className="h-11 bg-card"
              />
              {createErrors.some((error) => error.field === "plan-client-name") && (
                <p className="text-sm text-destructive font-medium">Veuillez saisir le nom affiché au client.</p>
              )}
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-1" aria-live="polite">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Aperçu dans l’application</p>
              <p className="text-base font-bold text-foreground">
                {newClientDisplayName.trim() || newName.trim() || "Programme Initiate — Fondations"}
              </p>
              <p className="text-xs text-muted-foreground">
                Niveau {PLAN_LEVELS.find((l) => l.value === newLevel)?.label} · 5 semaines
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Statut</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={newIsActive ? "default" : "outline"} onClick={() => setNewIsActive(true)} aria-pressed={newIsActive} disabled={creating}>Actif</Button>
                  <Button type="button" variant={!newIsActive ? "default" : "outline"} onClick={() => setNewIsActive(false)} aria-pressed={!newIsActive} disabled={creating}>Inactif</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sexe / dossier</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={newGender === "M" ? "default" : "outline"} className="justify-start" onClick={() => setNewGender("M")} aria-pressed={newGender === "M"} disabled={creating || selectedFolder === "female"}>
                    <User className="h-4 w-4 mr-1" aria-hidden="true" /> Homme
                  </Button>
                  <Button type="button" variant={newGender === "F" ? "default" : "outline"} className="justify-start" onClick={() => setNewGender("F")} aria-pressed={newGender === "F"} disabled={creating || selectedFolder === "male"}>
                    <Users className="h-4 w-4 mr-1" aria-hidden="true" /> Femme
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-desc">Description <span className="font-normal text-muted-foreground">(optionnel)</span></Label>
              <Textarea
                id="plan-desc"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Décrivez l’objectif, le public cible et la structure du plan."
                className="min-h-24 resize-y bg-card"
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
                      "relative min-h-24 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
                      selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground hover:border-border/80 hover:bg-muted/50"
                    )}
                  >
                    {selected && <CircleCheck className="absolute right-2 top-2 h-4 w-4 text-primary" aria-hidden="true" />}
                    <span className="block pr-5 text-sm font-semibold">{level.label}</span>
                    <span className="mt-1 block text-xs leading-4 text-muted-foreground">{level.description}</span>
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
                <Input id="plan-weeks" value="5" readOnly aria-readonly="true" className="bg-muted/40 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minSessions">Séances minimum / semaine</Label>
                <Input id="minSessions" type="number" min={1} max={7} value={newMinSessions} onChange={(event) => setNewMinSessions(Number(event.target.value) || 1)} aria-invalid={createErrors.some((error) => error.field === "minSessions")} disabled={creating} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSessions">Séances maximum / semaine</Label>
                <Input id="maxSessions" type="number" min={1} max={7} value={newMaxSessions} onChange={(event) => setNewMaxSessions(Number(event.target.value) || 1)} aria-invalid={newMaxSessions < newMinSessions || createErrors.some((error) => error.field === "maxSessions")} disabled={creating} />
                {newMaxSessions < newMinSessions && <p className="text-sm text-destructive">Le maximum doit être supérieur au minimum.</p>}
              </div>
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
