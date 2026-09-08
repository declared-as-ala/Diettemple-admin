"use client"

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
  CalendarDays,
  ChevronRight,
  Folder,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  Dumbbell,
  Clock,
  Pencil,
  CheckCircle2,
  FolderOpen,
  Sparkles,
} from "lucide-react"
import {
  PLAN_OBJECTIVES,
  UNCLASSIFIED_OBJECTIVE,
  getObjectiveDef,
  normalizeObjectiveKey,
  type PlanObjectiveDef,
} from "@/lib/planObjectives"
import { normalizeLevelName } from "@/lib/levelAssets"

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

function LevelTemplatesContent() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentGender = searchParams?.get("gender") || null
  const currentObjective = searchParams?.get("objective") || null

  const [list, setList] = useState<LevelTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")

  // ─── Modal State: Create / Edit ───
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  const [formGender, setFormGender] = useState<"M" | "F">("M")
  const [formObjective, setFormObjective] = useState<string>("mass_gain")
  const [formLevel, setFormLevel] = useState<'INITIATE' | 'FIGHTER' | 'WARRIOR' | 'CHAMPION' | 'ELITE'>('INITIATE')
  const [formName, setFormName] = useState("")
  const [formClientDisplayName, setFormClientDisplayName] = useState("")
  const [formDurationWeeks, setFormDurationWeeks] = useState(5)
  const [formDescription, setFormDescription] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)
  const [formErrors, setFormErrors] = useState<AdminFormError[]>([])
  const planNameRef = useRef<HTMLInputElement>(null)

  // ─── Delete modal state ───
  const [deleteTarget, setDeleteTarget] = useState<LevelTemplateRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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
    void load()
  }, [load])

  // ─── Navigation helpers ───
  const setNav = (gender: string | null, objective: string | null = null) => {
    const p = new URLSearchParams()
    if (gender) p.set("gender", gender)
    if (objective) p.set("objective", objective)
    const qs = p.toString()
    router.push(qs ? `/admin/level-templates?${qs}` : "/admin/level-templates")
    setSearch("")
    setLevelFilter("all")
  }

  // ─── Derived counts ───
  const stats = useMemo(() => {
    const malePlans = list.filter((t) => (t.gender || "M") === "M")
    const femalePlans = list.filter((t) => t.gender === "F")

    const maleObjectivesSet = new Set(malePlans.map((p) => normalizeObjectiveKey(p.objective)))
    const femaleObjectivesSet = new Set(femalePlans.map((p) => normalizeObjectiveKey(p.objective)))

    return {
      totalPlans: list.length,
      totalSessions: list.reduce((sum, t) => sum + countSessions(t), 0),
      male: {
        plansCount: malePlans.length,
        sessionsCount: malePlans.reduce((sum, t) => sum + countSessions(t), 0),
        objectivesCount: maleObjectivesSet.size || PLAN_OBJECTIVES.length,
      },
      female: {
        plansCount: femalePlans.length,
        sessionsCount: femalePlans.reduce((sum, t) => sum + countSessions(t), 0),
        objectivesCount: femaleObjectivesSet.size || PLAN_OBJECTIVES.length,
      },
    }
  }, [list])

  // ─── Objective cards in Screen 2 ───
  const objectiveFolders = useMemo(() => {
    if (!currentGender) return []
    const genderPlans = list.filter((t) => (t.gender || "M") === currentGender)

    const listByObj: Array<{
      objective: PlanObjectiveDef
      plansCount: number
      sessionsCount: number
    }> = []

    PLAN_OBJECTIVES.forEach((objDef) => {
      const matched = genderPlans.filter((p) => normalizeObjectiveKey(p.objective) === objDef.key)
      listByObj.push({
        objective: objDef,
        plansCount: matched.length,
        sessionsCount: matched.reduce((s, p) => s + countSessions(p), 0),
      })
    })

    // Check if there are unclassified plans
    const unclassified = genderPlans.filter((p) => !p.objective || normalizeObjectiveKey(p.objective) === "unclassified")
    if (unclassified.length > 0) {
      listByObj.push({
        objective: UNCLASSIFIED_OBJECTIVE,
        plansCount: unclassified.length,
        sessionsCount: unclassified.reduce((s, p) => s + countSessions(p), 0),
      })
    }

    return listByObj
  }, [list, currentGender])

  // ─── Filtered programs for Screen 3 ───
  const currentProgramList = useMemo(() => {
    if (!currentGender || !currentObjective) return []

    return list
      .filter((t) => (t.gender || "M") === currentGender)
      .filter((t) => {
        const key = normalizeObjectiveKey(t.objective)
        return key === currentObjective
      })
      .filter((t) => {
        if (levelFilter === "all") return true
        return (t.level || "").toUpperCase() === levelFilter
      })
      .filter((t) => {
        if (!search.trim()) return true
        const q = search.toLowerCase().trim()
        return (
          (t.name || "").toLowerCase().includes(q) ||
          (t.clientDisplayName || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"))
  }, [list, currentGender, currentObjective, levelFilter, search])

  // ─── Open Create Modal ───
  const handleOpenCreate = () => {
    setModalMode("create")
    setEditingId(null)
    setFormGender(currentGender === "F" ? "F" : "M")
    setFormObjective(currentObjective || "mass_gain")
    setFormLevel("INITIATE")
    setFormName("")
    setFormClientDisplayName("")
    setFormDurationWeeks(5)
    setFormDescription("")
    setFormIsActive(true)
    setFormErrors([])
    setModalOpen(true)
  }

  // ─── Open Edit Modal ───
  const handleOpenEdit = (plan: LevelTemplateRow) => {
    setModalMode("edit")
    setEditingId(plan._id)
    setFormGender((plan.gender as "M" | "F") || "M")
    setFormObjective(plan.objective || "mass_gain")
    setFormLevel((plan.level?.toUpperCase() as any) || "INITIATE")
    setFormName(plan.name || "")
    setFormClientDisplayName(plan.clientDisplayName || plan.name || "")
    setFormDurationWeeks(plan.durationWeeks || plan.weeks?.length || 5)
    setFormDescription(plan.description || "")
    setFormIsActive(plan.isActive !== false)
    setFormErrors([])
    setModalOpen(true)
  }

  // ─── Save Plan (Create or Update) ───
  const handleSavePlan = async () => {
    const errors: AdminFormError[] = []
    if (!formName.trim()) {
      errors.push({ field: "formName", message: "Le nom interne du programme est requis." })
    }
    if (formErrors.length > 0) setFormErrors([])

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
          objective: formObjective,
          level: formLevel,
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
          objective: formObjective,
          level: formLevel,
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

  // Active objective definition
  const activeObjDef = useMemo(() => {
    return getObjectiveDef(currentObjective)
  }, [currentObjective])

  return (
    <div className="space-y-6 pb-12">
      {/* ── BREADCRUMBS & TOP BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          {/* Clickable Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 flex-wrap font-medium">
            <button
              onClick={() => setNav(null)}
              className={cn(
                "hover:text-foreground transition-colors",
                !currentGender && "font-bold text-foreground"
              )}
            >
              Programmes d'entraînement
            </button>
            {currentGender && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <button
                  onClick={() => setNav(currentGender)}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    currentGender && !currentObjective && "font-bold text-foreground"
                  )}
                >
                  {currentGender === "M" ? "Hommes" : "Femmes"}
                </button>
              </>
            )}
            {currentGender && currentObjective && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="font-bold text-foreground">
                  {activeObjDef.label}
                </span>
              </>
            )}
          </nav>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {!currentGender
              ? "Programmes d'entraînement"
              : !currentObjective
                ? `Programmes ${currentGender === "M" ? "Hommes" : "Femmes"}`
                : `${activeObjDef.label} — ${currentGender === "M" ? "Hommes" : "Femmes"}`}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {!currentGender
              ? "Structurez et organisez vos cycles par sexe, objectif et niveau."
              : !currentObjective
                ? "Sélectionnez un dossier d'objectif pour consulter ou ajouter des programmes."
                : `${currentProgramList.length} programme(s) configuré(s) pour cet objectif.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentGender && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs"
              onClick={() => {
                if (currentObjective) setNav(currentGender)
                else setNav(null)
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 h-9 text-xs font-semibold"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" />
            Nouveau programme
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-medium">Chargement des programmes...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              SCREEN 1 — SEX FOLDERS (Root)
             ══════════════════════════════════════════════════════════════════ */}
          {!currentGender && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
              {/* Hommes Card */}
              <div
                onClick={() => setNav("M")}
                className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <User className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-blue-500 transition-colors">
                    Dossier Hommes
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Cycles d'entraînement et plannings optimisés pour les pratiquants masculins.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-border/60 text-center text-xs">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Objectifs</span>
                    <span className="text-base font-bold text-foreground mt-0.5 block">{stats.male.objectivesCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Programmes</span>
                    <span className="text-base font-bold text-foreground mt-0.5 block">{stats.male.plansCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Séances</span>
                    <span className="text-base font-bold text-foreground mt-0.5 block">{stats.male.sessionsCount}</span>
                  </div>
                </div>
              </div>

              {/* Femmes Card */}
              <div
                onClick={() => setNav("F")}
                className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/5 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-rose-500 transition-colors">
                    Dossier Femmes
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Cycles d'entraînement et plannings optimisés pour les pratiquantes féminines.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-border/60 text-center text-xs">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Objectifs</span>
                    <span className="text-base font-bold text-foreground mt-0.5 block">{stats.female.objectivesCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Programmes</span>
                    <span className="text-base font-bold text-foreground mt-0.5 block">{stats.female.plansCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Séances</span>
                    <span className="text-base font-bold text-foreground mt-0.5 block">{stats.female.sessionsCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCREEN 2 — OBJECTIVE FOLDERS
             ══════════════════════════════════════════════════════════════════ */}
          {currentGender && !currentObjective && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {objectiveFolders.map(({ objective, plansCount, sessionsCount }) => {
                  const Icon = objective.icon
                  return (
                    <div
                      key={objective.key}
                      onClick={() => setNav(currentGender, objective.key)}
                      className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", objective.color)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {objective.label}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {objective.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/50 text-xs text-muted-foreground font-medium">
                        <span>{plansCount} programme{plansCount > 1 ? "s" : ""}</span>
                        <span>{sessionsCount} séance{sessionsCount > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCREEN 3 — PROGRAM LIST
             ══════════════════════════════════════════════════════════════════ */}
          {currentGender && currentObjective && (
            <div className="space-y-4">
              {/* Level Filter Chips + Search Row */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
                {/* Level chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <button
                    onClick={() => setLevelFilter("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                      levelFilter === "all"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Tous
                  </button>
                  {PLAN_LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      onClick={() => setLevelFilter(lvl.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                        levelFilter === lvl.value
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>

                {/* Context Search */}
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

              {/* Program Cards Grid */}
              {currentProgramList.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card">
                  <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h4 className="font-bold text-base text-foreground">Aucun programme dans ce dossier</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                    {search.trim() || levelFilter !== "all"
                      ? "Aucun programme ne correspond à vos filtres de recherche."
                      : `Créez votre premier programme pour l'objectif « ${activeObjDef.label} » (${currentGender === "M" ? "Hommes" : "Femmes"}).`}
                  </p>
                  <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs">
                    <Plus className="h-4 w-4" /> Créer un programme
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentProgramList.map((plan) => {
                    const sessionCount = countSessions(plan)
                    const levelKey = (plan.level || "INITIATE").toUpperCase()
                    const badgeClass = LEVEL_BADGE_COLORS[levelKey] || "bg-muted text-muted-foreground border-border"
                    const duration = plan.durationWeeks || plan.weeks?.length || 5

                    return (
                      <div
                        key={plan._id}
                        className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all flex flex-col justify-between shadow-sm"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider", badgeClass)}>
                              {plan.level ? plan.level.charAt(0).toUpperCase() + plan.level.slice(1).toLowerCase() : "Initiate"}
                            </span>
                            <Badge variant={plan.isActive !== false ? "default" : "secondary"} className="text-[10px]">
                              {plan.isActive !== false ? "Actif" : "Inactif"}
                            </Badge>
                          </div>

                          <h3 className="text-base font-bold text-foreground truncate">
                            {plan.name}
                          </h3>
                          {plan.clientDisplayName && plan.clientDisplayName !== plan.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              Affiché : {plan.clientDisplayName}
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
                                <Clock className="h-3 w-3" /> {duration} semaines
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/40">
                              <span className="text-[10px] text-muted-foreground block">Volume</span>
                              <span className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                                <Dumbbell className="h-3 w-3" /> {sessionCount} séances
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
                            className="h-8 px-2.5"
                            onClick={() => handleOpenEdit(plan)}
                            title="Modifier les métadonnées du plan"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(plan)}
                            title="Supprimer le plan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CREATE / EDIT PLAN MODAL ── */}
      <AdminModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalMode === "create" ? "Créer un nouveau programme" : "Modifier le programme"}
        description="Renseignez le sexe, l'objectif, le niveau et la structure du cycle."
        icon={<Dumbbell className="h-5 w-5" />}
        size="lg"
        busy={formSaving}
        dirty
        footer={(close) => (
          <AdminModalFooter
            submitLabel={modalMode === "create" ? "Créer le programme" : "Enregistrer les modifications"}
            loadingLabel="Enregistrement…"
            loading={formSaving}
            onCancel={close}
            onSubmit={handleSavePlan}
          />
        )}
      >
        <div className="space-y-5">
          <AdminFormErrorSummary errors={formErrors} />

          {/* Classification Section */}
          <AdminFormSection title="Classification & Dossier" icon={<Folder className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Sexe */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-gender">Sexe</Label>
                <select
                  id="plan-gender"
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as "M" | "F")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="M">Hommes (M)</option>
                  <option value="F">Femmes (F)</option>
                </select>
              </div>

              {/* Objectif */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-objective">Objectif</Label>
                <select
                  id="plan-objective"
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PLAN_OBJECTIVES.map((obj) => (
                    <option key={obj.key} value={obj.key}>
                      {obj.label}
                    </option>
                  ))}
                  <option value="unclassified">Non classé</option>
                </select>
              </div>

              {/* Niveau */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-level">Niveau sportif</Label>
                <select
                  id="plan-level"
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value as any)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PLAN_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </AdminFormSection>

          {/* Identité du Plan */}
          <AdminFormSection title="Identité du programme" icon={<Sparkles className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-name">Nom interne</Label>
                <Input
                  id="plan-name"
                  ref={planNameRef}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Initiate_3_B"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-display-name">Nom affiché au client</Label>
                <Input
                  id="plan-display-name"
                  value={formClientDisplayName}
                  onChange={(e) => setFormClientDisplayName(e.target.value)}
                  placeholder="Ex: Initiate 3 B — Prise de masse"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-duration">Durée du cycle (semaines)</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={1}
                  max={52}
                  value={formDurationWeeks}
                  onChange={(e) => setFormDurationWeeks(parseInt(e.target.value, 10) || 5)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Programme actif (disponible pour affectation)
                </label>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="plan-desc">Description (optionnel)</Label>
                <Textarea
                  id="plan-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Détails du programme, focus musculaire, conseils de progression..."
                  className="text-sm min-h-[70px]"
                />
              </div>
            </div>
          </AdminFormSection>
        </div>
      </AdminModal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer ce programme ?"
        description={`Le programme « ${deleteTarget?.name} » sera définitivement supprimé. Les séances associées déjà enregistrées dans l'historique des clients seront préservées.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeletePlan}
      />
    </div>
  )
}

export default function LevelTemplatesPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
      </div>
    }>
      <LevelTemplatesContent />
    </Suspense>
  )
}
