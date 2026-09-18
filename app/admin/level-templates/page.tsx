"use client"

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { ConfirmModal } from "@/components/shared/ConfirmModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { PageLoader } from "@/components/ui/loading"
import {
  AdminFormErrorSummary,
  AdminFormSection,
  AdminModal,
  AdminModalFooter,
  type AdminFormError,
} from "@/components/admin"
import {
  CalendarDays,
  ChevronRight,
  Folder,
  FolderPlus,
  Loader2,
  Plus,
  Search,
  Trash2,
  Dumbbell,
  Clock,
  Pencil,
  FolderOpen,
  Filter,
  MoveRight,
} from "lucide-react"

const PLAN_LEVELS = [
  { value: "INITIATE", label: "Initiate", description: "Découverte et bases" },
  { value: "FIGHTER", label: "Fighter", description: "Rythme régulier" },
  { value: "WARRIOR", label: "Warrior", description: "Progression soutenue" },
  { value: "CHAMPION", label: "Champion", description: "Performance avancée" },
  { value: "ELITE", label: "Elite", description: "Exigence maximale" },
] as const

const LEVEL_BADGE_COLORS: Record<string, string> = {
  INITIATE: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  FIGHTER: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  WARRIOR: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  CHAMPION: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  ELITE: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
}

