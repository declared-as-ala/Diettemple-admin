"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import { ArrowLeft, Save, Search, GripVertical, Video, Settings } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
]
const CONDITION_OPTIONS = [
  { value: "reps_above", label: "Reps au-dessus" },
  { value: "reps_below", label: "Reps en-dessous" },
  { value: "reps_in_range", label: "Reps dans la fourchette" },
]
const ACTION_OPTIONS = [
  { value: "increase_weight", label: "Augmenter la charge" },
  { value: "decrease_weight", label: "Diminuer la charge" },
  { value: "maintain_weight", label: "Maintenir la charge" },
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

function normalizeTargetReps(v: number | { min: number; max: number }): number | { min: number; max: number } {
  if (typeof v === "number") return v
  if (v && typeof v === "object" && typeof v.min === "number" && typeof v.max === "number") return { min: v.min, max: v.max }
  return 10
}

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
    } catch {
      setExercises([])
    }
  }, [search, muscleGroup])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    loadSession().finally(() => setLoading(false))
  }, [id, loadSession])

  useEffect(() => {
    loadExercises()
  }, [loadExercises])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleSave = async () => {
    if (items.length === 0) {
      toast("Add at least one exercise", "error")
      return
    }
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
      })
      setDirty(false)
      toast("Séance enregistrée", "success")
      loadSession()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Error saving", "error")
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
      if (oid === "session-list") {
        setItems((prev) => [...prev, {
          exerciseId,
          alternatives: [],
          sets: 3,
          targetReps: 10,
          restTimeSeconds: 60,
          progressionRules: [],
          order: prev.length,
        }])
        setDirty(true)
      }
      return
    }
    if (aid.startsWith("item-")) {
      const fromIdx = parseInt(aid.replace("item-", ""), 10)
      if (Number.isNaN(fromIdx)) return
      if (oid === "session-list") {
        setItems((prev) => {
          if (fromIdx >= prev.length - 1) return prev
          return [...prev.slice(0, fromIdx), ...prev.slice(fromIdx + 1), prev[fromIdx]]
        })
        setDirty(true)
        return
      }
      if (oid.startsWith("item-")) {
        const toIdx = parseInt(oid.replace("item-", ""), 10)
        if (Number.isNaN(toIdx) || fromIdx === toIdx) return
        setItems((prev) => arrayMove(prev, fromIdx, toIdx))
        setDirty(true)
      }
    }
  }

  const updateItem = (index: number, patch: Partial<SessionItemConfig>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
    setDirty(true)
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setConfigIndex(null)
    setDirty(true)
  }

  const exerciseById: Record<string, any> = {}
  exercises.forEach((e) => { exerciseById[e._id] = e })
  const allExercises = exercises
  try {
    items.forEach((it) => { if (it.exerciseId && !exerciseById[it.exerciseId]) exerciseById[it.exerciseId] = { _id: it.exerciseId, name: "Inconnu" } })
  } catch (_) {}

  const totalSets = items.reduce((s, it) => s + (it.sets || 0), 0)
  const estimatedMinutes = Math.ceil(items.reduce((s, it) => s + (it.sets || 0) * (typeof it.targetReps === "number" ? it.targetReps : (it.targetReps as any)?.max ?? 10) * 4 / 60 + (it.restTimeSeconds || 0) * (it.sets || 0) / 60, 0))

  if (loading || !sessionTemplate) {
    return <PageLoader />
  }

  const currentConfig = configIndex !== null ? items[configIndex] : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Link href="/admin/session-templates">
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />Séances</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => { setEditTitle(e.target.value); setDirty(true) }}
              className="max-w-xs font-semibold bg-transparent border-border"
            />
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <select
              value={editDifficulty}
              onChange={(e) => { setEditDifficulty(e.target.value); setDirty(true) }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Difficulty</option>
              {DIFFICULTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Input
              type="number"
              placeholder="Durée (min)"
              value={editDurationMinutes}
              onChange={(e) => { setEditDurationMinutes(e.target.value === "" ? "" : Number(e.target.value)); setDirty(true) }}
              className="w-24"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h3 className="font-semibold mb-2">Exercises Library</h3>
                <div className="space-y-2 mb-3">
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9"
                  />
                  <select
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Tous les groupes musculaires</option>
                    {[...new Set(allExercises.map((e) => e.muscleGroup).filter(Boolean))].sort().map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Drag an exercise into the session list</p>
                <div className="space-y-1 max-h-[360px] overflow-y-auto">
                  {allExercises.map((ex) => (
                    <LibraryExerciseItem key={ex._id} exercise={ex} />
                  ))}
                  {allExercises.length === 0 && <p className="text-sm text-muted-foreground">Aucun exercice</p>}
                </div>
              </div>
              <div className="lg:col-span-2">
                <h3 className="font-semibold mb-2">Exercices de la séance</h3>
                <SessionListDroppable
                  items={items}
                  exerciseById={exerciseById}
                  onOpenConfig={setConfigIndex}
                  onRemove={removeItem}
                />
                <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm">
                  <span className="text-muted-foreground">Séries totales : {totalSets}</span>
                  <span className="mx-2">·</span>
                  <span className="text-muted-foreground">Durée est. : ~{estimatedMinutes} min</span>
                </div>
              </div>
            </div>
          </DndContext>
        </CardContent>
      </Card>

      {currentConfig !== null && configIndex !== null && (
        <ConfigDialog
          index={configIndex}
          config={currentConfig}
          exercise={exerciseById[currentConfig.exerciseId]}
          allExercises={allExercises}
          onClose={() => setConfigIndex(null)}
          onUpdate={(patch) => updateItem(configIndex, patch)}
          onRemove={() => removeItem(configIndex)}
        />
      )}
    </div>
  )
}

function LibraryExerciseItem({ exercise }: { exercise: any }) {
  const id = `lib-${exercise._id}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { exerciseId: exercise._id } })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded border border-border bg-card px-2 py-2 text-sm cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      {exercise.videoUrl ? <Video className="h-4 w-4 text-primary shrink-0" /> : null}
      <span className="truncate">{exercise.name}</span>
      {exercise.muscleGroup && <Badge variant="outline" className="text-xs shrink-0">{exercise.muscleGroup}</Badge>}
    </div>
  )
}

function SessionListDroppable({
  items,
  exerciseById,
  onOpenConfig,
  onRemove,
}: {
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
        "min-h-[120px] rounded-lg border-2 border-dashed p-3 space-y-2 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
      )}
    >
      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Déposez des exercices ici</p>}
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

function SessionListItem({
  index,
  item,
  exercise,
  onOpenConfig,
  onRemove,
}: {
  index: number
  item: SessionItemConfig
  exercise?: any
  onOpenConfig: () => void
  onRemove: () => void
}) {
  const id = `item-${index}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { index } })
  const repsStr = typeof item.targetReps === "number" ? `${item.targetReps} reps` : `${(item.targetReps as any)?.min}-${(item.targetReps as any)?.max} reps`
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded border border-border bg-card px-3 py-2 text-sm",
        isDragging && "opacity-50"
      )}
    >
      <div {...listeners} {...attributes} className="cursor-grab touch-none"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
      <span className="flex-1 font-medium truncate">{exercise?.name ?? item.exerciseId}</span>
      <span className="text-muted-foreground text-xs">{item.sets}× {repsStr}</span>
      <Button variant="ghost" size="icon" onClick={onOpenConfig}><Settings className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">×</Button>
    </div>
  )
}

