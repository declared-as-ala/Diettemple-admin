"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCenter, useDroppable, useDraggable,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import {
  ArrowLeft, Save, Search, GripVertical, Video, Settings2, X, Plus,
  Clock, Dumbbell, AlertCircle, CheckCircle2, Layers,
  ListChecks, SlidersHorizontal, TrendingUp,
} from "lucide-react"
import { AdminDrawer, AdminFormSection, AdminModalFooter, AdminSearchableSelect } from "@/components/admin"
import { cn } from "@/lib/utils"

const DIFFICULTY_OPTIONS = [
  { value: "beginner",     label: "Débutant",      color: "text-emerald-400" },
  { value: "intermediate", label: "Intermédiaire",  color: "text-amber-400" },
  { value: "advanced",     label: "Avancé",         color: "text-rose-400" },
]
const CONDITION_OPTIONS = [
  { value: "reps_above",    label: "Reps au-dessus de" },
  { value: "reps_below",    label: "Reps en-dessous de" },
  { value: "reps_in_range", label: "Reps dans la fourchette" },
]
const ACTION_OPTIONS = [
  { value: "increase_weight", label: "↑ Augmenter la charge" },
  { value: "decrease_weight", label: "↓ Diminuer la charge" },
  { value: "maintain_weight", label: "→ Maintenir la charge" },
]

interface SessionItemConfig {
  _id?: string
  exerciseId: string
  alternatives: string[]
  sets: number
  targetReps: number | { min: number; max: number }
  recommendedStartingWeightKg?: number
  progressionRules: Array<{ condition: string; value: number | { min: number; max: number }; action: string; weightChange?: number; message?: string }>
  order: number
}

interface WarmupItemConfig {
  title: string
  durationSeconds?: number
  reps?: number
  notes?: string
  order: number
}

