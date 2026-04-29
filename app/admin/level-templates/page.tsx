"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { ConfirmModal } from "@/components/shared/ConfirmModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Folder,
  FolderOpen,
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
    if (!name) {
      toast("Indiquez un nom de plan", "error")
      return
    }
    setCreating(true)
    try {
      const data = await api.createLevelTemplate({
        name,
        gender: newGender,
        description: newDescription.trim() || undefined,
      })
      const created = (data as { levelTemplate?: { _id: string } })?.levelTemplate
      toast("Plan créé", "success")
      setCreateOpen(false)
      setNewName("")
      setNewDescription("")
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
      toast(e.response?.data?.message || e.message || "Erreur lors de la création", "error")
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
              à l'abonnement.
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
                  Plans d'entraînement masculins
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
                  Plans d'entraînement féminins
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

<Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau plan</DialogTitle>
            <DialogDescription>
              {selectedFolder
                ? `Nouveau plan pour ${selectedFolder === "male" ? "hommes" : selectedFolder === "female" ? "femmes" : "genre non classé"}. Ajoutez les séances sur les 5 semaines.`
                : "Nom et genre (homme / femme) identifient le plan côté serveur. Vous pourrez ensuite remplir les 5 semaines."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nom du plan</Label>
              <Input
                id="plan-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex. Fighter printemps"
                autoFocus
              />
            </div>
            {selectedFolder === "unclassified" ? (
              <div className="space-y-2">
                <Label>Genre</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newGender === "M" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewGender("M")}
                    disabled={creating}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Homme
                  </Button>
                  <Button
                    type="button"
                    variant={newGender === "F" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewGender("F")}
                    disabled={creating}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Femme
                  </Button>
                </div>
              </div>
            ) : selectedFolder ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                {selectedFolder === "male" ? (
                  <>
                    <User className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Plan masculin</span>
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 text-pink-600" />
                    <span className="text-sm font-medium">Plan féminin</span>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Genre</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newGender === "M" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewGender("M")}
                    disabled={creating}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Homme
                  </Button>
                  <Button
                    type="button"
                    variant={newGender === "F" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewGender("F")}
                    disabled={creating}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Femme
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="plan-desc">Description (optionnel)</Label>
              <Input
                id="plan-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Courte note pour l'équipe"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création…
                </>
              ) : (
                "Créer et ouvrir le planning"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
