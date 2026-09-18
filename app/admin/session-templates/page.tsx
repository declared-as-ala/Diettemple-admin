"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import {
  Plus, Search, Edit2, Trash2, Clock, Dumbbell, ChevronRight, LayoutGrid, Filter,
  Copy, Folder, FolderPlus, Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmModal } from "@/components/shared/ConfirmModal"
import { AdminModal, AdminModalFooter } from "@/components/admin"

const PAGE_SIZE = 50

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: "Débutant",       color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  intermediate: { label: "Intermédiaire",  color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/30" },
  advanced:     { label: "Avancé",         color: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/30" },
}

export default function SessionTemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderModalMode, setFolderModalMode] = useState<"create" | "edit">("create")
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState("")
  const [folderDescription, setFolderDescription] = useState("")
  const [folderSaving, setFolderSaving] = useState(false)
  
  // Safe delete folder state
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<any | null>(null)
  const [deleteFolderLoading, setDeleteFolderLoading] = useState(false)

  const loadFolders = useCallback(async () => {
    try {
      const data = await api.getFolders("session")
      setFolders(data.folders || [])
    } catch {
      // ignore
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSessionTemplates({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        difficulty: difficulty || undefined,
        folderId: selectedFolder === "all" || selectedFolder === "unassigned" ? undefined : selectedFolder,
      })
      setTemplates(data.sessionTemplates || [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur de chargement", "error")
    } finally {
      setLoading(false)
    }
  }, [page, search, difficulty, selectedFolder, toast])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  useEffect(() => {
    load()
  }, [load])

  // Filter templates locally if "unassigned" is selected
  const displayedTemplates = useMemo(() => {
    if (selectedFolder === "unassigned") {
      return templates.filter((t) => !t.folderId)
    }
    return templates
  }, [templates, selectedFolder])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await api.deleteSessionTemplate(id)
      toast("Séance supprimée", "success")
      setDeleteId(null)
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de la suppression", "error")
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id)
    try {
      await api.duplicateSessionTemplate(id)
      toast("Séance dupliquée avec succès ✓", "success")
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de la duplication", "error")
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleOpenCreateFolder = () => {
    setFolderModalMode("create")
    setEditingFolderId(null)
    setFolderName("")
    setFolderDescription("")
    setFolderModalOpen(true)
  }

  const handleOpenEditFolder = (f: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setFolderModalMode("edit")
    setEditingFolderId(f._id)
    setFolderName(f.name)
    setFolderDescription(f.description || "")
    setFolderModalOpen(true)
  }

  const handleSaveFolder = async () => {
    if (!folderName.trim()) {
      toast("Veuillez saisir un nom de dossier", "error")
      return
    }
    setFolderSaving(true)
    try {
      if (folderModalMode === "create") {
        await api.createFolder({
          name: folderName.trim(),
          type: "session",
          description: folderDescription.trim() || undefined,
        })
        toast("Dossier créé ✓", "success")
      } else if (editingFolderId) {
        await api.updateFolder(editingFolderId, {
          name: folderName.trim(),
          description: folderDescription.trim() || undefined,
        })
        toast("Dossier renommé ✓", "success")
      }
      setFolderModalOpen(false)
      loadFolders()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur d'enregistrement", "error")
    } finally {
      setFolderSaving(false)
    }
  }

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return
    setDeleteFolderLoading(true)
    try {
      await api.deleteFolder(deleteFolderTarget._id)
      toast("Dossier supprimé. Les séances restent disponibles dans « Non classées ».", "success")
      setDeleteFolderTarget(null)
      if (selectedFolder === deleteFolderTarget._id) {
        setSelectedFolder("all")
      }
      loadFolders()
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur de suppression", "error")
    } finally {
      setDeleteFolderLoading(false)
    }
  }

  if (loading && templates.length === 0) return <PageLoader />

  const pages = Math.ceil(total / PAGE_SIZE)
  const deleteTarget = templates.find((t) => t._id === deleteId)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Séances d'entraînement</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} séance{total !== 1 ? "s" : ""} au catalogue · Organisez par dossier, dupliquez et personnalisez.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenCreateFolder} className="gap-2">
            <FolderPlus className="h-4 w-4" />
            Nouveau dossier
          </Button>
          <Link href="/admin/session-templates/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle séance
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Folders Filter Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => { setSelectedFolder("all"); setPage(1) }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border",
            selectedFolder === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <Folder className="h-3.5 w-3.5" />
          Toutes les séances ({total})
        </button>

        {folders.map((f) => (
          <div
            key={f._id}
            onClick={() => { setSelectedFolder(f._id); setPage(1) }}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer",
              selectedFolder === f._id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Folder className="h-3.5 w-3.5" />
            <span>{f.name}</span>
            <button
              onClick={(e) => handleOpenEditFolder(f, e)}
              className="ml-1 opacity-0 group-hover:opacity-100 p-0.5 hover:text-foreground transition-opacity"
              title="Renommer le dossier"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDeleteFolderTarget(f)
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
              title="Supprimer le dossier"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        <button
          onClick={() => { setSelectedFolder("unassigned"); setPage(1) }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border",
            selectedFolder === "unassigned"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <Folder className="h-3.5 w-3.5 opacity-60" />
          Sans dossier
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre interne ou affiché…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {["", "beginner", "intermediate", "advanced"].map((d) => {
            const cfg = d ? DIFFICULTY_CONFIG[d] : null
            return (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setPage(1) }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  difficulty === d
                    ? cfg ? `${cfg.bg} ${cfg.color} border-current` : "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {cfg?.label ?? "Tous"}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {displayedTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border border-dashed border-border text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-foreground">Aucune séance trouvée</p>
            <p className="text-sm text-muted-foreground mt-1">Créez votre première séance d'entraînement dans cette vue</p>
          </div>
          <Link href="/admin/session-templates/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Créer une séance
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayedTemplates.map((t) => {
            const diff = t.difficulty ? DIFFICULTY_CONFIG[t.difficulty] : null
            const exerciseCount = t.items?.length ?? 0
            const muscleGroups: string[] = [...new Set(
              (t.items || []).map((i: any) => i.exerciseId?.muscleGroup).filter(Boolean)
            )].slice(0, 3) as string[]

            const folderObj = folders.find((f) => f._id === (typeof t.folderId === "object" ? t.folderId?._id : t.folderId))

            return (
              <div
                key={t._id}
                className="group relative flex flex-col rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
              >
                {/* Accent bar */}
                <div className={cn(
                  "h-1 w-full",
                  t.difficulty === "advanced" ? "bg-rose-500" :
                  t.difficulty === "intermediate" ? "bg-amber-500" :
                  t.difficulty === "beginner" ? "bg-emerald-500" : "bg-border"
                )} />

                <div className="flex flex-col flex-1 p-5 gap-3">
                  {/* Folder + Difficulty row */}
                  <div className="flex items-center justify-between gap-2">
                    {folderObj ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border flex items-center gap-1">
                        <Folder className="h-2.5 w-2.5" />
                        {folderObj.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 italic">Sans dossier</span>
                    )}

                    {diff && (
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0", diff.bg, diff.color)}>
                        {diff.label}
                      </span>
                    )}
                  </div>

                  {/* Title (displayName) + InternalName */}
                  <div>
                    <h3 className="font-bold text-foreground leading-tight line-clamp-2 text-base">
                      {t.displayName || t.title}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                      Interne : {t.internalName || t.title}
                    </p>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5" />
                      {exerciseCount} exercice{exerciseCount !== 1 ? "s" : ""}
                    </span>
                    {t.durationMinutes != null && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {t.durationMinutes} min
                      </span>
                    )}
                  </div>

                  {/* Muscle groups */}
                  {muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {muscleGroups.map((mg) => (
                        <span key={mg} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          {mg}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/50">
                    <Link href={`/admin/session-templates/${t._id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold group-hover:border-primary/40 group-hover:text-primary transition-colors h-8">
                        <Edit2 className="h-3.5 w-3.5" />
                        Modifier
                        <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => handleDuplicate(t._id)}
                      disabled={duplicatingId === t._id}
                      title="Dupliquer la séance"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(t._id)}
                      title="Supprimer la séance"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground px-3">Page {page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}

      {/* ── Folder Modal ── */}
      <AdminModal
        open={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        title={folderModalMode === "create" ? "Nouveau dossier de séances" : "Renommer le dossier"}
        description="Organisez vos séances d'entraînement en dossiers thématiques."
        icon={<FolderPlus className="h-5 w-5 text-primary" />}
        size="sm"
        busy={folderSaving}
        footer={(close) => (
          <AdminModalFooter
            submitLabel={folderModalMode === "create" ? "Créer le dossier" : "Enregistrer"}
            loadingLabel="Enregistrement…"
            loading={folderSaving}
            onCancel={close}
            onSubmit={handleSaveFolder}
          />
        )}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name" className="text-xs">Nom du dossier *</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ex: Initiate Homme, Full Body, Vacances..."
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="folder-desc" className="text-xs">Description (facultatif)</Label>
            <Input
              id="folder-desc"
              value={folderDescription}
              onChange={(e) => setFolderDescription(e.target.value)}
              placeholder="Description ou notes internes..."
              className="h-9 text-sm"
            />
          </div>
        </div>
      </AdminModal>

      {/* ── Delete Folder Confirm Modal ── */}
      <ConfirmModal
        open={!!deleteFolderTarget}
        onOpenChange={(open) => { if (!open) setDeleteFolderTarget(null) }}
        title="Supprimer ce dossier ?"
        description={deleteFolderTarget ? `Le dossier « ${deleteFolderTarget.name} » sera supprimé. Les séances d'entraînement qu'il contient ne seront PAS supprimées ; elles deviendront simplement « Sans dossier » (non classées).` : undefined}
        confirmLabel="Supprimer le dossier"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleteFolderLoading}
        onConfirm={handleDeleteFolder}
      />

      {/* ── Delete Session Confirm Modal ── */}
      <ConfirmModal
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Supprimer la séance ?"
        description={deleteTarget ? `La séance « ${deleteTarget.displayName || deleteTarget.title} » sera définitivement supprimée.` : undefined}
        confirmLabel="Supprimer la séance"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleting}
        onConfirm={() => (deleteId ? handleDelete(deleteId) : Promise.resolve())}
      />
    </div>
  )
}
