"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import {
  ArrowLeft, Save, Search, GripVertical, Video, Settings2, X, Plus,
  Clock, Dumbbell, ChevronDown, AlertCircle, CheckCircle2, Layers,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
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
  restTimeSeconds: number
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
      setItems(raw.map((it: any, idx: number) => ({
        _id: it._id,
        exerciseId: typeof it.exerciseId === "object" ? it.exerciseId?._id ?? it.exerciseId : it.exerciseId,
        alternatives: (it.alternatives || []).map((a: any) => (typeof a === "object" ? a._id : a)),
        sets: it.sets ?? 3,
        targetReps: normalizeTargetReps(it.targetReps),
        restTimeSeconds: it.restTimeSeconds ?? 60,
        recommendedStartingWeightKg: it.recommendedStartingWeightKg,
        progressionRules: Array.isArray(it.progressionRules) ? it.progressionRules : [],
        order: it.order ?? idx,
      })))
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors du chargement", "error")
    }
  }, [id, toast])

  const loadExercises = useCallback(async () => {
    try {
      const data = await api.getExercises({ limit: 200, search: search || undefined, muscleGroup: muscleGroup || undefined })
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
        restTimeSeconds: it.restTimeSeconds,
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
        setItems(prev => [...prev, { exerciseId, alternatives: [], sets: 3, targetReps: 10, restTimeSeconds: 60, progressionRules: [], order: prev.length }])
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
    setItems(prev => [...prev, { exerciseId, alternatives: [], sets: 3, targetReps: 10, restTimeSeconds: 60, progressionRules: [], order: prev.length }])
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
      s + (it.sets || 0) * (typeof it.targetReps === "number" ? it.targetReps : (it.targetReps as any)?.max ?? 10) * 4 / 60
        + (it.restTimeSeconds || 0) * (it.sets || 0) / 60,
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
  const restStr = item.restTimeSeconds >= 60
    ? `${Math.floor(item.restTimeSeconds / 60)}min${item.restTimeSeconds % 60 ? `${item.restTimeSeconds % 60}s` : ""}`
    : `${item.restTimeSeconds}s`

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
        <span className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
          {restStr} repos
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
  const [restTimeSeconds, setRestTimeSeconds] = useState(config.restTimeSeconds)
  const [recommendedWeight, setRecommendedWeight] = useState<number | "">(config.recommendedStartingWeightKg ?? "")
  const [alternatives, setAlternatives] = useState<string[]>(config.alternatives.slice(0, 3))

  useEffect(() => {
    setSets(config.sets)
    setTargetReps(config.targetReps)
    setUseRange(typeof config.targetReps === "object")
    setRestTimeSeconds(config.restTimeSeconds)
    setRecommendedWeight(config.recommendedStartingWeightKg ?? "")
    setAlternatives(config.alternatives.slice(0, 3))
  }, [config])

  const apply = () => {
    const reps = useRange
      ? (typeof targetReps === "object" ? targetReps : { min: 10, max: 12 })
      : (typeof targetReps === "number" ? targetReps : 10)
    onUpdate({ sets, targetReps: reps, restTimeSeconds, recommendedStartingWeightKg: recommendedWeight === "" ? undefined : Number(recommendedWeight), alternatives: alternatives.filter(Boolean) })
    onClose()
  }

  const addProgressionRule = () => {
    onUpdate({ progressionRules: [...config.progressionRules, { condition: "reps_above", value: 12, action: "increase_weight", weightChange: 2.5, message: "" }] })
  }
  const updateProgressionRule = (idx: number, patch: any) => {
    const next = [...config.progressionRules]; next[idx] = { ...next[idx], ...patch }; onUpdate({ progressionRules: next })
  }
  const removeProgressionRule = (idx: number) => {
    onUpdate({ progressionRules: config.progressionRules.filter((_, i) => i !== idx) })
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            {exercise?.name ?? "Exercice"}
          </DialogTitle>
          {exercise?.muscleGroup && (
            <p className="text-xs text-muted-foreground mt-0.5">{exercise.muscleGroup}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Sets + Rest */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Séries</Label>
              <div className="flex items-center gap-2">
                <button onClick={() => setSets(s => Math.max(1, s - 1))} className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center font-bold text-lg">−</button>
                <Input type="number" min={1} value={sets} onChange={e => setSets(Number(e.target.value) || 1)} className="text-center font-bold h-8" />
                <button onClick={() => setSets(s => s + 1)} className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center font-bold text-lg">+</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Repos (sec)</Label>
              <div className="flex items-center gap-2">
                <button onClick={() => setRestTimeSeconds(s => Math.max(0, s - 15))} className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center font-bold">−</button>
                <Input type="number" min={0} value={restTimeSeconds} onChange={e => setRestTimeSeconds(Number(e.target.value) || 0)} className="text-center font-bold h-8" />
                <button onClick={() => setRestTimeSeconds(s => s + 15)} className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center font-bold">+</button>
              </div>
            </div>
          </div>

          {/* Target reps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Répétitions cibles</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={useRange} onChange={e => setUseRange(e.target.checked)} className="rounded border-border h-3 w-3" />
                Fourchette (min–max)
              </label>
            </div>
            {useRange ? (
              <div className="flex gap-2 items-center">
                <Input type="number" placeholder="Min." value={typeof targetReps === "object" ? targetReps.min : ""} onChange={e => setTargetReps(prev => ({ min: Number(e.target.value) || 0, max: typeof prev === "object" ? prev.max : 12 }))} className="text-center" />
                <span className="text-muted-foreground">–</span>
                <Input type="number" placeholder="Max." value={typeof targetReps === "object" ? targetReps.max : ""} onChange={e => setTargetReps(prev => ({ min: typeof prev === "object" ? prev.min : 8, max: Number(e.target.value) || 12 }))} className="text-center" />
              </div>
            ) : (
              <Input type="number" value={typeof targetReps === "number" ? targetReps : ""} onChange={e => setTargetReps(Number(e.target.value) || 10)} className="text-center w-32" />
            )}
          </div>

          {/* Starting weight */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Poids de départ conseillé (kg)</Label>
            <Input type="number" step={0.5} value={recommendedWeight} onChange={e => setRecommendedWeight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Optionnel" className="w-32" />
          </div>

          {/* Alternatives */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exercices alternatifs (max 3)</Label>
            <div className="space-y-1.5">
              {[0, 1, 2].map(i => (
                <select
                  key={i}
                  value={alternatives[i] ?? ""}
                  onChange={e => {
                    const next = [...alternatives]; next[i] = e.target.value; setAlternatives(next.slice(0, 3))
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Aucun —</option>
                  {allExercises.filter(e => e._id !== config.exerciseId).map(e => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          {/* Progression rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Règles de progression</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addProgressionRule}>
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </div>
            {config.progressionRules.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center border border-dashed border-border rounded-lg">
                Aucune règle de progression
              </p>
            )}
            <div className="space-y-2">
              {config.progressionRules.map((rule, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={rule.condition} onChange={e => updateProgressionRule(idx, { condition: e.target.value })} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                      {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Input type="number" className="w-16 h-8 text-sm" value={typeof rule.value === "number" ? rule.value : (rule.value as any)?.max} onChange={e => updateProgressionRule(idx, { value: Number(e.target.value) || 0 })} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeProgressionRule(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={rule.action} onChange={e => updateProgressionRule(idx, { action: e.target.value })} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                      {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Input type="number" step={0.5} className="w-20 h-8 text-sm" placeholder="±kg" value={rule.weightChange ?? ""} onChange={e => updateProgressionRule(idx, { weightChange: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </div>
                  <Input className="h-8 text-sm" placeholder="Message affiché à l'athlète" value={rule.message ?? ""} onChange={e => updateProgressionRule(idx, { message: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="destructive" size="sm" onClick={() => { onRemove(); onClose() }}>
            <X className="h-3.5 w-3.5 mr-1" /> Retirer
          </Button>
          <DialogClose asChild><Button variant="outline" size="sm">Annuler</Button></DialogClose>
          <Button size="sm" onClick={apply}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