type LevelTemplateRow = {
  _id: string
  name?: string
  clientDisplayName?: string
  description?: string
  gender?: string
  objective?: string
  level?: string
  durationWeeks?: number
  isActive?: boolean
  folderId?: any
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

export default function LevelTemplatesPage() {
  const { toast } = useToast()

  const [list, setList] = useState<LevelTemplateRow[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState<"all" | "M" | "F">("all")
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all")

  // ─── Modal State: Create / Edit Plan ───
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  const [formGender, setFormGender] = useState<"M" | "F">("M")
  const [formLevel, setFormLevel] = useState<"INITIATE" | "FIGHTER" | "WARRIOR" | "CHAMPION" | "ELITE">("INITIATE")
  const [formFolderId, setFormFolderId] = useState<string>("")
  const [formName, setFormName] = useState("")
  const [formClientDisplayName, setFormClientDisplayName] = useState("")
  const [formDurationWeeks, setFormDurationWeeks] = useState(5)
  const [formDescription, setFormDescription] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)
  const [formErrors, setFormErrors] = useState<AdminFormError[]>([])
  const planNameRef = useRef<HTMLInputElement>(null)

  // ─── Move Plan Modal ───
  const [moveTargetPlan, setMoveTargetPlan] = useState<LevelTemplateRow | null>(null)
  const [moveToFolderId, setMoveToFolderId] = useState<string>("")
  const [moveSaving, setMoveSaving] = useState(false)

  // ─── Folder Modal: Create / Rename ───
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderModalMode, setFolderModalMode] = useState<"create" | "edit">("create")
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState("")
  const [folderDescription, setFolderDescription] = useState("")
  const [folderSaving, setFolderSaving] = useState(false)

  // ─── Safe Delete Folder ───
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<any | null>(null)
  const [deleteFolderLoading, setDeleteFolderLoading] = useState(false)

  // ─── Delete Plan Modal ───
  const [deleteTarget, setDeleteTarget] = useState<LevelTemplateRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ─── Load Folders ───
  const loadFolders = useCallback(async () => {
    try {
      const res = await api.getFolders("plan")
      setFolders(res.folders || [])
    } catch {
      // ignore
    }
  }, [])

  // ─── Load all templates ───
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getLevelTemplates({ limit: 200 })
      setList((data.levelTemplates || []) as LevelTemplateRow[])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur de chargement des programmes", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadFolders()
    void load()
  }, [loadFolders, load])

  // ─── Filtered Program List ───
  const filteredList = useMemo(() => {
    return list.filter((plan) => {
      // Folder filter
      const planFid = typeof plan.folderId === "object" ? plan.folderId?._id : plan.folderId
      if (selectedFolderId === "unassigned") {
        if (planFid) return false
      } else if (selectedFolderId !== "all") {
        if (planFid !== selectedFolderId) return false
      }

      // Gender filter
      if (genderFilter !== "all" && plan.gender !== genderFilter) {
        return false
      }

      // Level filter
      if (levelFilter !== "all" && (plan.level || "").toUpperCase() !== levelFilter) {
        return false
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = (plan.name || "").toLowerCase().includes(q)
        const matchDisplay = (plan.clientDisplayName || "").toLowerCase().includes(q)
        const matchDesc = (plan.description || "").toLowerCase().includes(q)
        if (!matchName && !matchDisplay && !matchDesc) return false
      }

      return true
    })
  }, [list, selectedFolderId, genderFilter, levelFilter, search])

  // ─── Folder Handlers ───
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
          type: "plan",
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
      toast(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement", "error")
    } finally {
      setFolderSaving(false)
    }
  }

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return
    setDeleteFolderLoading(true)
    try {
      await api.deleteFolder(deleteFolderTarget._id)
      toast("Dossier supprimé. Les programmes deviennent « Non classés ».", "success")
      setDeleteFolderTarget(null)
      if (selectedFolderId === deleteFolderTarget._id) {
        setSelectedFolderId("all")
      }
      loadFolders()
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur de suppression", "error")
    } finally {
      setDeleteFolderLoading(false)
    }
  }

  // ─── Open Create Plan Modal ───
  const handleOpenCreatePlan = () => {
    setModalMode("create")
    setEditingId(null)
    setFormGender(genderFilter !== "all" ? genderFilter : "M")
    setFormLevel(levelFilter !== "all" ? (levelFilter as any) : "INITIATE")
    setFormFolderId(selectedFolderId !== "all" && selectedFolderId !== "unassigned" ? selectedFolderId : "")
    setFormName("")
    setFormClientDisplayName("")
    setFormDurationWeeks(5)
    setFormDescription("")
    setFormIsActive(true)
    setFormErrors([])
    setModalOpen(true)
  }

  // ─── Open Edit Plan Modal ───
  const handleOpenEditPlan = (plan: LevelTemplateRow) => {
    setModalMode("edit")
    setEditingId(plan._id)
    setFormGender((plan.gender as "M" | "F") || "M")
    setFormLevel((plan.level?.toUpperCase() as any) || "INITIATE")
    const planFid = typeof plan.folderId === "object" ? plan.folderId?._id : plan.folderId
    setFormFolderId(planFid || "")
    setFormName(plan.name || "")
    setFormClientDisplayName(plan.clientDisplayName || plan.name || "")
    setFormDurationWeeks(plan.durationWeeks || plan.weeks?.length || 5)
    setFormDescription(plan.description || "")
    setFormIsActive(plan.isActive !== false)
    setFormErrors([])
    setModalOpen(true)
  }

  // ─── Save Plan ───
  const handleSavePlan = async () => {
    const errors: AdminFormError[] = []
    if (!formName.trim()) {
      errors.push({ field: "formName", message: "Le nom interne du programme est requis." })
    }
    if (errors.length > 0) {
      setFormErrors(errors)
      planNameRef.current?.focus()
      return
    }

    setFormSaving(true)
    try {
      if (modalMode === "create") {
        await api.createLevelTemplate({
          name: formName.trim(),
          clientDisplayName: formClientDisplayName.trim() || formName.trim(),
          gender: formGender,
          level: formLevel,
          folderId: formFolderId || null,
          durationWeeks: formDurationWeeks,
          description: formDescription.trim() || undefined,
          isActive: formIsActive,
        })
        toast("Programme créé ✓", "success")
      } else if (editingId) {
        await api.updateLevelTemplate(editingId, {
          name: formName.trim(),
          clientDisplayName: formClientDisplayName.trim() || formName.trim(),
          gender: formGender,
          level: formLevel,
          folderId: formFolderId || null,
          durationWeeks: formDurationWeeks,
          description: formDescription.trim() || undefined,
          isActive: formIsActive,
        })
        toast("Programme mis à jour ✓", "success")
      }
      setModalOpen(false)
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur lors de l'enregistrement", "error")
    } finally {
      setFormSaving(false)
    }
  }

  // ─── Move Plan Quick Action ───
  const handleOpenMoveModal = (plan: LevelTemplateRow) => {
    setMoveTargetPlan(plan)
    const planFid = typeof plan.folderId === "object" ? plan.folderId?._id : plan.folderId
    setMoveToFolderId(planFid || "")
  }

  const handleSaveMove = async () => {
    if (!moveTargetPlan) return
    setMoveSaving(true)
    try {
      await api.updateLevelTemplate(moveTargetPlan._id, {
        folderId: moveToFolderId || null,
      })
      toast("Programme déplacé avec succès ✓", "success")
      setMoveTargetPlan(null)
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors du déplacement", "error")
    } finally {
      setMoveSaving(false)
    }
  }

  // ─── Delete Plan ───
  const handleDeletePlan = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.deleteLevelTemplate(deleteTarget._id)
      toast("Programme supprimé", "success")
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Suppression impossible", "error")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Programmes d'entraînement
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
              {list.length} au total
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gérez vos programmes par dossiers personnalisés, configurez les semaines et assignez vos athlètes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenCreateFolder} className="gap-2 text-xs">
            <FolderPlus className="h-4 w-4" />
            Nouveau dossier
          </Button>
          <Button onClick={handleOpenCreatePlan} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            Nouveau programme
          </Button>
        </div>
      </div>

      {/* ── Folders Filter Bar ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedFolderId("all")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border",
            selectedFolderId === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <Folder className="h-3.5 w-3.5" />
          Tous les programmes ({list.length})
        </button>

        {folders.map((f) => {
          const count = list.filter((p) => {
            const pid = typeof p.folderId === "object" ? p.folderId?._id : p.folderId
            return pid === f._id
          }).length

          return (
            <div
              key={f._id}
              onClick={() => setSelectedFolderId(f._id)}
              className={cn(
                "group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer",
                selectedFolderId === f._id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>{f.name}</span>
              <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", selectedFolderId === f._id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                {count}
              </span>
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
          )
        })}

        <button
          onClick={() => setSelectedFolderId("unassigned")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border",
            selectedFolderId === "unassigned"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          <Folder className="h-3.5 w-3.5 opacity-60" />
          Non classés (
          {list.filter((p) => !(typeof p.folderId === "object" ? p.folderId?._id : p.folderId)).length}
          )
        </button>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        {/* Gender and Level Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {/* Gender */}
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50 shrink-0">
            <button
              onClick={() => setGenderFilter("all")}
              className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors", genderFilter === "all" ? "bg-card font-bold text-foreground shadow-xs" : "text-muted-foreground")}
            >
              Tous
            </button>
            <button
              onClick={() => setGenderFilter("M")}
              className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors", genderFilter === "M" ? "bg-card font-bold text-foreground shadow-xs" : "text-muted-foreground")}
            >
              Hommes
            </button>
            <button
              onClick={() => setGenderFilter("F")}
              className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors", genderFilter === "F" ? "bg-card font-bold text-foreground shadow-xs" : "text-muted-foreground")}
            >
              Femmes
            </button>
          </div>

          <div className="h-4 w-px bg-border/60 shrink-0" />

          {/* Level chips */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setLevelFilter("all")}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors", levelFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-muted")}
            >
              Tous niveaux
            </button>
            {PLAN_LEVELS.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => setLevelFilter(lvl.value)}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors", levelFilter === lvl.value ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-muted")}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un programme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/40"
          />
        </div>
      </div>

      {/* ── Content Grid ── */}
      {loading && list.length === 0 ? (
        <PageLoader />
      ) : filteredList.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-card">
          <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h4 className="font-bold text-base text-foreground">Aucun programme trouvé</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            {search.trim() || levelFilter !== "all" || genderFilter !== "all"
              ? "Aucun programme ne correspond à ces critères."
              : "Créez votre premier programme dans ce dossier."}
          </p>
          <Button size="sm" onClick={handleOpenCreatePlan} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> Créer un programme
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((plan) => {
            const sessionCount = countSessions(plan)
            const levelKey = (plan.level || "INITIATE").toUpperCase()
            const badgeClass = LEVEL_BADGE_COLORS[levelKey] || "bg-muted text-muted-foreground border-border"
            const duration = plan.durationWeeks || plan.weeks?.length || 5

            const folderObj = folders.find((f) => f._id === (typeof plan.folderId === "object" ? plan.folderId?._id : plan.folderId))

            return (
              <div
                key={plan._id}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider", badgeClass)}>
                        {plan.level ? plan.level.charAt(0).toUpperCase() + plan.level.slice(1).toLowerCase() : "Initiate"}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        {plan.gender === "F" ? "Femme" : "Homme"}
                      </span>
                      {folderObj && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border flex items-center gap-1">
                          <Folder className="h-2.5 w-2.5 text-primary" />
                          {folderObj.name}
                        </span>
                      )}
                    </div>
                    <Badge variant={plan.isActive !== false ? "default" : "secondary"} className="text-[10px]">
                      {plan.isActive !== false ? "Actif" : "Inactif"}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-foreground truncate mt-1">
                    {plan.name}
                  </h3>
                  {plan.clientDisplayName && plan.clientDisplayName !== plan.name && (
                    <p className="text-xs text-muted-foreground truncate">
                      Affiché client : {plan.clientDisplayName}
                    </p>
                  )}

                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {plan.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/50 text-xs">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Durée</span>
                      <span className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" /> {duration} semaines
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Volume</span>
                      <span className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                        <Dumbbell className="h-3 w-3 text-muted-foreground" /> {sessionCount} séances
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-border/50">
                  <Link href={`/admin/level-templates/${plan._id}`} className="flex-1">
                    <Button size="sm" className="w-full text-xs font-semibold gap-1.5 h-8">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Planning & Séances
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenMoveModal(plan)}
                    title="Déplacer vers un dossier"
                  >
                    <MoveRight className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5"
                    onClick={() => handleOpenEditPlan(plan)}
                    title="Modifier le programme"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(plan)}
                    title="Supprimer le programme"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create / Edit Plan Modal ── */}
      <AdminModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalMode === "create" ? "Nouveau programme d'entraînement" : "Modifier le programme"}
        description="Renseignez les informations de base du programme."
        icon={<CalendarDays className="h-5 w-5 text-primary" />}
        size="lg"
        busy={formSaving}
        footer={(close) => (
          <AdminModalFooter
            submitLabel={modalMode === "create" ? "Créer le programme" : "Enregistrer"}
            loadingLabel="Enregistrement…"
            loading={formSaving}
            onCancel={close}
            onSubmit={handleSavePlan}
          />
        )}
      >
        <div className="space-y-4 py-2">
          {formErrors.length > 0 && (
            <AdminFormErrorSummary errors={formErrors} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-folder" className="text-xs">Dossier de classement</Label>
              <select
                id="plan-folder"
                value={formFolderId}
                onChange={(e) => setFormFolderId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">📁 Sans dossier (Racine)</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>📁 {f.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-gender" className="text-xs">Genre cible</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormGender("M")}
                  className={cn("h-9 rounded-md text-xs font-semibold border transition-all", formGender === "M" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  Homme
                </button>
                <button
                  type="button"
                  onClick={() => setFormGender("F")}
                  className={cn("h-9 rounded-md text-xs font-semibold border transition-all", formGender === "F" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  Femme
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-level" className="text-xs">Niveau d'athlète</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {PLAN_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setFormLevel(lvl.value)}
                  className={cn(
                    "p-2 rounded-lg text-xs font-semibold border text-center transition-all",
                    formLevel === lvl.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name" className="text-xs">Nom interne (Staff) *</Label>
              <Input
                id="plan-name"
                ref={planNameRef}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: H_INI_MASS_V1"
                className="h-9 text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-display" className="text-xs">Nom affiché (Client App)</Label>
              <Input
                id="plan-display"
                value={formClientDisplayName}
                onChange={(e) => setFormClientDisplayName(e.target.value)}
                placeholder="Ex: Prise de masse — Niveau 1"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-dur" className="text-xs">Durée (semaines)</Label>
              <Input
                id="plan-dur"
                type="number"
                min={1}
                max={52}
                value={formDurationWeeks}
                onChange={(e) => setFormDurationWeeks(Number(e.target.value) || 5)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-active" className="text-xs">Statut</Label>
              <select
                id="plan-active"
                value={formIsActive ? "1" : "0"}
                onChange={(e) => setFormIsActive(e.target.value === "1")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="1">Actif (disponible aux athlètes)</option>
                <option value="0">Inactif (archivé)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-desc" className="text-xs">Description (facultatif)</Label>
            <Textarea
              id="plan-desc"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Objectif et consignes globales du programme..."
              className="text-xs"
            />
          </div>
        </div>
      </AdminModal>

      {/* ── Quick Move Modal ── */}
      <AdminModal
        open={!!moveTargetPlan}
        onOpenChange={(open) => { if (!open) setMoveTargetPlan(null) }}
        title="Déplacer le programme"
        description={`Choisissez le dossier de destination pour « ${moveTargetPlan?.name} ».`}
        icon={<MoveRight className="h-5 w-5 text-primary" />}
        size="sm"
        busy={moveSaving}
        footer={(close) => (
          <AdminModalFooter
            submitLabel="Déplacer"
            loadingLabel="Déplacement…"
            loading={moveSaving}
            onCancel={close}
            onSubmit={handleSaveMove}
          />
        )}
      >
        <div className="space-y-3 py-2">
          <Label htmlFor="move-folder-select" className="text-xs">Dossier de destination</Label>
          <select
            id="move-folder-select"
            value={moveToFolderId}
            onChange={(e) => setMoveToFolderId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">📁 Sans dossier (Racine / Non classé)</option>
            {folders.map((f) => (
              <option key={f._id} value={f._id}>📁 {f.name}</option>
            ))}
          </select>
        </div>
      </AdminModal>

      {/* ── Folder Modal: Create / Rename ── */}
      <AdminModal
        open={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        title={folderModalMode === "create" ? "Nouveau dossier de programmes" : "Renommer le dossier"}
        description="Organisez vos programmes d'entraînement en dossiers thématiques."
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
            <Label htmlFor="plan-folder-name" className="text-xs">Nom du dossier *</Label>
            <Input
              id="plan-folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ex: Hypertrophie 2026, Débutants A, VIP..."
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-folder-desc" className="text-xs">Description (facultatif)</Label>
            <Input
              id="plan-folder-desc"
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
        description={deleteFolderTarget ? `Le dossier « ${deleteFolderTarget.name} » sera supprimé. Les programmes qu'il contient ne seront PAS supprimés ; ils deviendront simplement « Non classés » (sans dossier).` : undefined}
        confirmLabel="Supprimer le dossier"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleteFolderLoading}
        onConfirm={handleDeleteFolder}
      />

      {/* ── Delete Plan Confirm Modal ── */}
      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Supprimer le programme ?"
        description={deleteTarget ? `Le programme « ${deleteTarget.name} » sera définitivement supprimé.` : undefined}
        confirmLabel="Supprimer le programme"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeletePlan}
      />
    </div>
  )
}