function normalizeTargetReps(v: any): number | { min: number; max: number } {
  if (typeof v === "number") return v
  if (v && typeof v === "object" && typeof v.min === "number" && typeof v.max === "number") return { min: v.min, max: v.max }
  return 10
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SessionTemplateBuilderPage() {
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const [sessionTemplate, setSessionTemplate] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<SessionItemConfig[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [muscleGroup, setMuscleGroup] = useState("")
  const [configIndex, setConfigIndex] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDifficulty, setEditDifficulty] = useState("")
  const [editDurationMinutes, setEditDurationMinutes] = useState<number | "">("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [warmupTitle, setWarmupTitle] = useState("Échauffement")
  const [warmupNotes, setWarmupNotes] = useState("")
  const [warmupItems, setWarmupItems] = useState<WarmupItemConfig[]>([])

  const loadSession = useCallback(async () => {
    if (!id) return
    try {
      const data = await api.getSessionTemplate(id)
      const t = data.sessionTemplate
      if (!t) return
      setSessionTemplate(t)
      setEditTitle(t.title ?? "")
      setEditDescription(t.description ?? "")
      setEditDifficulty(t.difficulty ?? "")
      setEditDurationMinutes(t.durationMinutes ?? "")
      setWarmupTitle(t.warmup?.title ?? "Échauffement")
      setWarmupNotes(t.warmup?.notes ?? "")
      setWarmupItems(
        (t.warmup?.items || []).map((w: any, idx: number) => ({
          title: w.title ?? "",
          durationSeconds: w.durationSeconds ?? undefined,
          reps: w.reps ?? undefined,
          notes: w.notes ?? "",
          order: w.order ?? idx,
        }))
      )
      const raw = t.items || []
      const parsedItems = raw.map((it: any, idx: number) => ({
        _id: it._id,
        exerciseId: typeof it.exerciseId === "object" ? it.exerciseId?._id ?? it.exerciseId : it.exerciseId,
        alternatives: (it.alternatives || []).map((a: any) => (typeof a === "object" ? a._id : a)),
        sets: it.sets ?? 3,
        targetReps: normalizeTargetReps(it.targetReps),
        recommendedStartingWeightKg: it.recommendedStartingWeightKg,
        progressionRules: Array.isArray(it.progressionRules) ? it.progressionRules : [],
        order: it.order ?? idx,
      }))
      setItems(parsedItems)

      // Load all exercises referenced in the session to ensure exerciseById is complete
      const exerciseIds = new Set<string>()
      parsedItems.forEach((item: SessionItemConfig) => {
        if (item.exerciseId) exerciseIds.add(item.exerciseId)
        item.alternatives.forEach((altId: string) => {
          if (altId) exerciseIds.add(altId)
        })
      })

      if (exerciseIds.size > 0) {
        try {
          const exerciseData = await api.getExercises({ limit: 100 })
          const neededExercises = exerciseData.exercises?.filter((e: any) => exerciseIds.has(e._id)) || []
          // Merge with existing exercises to ensure all session exercises are available
          setExercises(prev => {
            const merged = [...prev]
            neededExercises.forEach((e: any) => {
              if (!merged.find(x => x._id === e._id)) {
                merged.push(e)
              }
            })
            return merged
          })
        } catch {
          // If we can't load additional exercises, that's ok - we'll show "Inconnu" for missing ones
        }
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors du chargement", "error")
    }
  }, [id, toast])

  const loadExercises = useCallback(async () => {
    try {
      const data = await api.getExercises({ limit: 100, search: search || undefined, muscleGroup: muscleGroup || undefined })
      setExercises(data.exercises || [])
    } catch { setExercises([]) }
  }, [search, muscleGroup])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    loadSession().finally(() => setLoading(false))
  }, [id, loadSession])

  useEffect(() => { loadExercises() }, [loadExercises])

  useEffect(() => {
    if (!dirty) return
    const fn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", fn)
    return () => window.removeEventListener("beforeunload", fn)
  }, [dirty])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleSave = async () => {
    if (items.length === 0) { toast("Ajoutez au moins un exercice", "error"); return }
    setSaving(true)
    try {
      const payload = items.map((it, idx) => ({
        exerciseId: it.exerciseId,
        alternatives: it.alternatives.slice(0, 3),
        sets: it.sets,
        targetReps: it.targetReps,
        recommendedStartingWeightKg: it.recommendedStartingWeightKg,
        progressionRules: it.progressionRules,
        order: idx,
      }))
      await api.updateSessionTemplate(id, {
        title: editTitle,
        description: editDescription || undefined,
        difficulty: editDifficulty || undefined,
        durationMinutes: editDurationMinutes === "" ? undefined : Number(editDurationMinutes),
        items: payload,
        warmup: warmupItems.length > 0
          ? {
              title: warmupTitle || "Échauffement",
              notes: warmupNotes || undefined,
              items: warmupItems.map((w, idx) => ({
                title: w.title,
                durationSeconds: w.durationSeconds,
                reps: w.reps,
                notes: w.notes || undefined,
                order: idx,
              })),
            }
          : undefined,
      })
      setDirty(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
      toast("Séance enregistrée ✓", "success")
      loadSession()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de la sauvegarde", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const aid = String(active.id)
    const oid = String(over.id)
    if (aid.startsWith("lib-")) {
      const exerciseId = aid.replace("lib-", "")
      if (oid === "session-list" || oid.startsWith("item-")) {
        if (items.some(i => i.exerciseId === exerciseId)) return
        setItems(prev => [...prev, { exerciseId, alternatives: [], sets: 3, targetReps: 10, progressionRules: [], order: prev.length }])
        setDirty(true)
      }
      return
    }
    if (aid.startsWith("item-")) {
      const fromIdx = parseInt(aid.replace("item-", ""), 10)
      if (Number.isNaN(fromIdx)) return
      if (oid.startsWith("item-")) {
        const toIdx = parseInt(oid.replace("item-", ""), 10)
        if (Number.isNaN(toIdx) || fromIdx === toIdx) return
        setItems(prev => arrayMove(prev, fromIdx, toIdx))
        setDirty(true)
      }
    }
  }

  const addExercise = (exerciseId: string) => {
    if (items.some(i => i.exerciseId === exerciseId)) return
    setItems(prev => [...prev, { exerciseId, alternatives: [], sets: 3, targetReps: 10, progressionRules: [], order: prev.length }])
    setDirty(true)
  }

  const updateItem = (index: number, patch: Partial<SessionItemConfig>) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
    setDirty(true)
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
    setConfigIndex(null)
    setDirty(true)
  }

  const exerciseById: Record<string, any> = {}
  exercises.forEach(e => { exerciseById[e._id] = e })
  try {
    items.forEach(it => { if (it.exerciseId && !exerciseById[it.exerciseId]) exerciseById[it.exerciseId] = { _id: it.exerciseId, name: "Inconnu" } })
  } catch (_) {}

  const totalSets = items.reduce((s, it) => s + (it.sets || 0), 0)
  const estimatedMinutes = Math.ceil(
    items.reduce((s, it) =>
      s + (it.sets || 0) * (typeof it.targetReps === "number" ? it.targetReps : (it.targetReps as any)?.max ?? 10) * 4 / 60,
      0)
  )
  const diffCfg = DIFFICULTY_OPTIONS.find(d => d.value === editDifficulty)

  if (loading || !sessionTemplate) return <PageLoader />

  const currentConfig = configIndex !== null ? items[configIndex] : null

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-border flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/session-templates">
            <Button variant="ghost" size="sm" className="gap-2 shrink-0">
              <ArrowLeft className="h-4 w-4" /> Séances
            </Button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <Input
            value={editTitle}
            onChange={e => { setEditTitle(e.target.value); setDirty(true) }}
            className="font-bold text-lg bg-transparent border-transparent hover:border-border focus:border-border w-64"
            placeholder="Titre de la séance"
          />
          {dirty && (
            <span className="text-xs text-amber-500 flex items-center gap-1 shrink-0">
              <AlertCircle className="h-3 w-3" /> Non sauvegardé
            </span>
          )}
          {saveSuccess && !dirty && (
            <span className="text-xs text-emerald-500 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Sauvegardé
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Difficulty picker */}
          <div className="flex gap-1">
            {DIFFICULTY_OPTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => { setEditDifficulty(prev => prev === d.value ? "" : d.value); setDirty(true) }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                  editDifficulty === d.value
                    ? `${d.color} border-current bg-current/10`
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          {/* Duration */}
          <div className="flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="number"
              placeholder="min"
              value={editDurationMinutes}
              onChange={e => { setEditDurationMinutes(e.target.value === "" ? "" : Number(e.target.value)); setDirty(true) }}
              className="w-14 h-5 border-0 p-0 text-sm bg-transparent"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[100px]">
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 px-6 py-2.5 border-b border-border bg-card/30 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5" />
          <strong className="text-foreground">{items.length}</strong> exercice{items.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          <strong className="text-foreground">{totalSets}</strong> séries totales
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          ~<strong className="text-foreground">{editDurationMinutes || estimatedMinutes}</strong> min
        </span>
        {diffCfg && (
          <span className={cn("flex items-center gap-1.5 font-semibold", diffCfg.color)}>
            {diffCfg.label}
          </span>
        )}
      </div>

      {/* ── Builder ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-full divide-x divide-border">

            {/* Exercise library */}
            <div className="flex flex-col overflow-hidden bg-card/20">
              <div className="p-4 border-b border-border space-y-2">
                <h3 className="font-semibold text-sm text-foreground">Bibliothèque d'exercices</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <select
                  value={muscleGroup}
                  onChange={e => setMuscleGroup(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">Tous les groupes musculaires</option>
                  {[...new Set(exercises.map(e => e.muscleGroup).filter(Boolean))].sort().map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Glissez ou cliquez <Plus className="inline h-3 w-3" /> pour ajouter
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {exercises.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun exercice trouvé</p>
                )}
                {exercises.map(ex => (
                  <LibraryExerciseItem
                    key={ex._id}
                    exercise={ex}
                    added={items.some(i => i.exerciseId === ex._id)}
                    onAdd={() => addExercise(ex._id)}
                  />
                ))}
              </div>
            </div>

            {/* Session list */}
            <div className="flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">
                  Exercices de la séance
                  {items.length > 0 && <span className="ml-2 text-muted-foreground font-normal">({items.length})</span>}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <SessionListDroppable
                  items={items}
                  exerciseById={exerciseById}
                  onOpenConfig={setConfigIndex}
                  onRemove={removeItem}
                />
              </div>
            </div>

          </div>
        </DndContext>
      </div>

      {/* Warm-up editor */}
      <div className="border-t border-border p-4 space-y-3 bg-card/20">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Échauffement (avant séance)</h3>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => {
              setWarmupItems((prev) => [
                ...prev,
                { title: "", durationSeconds: 60, reps: undefined, notes: "", order: prev.length },
              ])
              setDirty(true)
            }}
          >
            <Plus className="h-3 w-3" /> Ajouter mouvement
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Titre échauffement</Label>
            <Input
              value={warmupTitle}
              onChange={(e) => { setWarmupTitle(e.target.value); setDirty(true) }}
              placeholder="Ex: Activation générale"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes globales</Label>
            <Input
              value={warmupNotes}
              onChange={(e) => { setWarmupNotes(e.target.value); setDirty(true) }}
              placeholder="Consignes optionnelles"
            />
          </div>
        </div>
        <div className="space-y-2">
          {warmupItems.length === 0 && (
            <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3">
              Aucun échauffement défini. Si vide, la séance démarre directement dans l'app mobile.
            </p>
          )}
          {warmupItems.map((w, idx) => (
            <div key={`warmup-${idx}`} className="grid grid-cols-1 md:grid-cols-[1.3fr_100px_100px_1fr_40px] gap-2 items-center border border-border rounded-md p-2">
              <Input
                value={w.title}
                onChange={(e) => {
                  const next = [...warmupItems]
                  next[idx] = { ...next[idx], title: e.target.value }
                  setWarmupItems(next)
                  setDirty(true)
                }}
                placeholder={`Mouvement ${idx + 1}`}
              />
              <Input
                type="number"
                value={w.durationSeconds ?? ""}
                onChange={(e) => {
                  const next = [...warmupItems]
                  next[idx] = { ...next[idx], durationSeconds: e.target.value === "" ? undefined : Number(e.target.value) }
                  setWarmupItems(next)
                  setDirty(true)
                }}
                placeholder="Sec"
              />
              <Input
                type="number"
                value={w.reps ?? ""}
                onChange={(e) => {
                  const next = [...warmupItems]
                  next[idx] = { ...next[idx], reps: e.target.value === "" ? undefined : Number(e.target.value) }
                  setWarmupItems(next)
                  setDirty(true)
                }}
                placeholder="Reps"
              />
              <Input
                value={w.notes ?? ""}
                onChange={(e) => {
                  const next = [...warmupItems]
                  next[idx] = { ...next[idx], notes: e.target.value }
                  setWarmupItems(next)
                  setDirty(true)
                }}
                placeholder="Instructions"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => {
                  setWarmupItems((prev) => prev.filter((_, i) => i !== idx).map((x, i) => ({ ...x, order: i })))
                  setDirty(true)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Config dialog */}
      {currentConfig !== null && configIndex !== null && (
        <ConfigDialog
          index={configIndex}
          config={currentConfig}
          exercise={exerciseById[currentConfig.exerciseId]}
          allExercises={exercises}
          onClose={() => setConfigIndex(null)}
          onUpdate={patch => updateItem(configIndex, patch)}
          onRemove={() => removeItem(configIndex)}
        />
      )}
    </div>
  )
}

// ── Library item ─────────────────────────────────────────────────────────────

function LibraryExerciseItem({ exercise, added, onAdd }: { exercise: any; added: boolean; onAdd: () => void }) {
  const id = `lib-${exercise._id}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { exerciseId: exercise._id } })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors",
        added
          ? "border-primary/30 bg-primary/5 opacity-60"
          : "border-border bg-card hover:border-primary/40 hover:bg-card/80 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div {...listeners} {...attributes} className="touch-none shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-foreground text-xs leading-tight">{exercise.name}</p>
        {exercise.muscleGroup && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{exercise.muscleGroup}</p>
        )}
      </div>
      {exercise.videoUrl && <Video className="h-3.5 w-3.5 text-primary/60 shrink-0" />}
      <button
        onClick={onAdd}
        disabled={added}
        className={cn(
          "h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors border",
          added
            ? "border-transparent text-primary/40 cursor-default"
            : "border-border hover:border-primary hover:bg-primary hover:text-primary-foreground"
        )}
      >
        {added ? <span className="text-xs">✓</span> : <Plus className="h-3 w-3" />}
      </button>
    </div>
  )
}

// ── Droppable session list ────────────────────────────────────────────────────

function SessionListDroppable({ items, exerciseById, onOpenConfig, onRemove }: {
  items: SessionItemConfig[]
  exerciseById: Record<string, any>
  onOpenConfig: (index: number) => void
  onRemove: (index: number) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "session-list" })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[200px] rounded-xl border-2 border-dashed p-3 space-y-2 transition-all",
        isOver ? "border-primary bg-primary/5 scale-[1.005]" : "border-border/50 bg-muted/10"
      )}
    >
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Glissez des exercices ici ou cliquez sur +</p>
        </div>
      )}
      {items.map((it, idx) => (
        <SessionListItem
          key={`${it.exerciseId}-${idx}`}
          index={idx}
          item={it}
          exercise={exerciseById[it.exerciseId]}
          onOpenConfig={() => onOpenConfig(idx)}
          onRemove={() => onRemove(idx)}
        />
      ))}
    </div>
  )
}

// ── Session item card ────────────────────────────────────────────────────────

function SessionListItem({ index, item, exercise, onOpenConfig, onRemove }: {
  index: number; item: SessionItemConfig; exercise?: any; onOpenConfig: () => void; onRemove: () => void
}) {
  const id = `item-${index}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { index } })
  const repsStr = typeof item.targetReps === "number"
    ? `${item.targetReps} reps`
    : `${(item.targetReps as any)?.min}–${(item.targetReps as any)?.max} reps`

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-all hover:border-primary/30 hover:shadow-sm",
        isDragging && "opacity-40 shadow-lg"
      )}
    >
      {/* Number */}
      <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
        {index + 1}
      </span>

      {/* Drag handle */}
      <div {...listeners} {...attributes} className="cursor-grab touch-none shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate text-sm">{exercise?.name ?? "Exercice"}</p>
        {exercise?.muscleGroup && (
          <p className="text-[10px] text-muted-foreground">{exercise.muscleGroup}</p>
        )}
      </div>

      {/* Stats chips */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-semibold text-foreground">
          {item.sets}×{repsStr.split(" ")[0]}
        </span>
        {item.progressionRules.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-xs text-primary font-semibold border border-primary/20">
            {item.progressionRules.length} règle{item.progressionRules.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Actions */}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={onOpenConfig}>
        <Settings2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ── Config dialog ────────────────────────────────────────────────────────────

function ConfigDialog({ index, config, exercise, allExercises, onClose, onUpdate, onRemove }: {
  index: number; config: SessionItemConfig; exercise?: any; allExercises: any[]
  onClose: () => void; onUpdate: (patch: Partial<SessionItemConfig>) => void; onRemove: () => void
}) {
  const [sets, setSets] = useState(config.sets)
  const [targetReps, setTargetReps] = useState<number | { min: number; max: number }>(config.targetReps)
  const [useRange, setUseRange] = useState(typeof config.targetReps === "object")
  const [recommendedWeight, setRecommendedWeight] = useState<number | "">(config.recommendedStartingWeightKg ?? "")
  const [alternatives, setAlternatives] = useState<string[]>(config.alternatives.slice(0, 3))
  const [progressionRules, setProgressionRules] = useState(config.progressionRules)
  const [allExercisesForAlternatives, setAllExercisesForAlternatives] = useState<any[]>(allExercises)
  const [loadingAltExercises, setLoadingAltExercises] = useState(false)

  useEffect(() => {
    setSets(config.sets)
    setTargetReps(config.targetReps)
    setUseRange(typeof config.targetReps === "object")
    setRecommendedWeight(config.recommendedStartingWeightKg ?? "")
    setAlternatives(config.alternatives.slice(0, 3))
    setProgressionRules(config.progressionRules)
  }, [config])

  useEffect(() => {
    const loadAllExercises = async () => {
      setLoadingAltExercises(true)
      try {
        const data = await api.getExercises({ limit: 100 })
        const catalogue = data.exercises || []
        setAllExercisesForAlternatives(catalogue)
      } catch {
        setAllExercisesForAlternatives(allExercises)
      } finally {
        setLoadingAltExercises(false)
      }
    }
    void loadAllExercises()
  }, [allExercises])

  const eligibleAlternatives = useMemo(
    () => allExercisesForAlternatives.filter(item => item._id !== config.exerciseId),
    [allExercisesForAlternatives, config.exerciseId]
  )

  const dirty = useMemo(() => JSON.stringify({
    sets,
    targetReps,
    useRange,
    recommendedWeight,
    alternatives,
    progressionRules,
  }) !== JSON.stringify({
    sets: config.sets,
    targetReps: config.targetReps,
    useRange: typeof config.targetReps === "object",
    recommendedWeight: config.recommendedStartingWeightKg ?? "",
    alternatives: config.alternatives.slice(0, 3),
    progressionRules: config.progressionRules,
  }), [alternatives, config, progressionRules, recommendedWeight, sets, targetReps, useRange])

  const apply = () => {
    const reps = useRange
      ? (typeof targetReps === "object" ? targetReps : { min: 10, max: 12 })
      : (typeof targetReps === "number" ? targetReps : 10)
    onUpdate({
      sets,
      targetReps: reps,
      recommendedStartingWeightKg: recommendedWeight === "" ? undefined : Number(recommendedWeight),
      alternatives: alternatives.filter(Boolean),
      progressionRules,
    })
    onClose()
  }

  const addProgressionRule = () => {
    setProgressionRules(previous => [...previous, { condition: "reps_above", value: 12, action: "increase_weight", weightChange: 2.5, message: "" }])
  }
  const updateProgressionRule = (idx: number, patch: any) => {
    setProgressionRules(previous => previous.map((rule, ruleIndex) => ruleIndex === idx ? { ...rule, ...patch } : rule))
  }
  const removeProgressionRule = (idx: number) => {
    setProgressionRules(previous => previous.filter((_, ruleIndex) => ruleIndex !== idx))
  }

  return (
    <AdminDrawer
      open
      onOpenChange={open => { if (!open) onClose() }}
      title={exercise?.name ?? "Configurer l’exercice"}
      description="Ajustez les paramètres, les alternatives et les règles de progression."
      eyebrow={exercise?.muscleGroup || `Exercice ${index + 1}`}
      icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}
      size="md"
      dirty={dirty}
      footer={requestClose => (
        <AdminModalFooter
          status={dirty ? "Modifications non enregistrées" : "Configuration à jour"}
          statusTone={dirty ? "warning" : "valid"}
          submitLabel="Appliquer les modifications"
          onCancel={requestClose}
          onSubmit={apply}
          className="sm:items-end"
        />
      )}
    >
      <div className="space-y-5">
        <AdminFormSection title="Paramètres" description="Définissez le volume et la cible de travail." icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}>
          <div className="space-y-2">
            <Label htmlFor="config-sets">Séries</Label>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Réduire le nombre de séries" onClick={() => setSets(value => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted/40 text-lg font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">−</button>
              <Input id="config-sets" type="number" min={1} value={sets} onChange={event => setSets(Number(event.target.value) || 1)} className="h-11 flex-1 bg-muted/30 text-center text-lg font-semibold" />
              <button type="button" aria-label="Augmenter le nombre de séries" onClick={() => setSets(value => value + 1)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted/40 text-lg font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">+</button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>Répétitions cibles</Label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground hover:bg-muted/50 transition-colors">
                <input type="checkbox" checked={useRange} onChange={event => setUseRange(event.target.checked)} className="h-4 w-4 accent-primary" />
                Fourchette min–max
              </label>
            </div>
            {useRange ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Input aria-label="Répétitions minimum" type="number" value={typeof targetReps === "object" ? targetReps.min : 10} onChange={event => setTargetReps(previous => ({ min: Number(event.target.value) || 0, max: typeof previous === "object" ? previous.max : 12 }))} className="h-11 bg-muted/30 text-center text-foreground" />
                <span className="text-sm text-muted-foreground">à</span>
                <Input aria-label="Répétitions maximum" type="number" value={typeof targetReps === "object" ? targetReps.max : 12} onChange={event => setTargetReps(previous => ({ min: typeof previous === "object" ? previous.min : 10, max: Number(event.target.value) || 0 }))} className="h-11 bg-muted/30 text-center text-foreground" />
              </div>
            ) : (
              <Input aria-label="Répétitions cibles" type="number" value={typeof targetReps === "number" ? targetReps : 10} onChange={event => setTargetReps(Number(event.target.value) || 10)} className="h-11 max-w-32 bg-muted/30 text-center text-lg font-semibold text-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="config-weight">Poids de départ conseillé</Label>
            <div className="relative max-w-56">
              <Input id="config-weight" type="number" min={0} step={0.5} value={recommendedWeight} onChange={event => setRecommendedWeight(event.target.value === "" ? "" : Number(event.target.value))} placeholder="Optionnel" className="h-11 bg-muted/30 pr-12" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
            </div>
          </div>
        </AdminFormSection>

        <AdminFormSection title="Alternatives" description="Sélectionnez jusqu’à trois exercices éligibles." icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}>
          <AdminSearchableSelect
            items={eligibleAlternatives}
            selectedKeys={alternatives}
            onSelectionChange={setAlternatives}
            getKey={item => item._id}
            getLabel={item => item.name}
            getSearchText={item => `${item.name} ${item.muscleGroup || ""}`}
            renderMeta={item => item.muscleGroup || "Groupe musculaire non renseigné"}
            maxSelections={3}
            placeholder="Rechercher un exercice alternatif…"
            emptyText="Aucun exercice éligible ne correspond à la recherche."
            loading={loadingAltExercises}
            label="Exercices alternatifs"
          />
        </AdminFormSection>

        <AdminFormSection title="Progression" description="Créez des règles lisibles qui seront évaluées après les performances de l’athlète." icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="lg" onClick={addProgressionRule}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter une règle
            </Button>
          </div>
          {progressionRules.length === 0 && <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">Aucune règle de progression.</p>}
          <div className="space-y-3">
            {progressionRules.map((rule, ruleIndex) => (
              <div key={ruleIndex} className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Règle {ruleIndex + 1}</p>
                  <Button type="button" variant="ghost" size="icon-lg" aria-label={`Supprimer la règle ${ruleIndex + 1}`} onClick={() => removeProgressionRule(ruleIndex)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><X className="h-4 w-4" aria-hidden="true" /></Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Condition</Label><select value={rule.condition} onChange={event => updateProgressionRule(ruleIndex, { condition: event.target.value })} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">{CONDITION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                  <div className="space-y-2"><Label>Seuil</Label><Input type="number" className="h-11 bg-muted/30 text-foreground" value={typeof rule.value === "number" ? rule.value : (rule.value as any)?.max} onChange={event => updateProgressionRule(ruleIndex, { value: Number(event.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>Action</Label><select value={rule.action} onChange={event => updateProgressionRule(ruleIndex, { action: event.target.value })} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">{ACTION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                  <div className="space-y-2"><Label>Valeur (kg)</Label><Input type="number" step={0.5} className="h-11 bg-muted/30 text-foreground" value={rule.weightChange ?? ""} onChange={event => updateProgressionRule(ruleIndex, { weightChange: event.target.value === "" ? undefined : Number(event.target.value) })} /></div>
                </div>
                <div className="space-y-2"><Label>Message affiché à l’athlète</Label><Input className="h-11 bg-muted/30 text-foreground" placeholder="Ex. Très bonne série, augmentez légèrement la charge." value={rule.message ?? ""} onChange={event => updateProgressionRule(ruleIndex, { message: event.target.value })} /></div>
              </div>
            ))}
          </div>
        </AdminFormSection>

        <Button type="button" variant="ghost" size="lg" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { onRemove(); onClose() }}>
          <X className="h-4 w-4" aria-hidden="true" /> Retirer l’exercice de la séance
        </Button>
      </div>
    </AdminDrawer>
  )
}