function ConfigDialog({
  index,
  config,
  exercise,
  allExercises,
  onClose,
  onUpdate,
  onRemove,
}: {
  index: number
  config: SessionItemConfig
  exercise?: any
  allExercises: any[]
  onClose: () => void
  onUpdate: (patch: Partial<SessionItemConfig>) => void
  onRemove: () => void
}) {
  const [sets, setSets] = useState(config.sets)
  const [targetReps, setTargetReps] = useState<number | { min: number; max: number }>(config.targetReps)
  const [useRange, setUseRange] = useState(typeof config.targetReps === "object")
  const [restTimeSeconds, setRestTimeSeconds] = useState(config.restTimeSeconds)
  const [recommendedWeight, setRecommendedWeight] = useState(config.recommendedStartingWeightKg ?? "")
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
    onUpdate({
      sets,
      targetReps: reps,
      restTimeSeconds,
      recommendedStartingWeightKg: recommendedWeight === "" ? undefined : Number(recommendedWeight),
      alternatives: alternatives.filter(Boolean),
    })
    onClose()
  }

  const addProgressionRule = () => {
    onUpdate({
      progressionRules: [...config.progressionRules, { condition: "reps_above", value: 12, action: "increase_weight", weightChange: 2.5, message: "" }],
    })
  }
  const updateProgressionRule = (idx: number, patch: Partial<typeof config.progressionRules[0]>) => {
    const next = [...config.progressionRules]
    next[idx] = { ...next[idx], ...patch }
    onUpdate({ progressionRules: next })
  }
  const removeProgressionRule = (idx: number) => {
    onUpdate({ progressionRules: config.progressionRules.filter((_, i) => i !== idx) })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration exercice — {exercise?.name ?? config.exerciseId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sets</Label>
              <Input type="number" min={1} value={sets} onChange={(e) => setSets(Number(e.target.value) || 1)} className="mt-1" />
            </div>
            <div>
              <Label>Repos (secondes)</Label>
              <Input type="number" min={0} value={restTimeSeconds} onChange={(e) => setRestTimeSeconds(Number(e.target.value) || 0)} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={useRange} onChange={(e) => setUseRange(e.target.checked)} className="rounded border-border" />
              Target reps as range (min–max)
            </label>
            {useRange ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min."
                  value={typeof targetReps === "object" ? targetReps.min : ""}
                  onChange={(e) => setTargetReps((prev) => ({ min: Number(e.target.value) || 0, max: typeof prev === "object" ? prev.max : 10 }))}
                />
                <Input
                  type="number"
                  placeholder="Max."
                  value={typeof targetReps === "object" ? targetReps.max : ""}
                  onChange={(e) => setTargetReps((prev) => ({ min: typeof prev === "object" ? prev.min : 10, max: Number(e.target.value) || 10 }))}
                />
              </div>
            ) : (
              <Input
                type="number"
                value={typeof targetReps === "number" ? targetReps : ""}
                onChange={(e) => setTargetReps(Number(e.target.value) || 10)}
              />
            )}
          </div>
          <div>
            <Label>Poids de départ recommandé (kg)</Label>
            <Input type="number" step={0.5} value={recommendedWeight} onChange={(e) => setRecommendedWeight(e.target.value)} className="mt-1" placeholder="Optionnel" />
          </div>
          <div>
            <Label>Alternatives (max 3)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {[0, 1, 2].map((i) => (
                <select
                  key={i}
                  value={alternatives[i] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = [...alternatives]
                    next[i] = v
                    setAlternatives(next.slice(0, 3))
                  }}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {allExercises.filter((e) => e._id !== config.exerciseId).map((e) => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Règles de progression</Label>
              <Button variant="ghost" size="sm" onClick={addProgressionRule}>Ajouter une règle</Button>
            </div>
            <div className="space-y-2 mt-2">
              {config.progressionRules.map((rule, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 items-center rounded border border-border p-2 text-sm">
                  <select
                    value={rule.condition}
                    onChange={(e) => updateProgressionRule(idx, { condition: e.target.value })}
                    className="rounded border border-border bg-background px-2 py-1"
                  >
                    {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <Input
                    type="number"
                    className="w-16"
                    value={typeof rule.value === "number" ? rule.value : (rule.value as any)?.max}
                    onChange={(e) => updateProgressionRule(idx, { value: Number(e.target.value) || 0 })}
                  />
                  <select
                    value={rule.action}
                    onChange={(e) => updateProgressionRule(idx, { action: e.target.value })}
                    className="rounded border border-border bg-background px-2 py-1"
                  >
                    {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <Input
                    type="number"
                    step={0.5}
                    className="w-20"
                    placeholder="Δ kg"
                    value={rule.weightChange ?? ""}
                    onChange={(e) => updateProgressionRule(idx, { weightChange: e.target.value === "" ? undefined : Number(e.target.value) })}
                  />
                  <Input
                    className="flex-1 min-w-[80px]"
                    placeholder="Message"
                    value={rule.message ?? ""}
                    onChange={(e) => updateProgressionRule(idx, { message: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeProgressionRule(idx)} className="text-destructive">×</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={() => { onRemove(); onClose(); }}>Retirer de la séance</Button>
          <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
          <Button onClick={apply}>Appliquer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
