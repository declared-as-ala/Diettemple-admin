"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fr } from "@/lib/i18n/fr"
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/SearchInput"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import { Plus, Video, Edit, Trash2, Dumbbell, Play, Upload, X, Loader2, Info, SlidersHorizontal, ImageIcon } from "lucide-react"
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AdminFormErrorSummary, AdminFormSection, AdminModal, AdminModalFooter, type AdminFormError } from "@/components/admin"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMediaBaseUrl } from "@/lib/apiBaseUrl"
import { ConfirmModal } from "@/components/shared/ConfirmModal"

// Default muscle groups available even when backend has none
const DEFAULT_MUSCLE_GROUPS: string[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "glutes",
  "hamstrings",
  "quadriceps",
  "calves",
]

type ExerciseDraft = {
  name: string
  muscleGroup: string
  description: string
  sets: string
  reps: string
  restTime: string
  defaultWeight: string
  videoUrl: string
}

function ExerciseFormSections({
  draft,
  onChange,
  muscleGroups,
  errors,
  disabled,
  videoInputRef,
  selectedVideoFile,
  onVideoSelect,
  onRemoveVideo,
  uploadProgress,
}: {
  draft: ExerciseDraft
  onChange: (patch: Partial<ExerciseDraft>) => void
  muscleGroups: string[]
  errors: AdminFormError[]
  disabled?: boolean
  videoInputRef?: React.RefObject<HTMLInputElement | null>
  selectedVideoFile?: File | null
  onVideoSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveVideo?: () => void
  uploadProgress?: number
}) {
  return (
    <div className="space-y-5">
      <AdminFormErrorSummary errors={errors} />
      <AdminFormSection title="Informations générales" description="Donnez un nom clair et une description utile aux coachs." icon={<Info className="h-5 w-5" aria-hidden="true" />}>
        <div className="space-y-2"><Label htmlFor="exercise-name">Nom de l’exercice *</Label><Input id="exercise-name" value={draft.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Ex. Développé couché" className="h-11 bg-white" aria-invalid={errors.some((error) => error.field === "exercise-name")} disabled={disabled} /></div>
        <div className="space-y-2"><Label htmlFor="exercise-description">Description <span className="font-normal text-slate-500">(optionnel)</span></Label><Textarea id="exercise-description" value={draft.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Décrivez l’exécution, le placement et les points de vigilance." className="min-h-24 resize-y bg-white" disabled={disabled} /></div>
      </AdminFormSection>

      <AdminFormSection title="Classification" description="Le groupe musculaire est requis par le catalogue actuel." icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}>
        <div className="space-y-2"><Label>Groupe musculaire *</Label><Select value={draft.muscleGroup || undefined} onValueChange={(value) => onChange({ muscleGroup: value })} disabled={disabled}><SelectTrigger className="h-11 w-full bg-white" aria-invalid={errors.some((error) => error.field === "exercise-muscle-group")}><SelectValue placeholder="Sélectionner le groupe musculaire" /></SelectTrigger><SelectContent>{muscleGroups.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Équipement, difficulté, type et sexe ne sont pas ajoutés ici car le contrat API actuel ne les expose pas dans ce workflow.</p>
      </AdminFormSection>

      <AdminFormSection title="Paramètres par défaut" description="Ces valeurs restent facultatives et pourront être ajustées dans chaque séance." icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="exercise-sets">Séries</Label><Input id="exercise-sets" type="number" min={1} value={draft.sets} onChange={(event) => onChange({ sets: event.target.value })} placeholder="Optionnel" className="h-11 bg-white" disabled={disabled} /></div>
          <div className="space-y-2"><Label htmlFor="exercise-reps">Répétitions</Label><Input id="exercise-reps" type="number" min={1} value={draft.reps} onChange={(event) => onChange({ reps: event.target.value })} placeholder="Optionnel" className="h-11 bg-white" disabled={disabled} /></div>
          <div className="space-y-2"><Label htmlFor="exercise-rest">Repos</Label><div className="relative"><Input id="exercise-rest" type="number" min={0} value={draft.restTime} onChange={(event) => onChange({ restTime: event.target.value })} placeholder="Optionnel" className="h-11 bg-white pr-12" disabled={disabled} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">sec</span></div></div>
          <div className="space-y-2"><Label htmlFor="exercise-weight">Poids conseillé</Label><div className="relative"><Input id="exercise-weight" type="number" min={0} step={0.5} value={draft.defaultWeight} onChange={(event) => onChange({ defaultWeight: event.target.value })} placeholder="Optionnel" className="h-11 bg-white pr-12" disabled={disabled} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">kg</span></div></div>
        </div>
      </AdminFormSection>

      {onVideoSelect && (
        <AdminFormSection title="Média" description="Ajoutez une vidéo de démonstration sans lecture automatique." icon={<ImageIcon className="h-5 w-5" aria-hidden="true" />}>
          <input ref={videoInputRef} type="file" accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm" onChange={onVideoSelect} className="sr-only" id="exercise-video-upload" disabled={disabled} />
          <label htmlFor="exercise-video-upload" className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition-colors hover:border-lime-500 hover:bg-lime-50 focus-within:ring-2 focus-within:ring-lime-600">
            <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" /><span className="text-sm font-medium text-slate-900">{selectedVideoFile?.name ?? "Choisir une vidéo"}</span><span className="text-xs text-slate-500">MP4, MOV, AVI ou WEBM · 100 Mo maximum</span>
          </label>
          {selectedVideoFile && <Button type="button" variant="outline" size="lg" onClick={onRemoveVideo} disabled={disabled}><X className="h-4 w-4" aria-hidden="true" /> Retirer la vidéo</Button>}
          {disabled && selectedVideoFile && <div className="space-y-2" aria-live="polite"><div className="flex justify-between text-sm text-slate-600"><span>Création et envoi…</span><span>{uploadProgress ?? 0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-lime-600 transition-[width]" style={{ width: `${uploadProgress ?? 0}%` }} /></div></div>}
        </AdminFormSection>
      )}
    </div>
  )
}

export default function ExercisesPage() {
  const MEDIA_BASE_URL = getMediaBaseUrl()
  const { toast } = useToast()
  const [exercises, setExercises] = useState<any[]>([])
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const hasLoadedOnce = useRef(false)
  const { query, setQuery, effectiveQuery, isDebouncing } = useDebouncedSearch({
    debounceMs: 400,
    minLength: 2,
  })
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all")
  const [hasVideoFilter, setHasVideoFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showVideoDialog, setShowVideoDialog] = useState(false)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<any>(null)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createVideoInputRef = useRef<HTMLInputElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null)
  const [creatingExercise, setCreatingExercise] = useState(false)
  const [updatingExercise, setUpdatingExercise] = useState(false)
  const [exerciseErrors, setExerciseErrors] = useState<AdminFormError[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({
    name: "",
    muscleGroup: "",
    description: "",
    sets: "",
    reps: "",
    restTime: "",
    defaultWeight: "",
    videoUrl: "",
  })

  const loadData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    const isSearchOrRefresh = hasLoadedOnce.current
    if (isSearchOrRefresh) setSearchLoading(true)
    else setLoading(true)
    try {
      const params: { limit: number; search?: string; muscleGroup?: string; difficulty?: string; equipment?: string; hasVideo?: string } = { limit: 100 }
      if (effectiveQuery) params.search = effectiveQuery
      if (selectedMuscleGroup && selectedMuscleGroup !== "all") params.muscleGroup = selectedMuscleGroup
      if (selectedDifficulty && selectedDifficulty !== "all") params.difficulty = selectedDifficulty
      if (selectedEquipment && selectedEquipment !== "all") params.equipment = selectedEquipment
      if (hasVideoFilter === "yes") params.hasVideo = "true"
      if (hasVideoFilter === "no") params.hasVideo = "false"
      const [exercisesData, muscleGroupsData] = await Promise.all([
        api.getExercises(params, { signal }),
        api.getMuscleGroups().catch((error: any) => {
          console.error('Failed to load muscle groups, will derive from exercises:', error)
          return { muscleGroups: [] }
        }),
      ])
      if (signal.aborted) return
      hasLoadedOnce.current = true
      const exercisesList = exercisesData.exercises || []
      setExercises(exercisesList)

      // Use backend muscle groups when available; otherwise derive from exercises
      const backendGroups: string[] = muscleGroupsData.muscleGroups || []

      const exerciseGroups: string[] = (exercisesList || [])
        .map((ex: any) => ex.muscleGroup)
        .filter((g: any): g is string => typeof g === 'string' && g.trim().length > 0)

      const uniqueGroups = new Set<string>(exerciseGroups)
      const derivedGroups: string[] = Array.from(uniqueGroups)

      // Merge default groups + backend groups + derived from exercises
      const allGroupsSet = new Set<string>([
        ...DEFAULT_MUSCLE_GROUPS,
        ...backendGroups,
        ...derivedGroups,
      ])

      const finalGroups: string[] = Array.from(allGroupsSet).sort((a, b) => a.localeCompare(b))
      setMuscleGroups(finalGroups)
    } catch (error: any) {
      if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") return
      toast(error.message || "Erreur lors du chargement des exercices", "error")
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        setSearchLoading(false)
      }
    }
  }, [effectiveQuery, selectedMuscleGroup, selectedDifficulty, selectedEquipment, hasVideoFilter, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setNewExercise({
      name: "",
      muscleGroup: "",
      description: "",
      sets: "",
      reps: "",
      restTime: "",
      defaultWeight: "",
      videoUrl: "",
    })
    setSelectedVideoFile(null)
    setSelectedExercise(null)
    setExerciseErrors([])
    if (createVideoInputRef.current) createVideoInputRef.current.value = ""
  }

  const handleCreateExercise = async () => {
    const errors: AdminFormError[] = []
    if (!newExercise.name.trim()) errors.push({ field: "exercise-name", message: "Le nom de l’exercice est obligatoire." })
    if (!newExercise.muscleGroup) errors.push({ field: "exercise-muscle-group", message: "Veuillez sélectionner un groupe musculaire." })
    setExerciseErrors(errors)
    if (errors.length > 0) {
      requestAnimationFrame(() => document.getElementById(errors[0].field ?? "")?.focus())
      return
    }
    if (creatingExercise) return

    setCreatingExercise(true)
    setUploadProgress(0)
    try {
      const response = await api.createExercise({
        name: newExercise.name,
        muscleGroup: newExercise.muscleGroup,
        description: newExercise.description,
        sets: newExercise.sets ? parseInt(newExercise.sets) : undefined,
        reps: newExercise.reps ? parseInt(newExercise.reps) : undefined,
        restTime: newExercise.restTime ? parseInt(newExercise.restTime) : undefined,
        defaultWeight: newExercise.defaultWeight ? parseFloat(newExercise.defaultWeight) : undefined,
      })
      const createdId = response?.exercise?._id
      if (createdId && selectedVideoFile) {
        await api.updateExerciseVideo(
          createdId,
          selectedVideoFile,
          (percent) => setUploadProgress(percent)
        )
      }
      toast("Exercice créé avec succès", "success")
      setShowCreateDialog(false)
      resetForm()
      await loadData()
    } catch (error: any) {
      const message = error.message || "Erreur lors de la création"
      setExerciseErrors([{ message }])
      toast(message, "error")
    } finally {
      setCreatingExercise(false)
      setUploadProgress(0)
    }
  }

  const handleEditExercise = (exercise: any) => {
    setSelectedExercise(exercise)
    setNewExercise({
      name: exercise.name || "",
      muscleGroup: exercise.muscleGroup || "",
      description: exercise.description || "",
      sets: exercise.sets?.toString() || "",
      reps: exercise.reps?.toString() || "",
      restTime: exercise.restTime?.toString() || "",
      defaultWeight: exercise.defaultWeight?.toString() || "",
      videoUrl: exercise.videoUrl || "",
    })
    setShowEditDialog(true)
  }

  const handleUpdateExercise = async () => {
    const errors: AdminFormError[] = []
    if (!newExercise.name.trim()) errors.push({ field: "exercise-name", message: "Le nom de l’exercice est obligatoire." })
    if (!newExercise.muscleGroup) errors.push({ field: "exercise-muscle-group", message: "Veuillez sélectionner un groupe musculaire." })
    setExerciseErrors(errors)
    if (!selectedExercise || errors.length > 0) {
      if (errors.length > 0) requestAnimationFrame(() => document.getElementById(errors[0].field ?? "")?.focus())
      return
    }

    setUpdatingExercise(true)
    try {
      await api.updateExercise(selectedExercise._id, {
        name: newExercise.name,
        muscleGroup: newExercise.muscleGroup,
        description: newExercise.description,
        sets: newExercise.sets ? parseInt(newExercise.sets) : undefined,
        reps: newExercise.reps ? parseInt(newExercise.reps) : undefined,
        restTime: newExercise.restTime ? parseInt(newExercise.restTime) : undefined,
        defaultWeight: newExercise.defaultWeight ? parseFloat(newExercise.defaultWeight) : undefined,
      })

      toast("Exercice mis à jour avec succès", "success")
      setShowEditDialog(false)
      resetForm()
      await loadData()
    } catch (error: any) {
      const message = error.message || "Erreur lors de la mise à jour"
      setExerciseErrors([{ message }])
      toast(message, "error")
    } finally {
      setUpdatingExercise(false)
    }
  }

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm']
      if (!allowedTypes.includes(file.type)) {
        toast("Type de fichier invalide. Choisissez une vidéo (MP4, MOV, AVI, WEBM)", "error")
        return
      }
      // Validate file size (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast("Fichier trop volumineux. Taille max. 100 Mo", "error")
        return
      }
      setSelectedVideoFile(file)
      setNewExercise({ ...newExercise, videoUrl: "" })
    }
  }

  const handleUploadVideo = async () => {
    if (!selectedExercise) {
      toast("Veuillez sélectionner un exercice", "error")
      return
    }

    if (!selectedVideoFile) {
      toast("Veuillez sélectionner un fichier vidéo à envoyer", "error")
      return
    }

    setUploadingVideo(true)
    setUploadProgress(0)
    try {
      const response = await api.updateExerciseVideo(
        selectedExercise._id,
        selectedVideoFile,
        (percent) => setUploadProgress(percent)
      )
      
      // Update the exercise in the local state immediately
      if (response.exercise) {
        setExercises((prev) =>
          prev.map((ex) =>
            ex._id === selectedExercise._id
              ? { ...ex, videoUrl: response.exercise.videoUrl }
              : ex
          )
        )
      }
      
      toast("Vidéo envoyée avec succès", "success")
      setShowVideoDialog(false)
      setSelectedVideoFile(null)
      setNewExercise({ ...newExercise, videoUrl: "" })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      // Reload data to ensure consistency
      await loadData()
    } catch (error: any) {
      toast(error.message || "Failed to upload video", "error")
    } finally {
      setUploadingVideo(false)
      setUploadProgress(0)
    }
  }

  const handleWatchVideo = (videoUrl: string) => {
    if (!videoUrl) return
    // Do not open YouTube/external links in our player; only uploaded videos
    if (/youtube\.com|youtu\.be/i.test(videoUrl)) {
      toast("Vidéo non disponible. Seules les vidéos uploadées sont supportées.", "error")
      return
    }
    if (videoUrl.startsWith('http')) {
      setSelectedVideoUrl(videoUrl)
      setShowVideoPlayer(true)
      return
    }
    // Backend serves /media at root and /api/videos for legacy. Prepend origin only.
    const fullUrl = videoUrl.startsWith('/')
      ? `${MEDIA_BASE_URL}${videoUrl}`
      : `${MEDIA_BASE_URL}/${videoUrl}`
    setSelectedVideoUrl(fullUrl)
    setShowVideoPlayer(true)
  }

  const getVideoUrl = (videoUrl: string) => {
    if (!videoUrl) return null
    if (videoUrl.startsWith('http')) return videoUrl
    return videoUrl.startsWith('/') ? `${MEDIA_BASE_URL}${videoUrl}` : `${MEDIA_BASE_URL}/${videoUrl}`
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredExercises.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredExercises.map((e) => e._id)))
    }
  }

  const handleDeleteOne = async (id: string) => {
    if (deletingId || deletingBulk) return
    setDeletingId(id)
    try {
      await api.deleteExercise(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setExercises((prev) => prev.filter((e) => e._id !== id))
      toast("Exercice supprimé", "success")
    } catch (error: any) {
      toast(error.message || "Erreur lors de la suppression", "error")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setDeletingBulk(true)
    try {
      await Promise.all(ids.map((id) => api.deleteExercise(id)))
      setExercises((prev) => prev.filter((e) => !selectedIds.has(e._id)))
      setSelectedIds(new Set())
      toast(`${ids.length} exercice(s) supprimé(s)`, "success")
      await loadData()
    } catch (error: any) {
      toast(error.message || "Erreur lors de la suppression", "error")
    } finally {
      setDeletingBulk(false)
    }
  }

  const filteredExercises = exercises
  const createExerciseDirty = Boolean(Object.values(newExercise).some(Boolean) || selectedVideoFile)
  const editExerciseDirty = Boolean(selectedExercise && JSON.stringify(newExercise) !== JSON.stringify({
    name: selectedExercise.name || "",
    muscleGroup: selectedExercise.muscleGroup || "",
    description: selectedExercise.description || "",
    sets: selectedExercise.sets?.toString() || "",
    reps: selectedExercise.reps?.toString() || "",
    restTime: selectedExercise.restTime?.toString() || "",
    defaultWeight: selectedExercise.defaultWeight?.toString() || "",
    videoUrl: selectedExercise.videoUrl || "",
  }))

  if (loading && exercises.length === 0 && !searchLoading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Exercices
          </h1>
          <p className="text-muted-foreground mt-2">Gérez les exercices et envoyez des vidéos</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Nouvel exercice</Button>
        <AdminModal
          open={showCreateDialog}
          onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm() }}
          title="Créer un exercice"
          description="Ajoutez un exercice structuré à la bibliothèque de l’équipe."
          icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}
          size="lg"
          busy={creatingExercise}
          dirty={createExerciseDirty}
          footer={(requestClose) => <AdminModalFooter status={createExerciseDirty ? "Modifications non enregistrées" : "Renseignez les informations de l’exercice"} statusTone={exerciseErrors.length > 0 ? "warning" : createExerciseDirty ? "neutral" : "valid"} submitLabel="Créer l’exercice" loadingLabel="Création…" loading={creatingExercise} onCancel={requestClose} onSubmit={() => void handleCreateExercise()} />}
        >
          <ExerciseFormSections draft={newExercise} onChange={(patch) => setNewExercise((previous) => ({ ...previous, ...patch }))} muscleGroups={muscleGroups} errors={exerciseErrors} disabled={creatingExercise} videoInputRef={createVideoInputRef} selectedVideoFile={selectedVideoFile} onVideoSelect={handleVideoFileSelect} onRemoveVideo={() => { setSelectedVideoFile(null); if (createVideoInputRef.current) createVideoInputRef.current.value = "" }} uploadProgress={uploadProgress} />
        </AdminModal>
      </div>

      {/* Filters */}
      <Card className="card-hover border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <SearchInput
                placeholder="Rechercher des exercices..."
                value={query}
                onChange={setQuery}
                isLoading={searchLoading || isDebouncing}
              />
            </div>
            <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Groupe musculaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les groupes</SelectItem>
                {muscleGroups.map((group) => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Difficulté" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="beginner">Débutant</SelectItem>
                <SelectItem value="intermediate">Intermédiaire</SelectItem>
                <SelectItem value="advanced">Avancé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Équipement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="machine">Machine</SelectItem>
                <SelectItem value="dumbbell">Haltères</SelectItem>
                <SelectItem value="barbell">Barre</SelectItem>
                <SelectItem value="bodyweight">Poids du corps</SelectItem>
                <SelectItem value="cable">Câble</SelectItem>
              </SelectContent>
            </Select>
            <Select value={hasVideoFilter} onValueChange={setHasVideoFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Vidéo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="yes">Avec vidéo</SelectItem>
                <SelectItem value="no">Sans vidéo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exercises Table */}
      <Card className="card-hover border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{filteredExercises.length} exercice{filteredExercises.length !== 1 ? "s" : ""}</CardTitle>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} sélectionné(s)</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingBulk}
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deletingBulk ? "Suppression…" : "Tout supprimer"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={filteredExercises.length > 0 && selectedIds.size === filteredExercises.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border"
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
                <TableHead>Vidéo</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Groupe musculaire</TableHead>
                <TableHead>Difficulté</TableHead>
                <TableHead>Équipement</TableHead>
                <TableHead>Sets × Reps</TableHead>
                <TableHead>Rest</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExercises.map((exercise) => (
                <TableRow key={exercise._id}>
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(exercise._id)}
                      onChange={() => toggleSelect(exercise._id)}
                      className="h-4 w-4 rounded border-border"
                      aria-label={`Sélectionner ${exercise.name}`}
                    />
                  </TableCell>
                  <TableCell className="w-[140px] p-2">
                    {exercise.videoUrl ? (
                      <div className="flex flex-col gap-1">
                        <div
                          className="relative w-[120px] aspect-video rounded-md overflow-hidden bg-muted border border-border cursor-pointer hover:opacity-90"
                          onClick={() => handleWatchVideo(exercise.videoUrl)}
                        >
                          <video
                            src={getVideoUrl(exercise.videoUrl) || undefined}
                            className="w-full h-full object-cover pointer-events-none"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="default" className="gap-1 cursor-pointer bg-green-600 hover:bg-green-700 text-xs" onClick={() => handleWatchVideo(exercise.videoUrl)}>
                            <Video className="h-3 w-3" />
                            Vidéo
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedExercise(exercise); setNewExercise({ ...newExercise, videoUrl: exercise.videoUrl || "" }); setSelectedVideoFile(null); setShowVideoDialog(true); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="w-[120px] aspect-video rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground text-center px-2">Aucune vidéo</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-fit" onClick={() => { setSelectedExercise(exercise); setNewExercise({ ...newExercise, videoUrl: "" }); setSelectedVideoFile(null); setShowVideoDialog(true); }}>
                          <Video className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{exercise.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{exercise.muscleGroup}</Badge>
                  </TableCell>
                  <TableCell>{exercise.difficulty ? <Badge variant="outline">{exercise.difficulty}</Badge> : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{exercise.equipment ?? "—"}</TableCell>
                  <TableCell>
                    {exercise.sets && exercise.reps ? `${exercise.sets} × ${exercise.reps}` : "-"}
                  </TableCell>
                  <TableCell>{exercise.restTime ? `${exercise.restTime}s` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditExercise(exercise)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {exercise.videoUrl && (
                        <Button variant="ghost" size="icon" onClick={() => handleWatchVideo(exercise.videoUrl)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId !== null || deletingBulk}
                        onClick={() => setDeleteTarget(exercise)}
                        title="Supprimer cet exercice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal
        open={showEditDialog}
        onOpenChange={(open) => { setShowEditDialog(open); if (!open) resetForm() }}
        title="Modifier l’exercice"
        description="Mettez à jour les informations sans modifier le contrat d’API existant."
        icon={<Edit className="h-5 w-5" aria-hidden="true" />}
        size="lg"
        busy={updatingExercise}
        dirty={editExerciseDirty}
        footer={(requestClose) => <AdminModalFooter status={editExerciseDirty ? "Modifications non enregistrées" : "Aucune modification"} statusTone={exerciseErrors.length > 0 ? "warning" : editExerciseDirty ? "neutral" : "valid"} submitLabel="Enregistrer les modifications" loadingLabel="Enregistrement…" loading={updatingExercise} submitDisabled={!editExerciseDirty} onCancel={requestClose} onSubmit={() => void handleUpdateExercise()} />}
      >
        <ExerciseFormSections draft={newExercise} onChange={(patch) => setNewExercise((previous) => ({ ...previous, ...patch }))} muscleGroups={muscleGroups} errors={exerciseErrors} disabled={updatingExercise} />
      </AdminModal>

      <ConfirmModal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} title="Supprimer l’exercice ?" description={deleteTarget ? `L’exercice « ${deleteTarget.name} » sera supprimé de la bibliothèque. Cette action peut affecter les séances qui l’utilisent.` : undefined} confirmLabel="Supprimer l’exercice" cancelLabel="Annuler" variant="destructive" loading={deletingId !== null} onConfirm={() => handleDeleteOne(deleteTarget._id)} />
      <ConfirmModal open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen} title="Supprimer les exercices sélectionnés ?" description={`${selectedIds.size} exercice${selectedIds.size !== 1 ? "s" : ""} seront supprimés de la bibliothèque. Les séances associées peuvent être affectées.`} confirmLabel="Tout supprimer" cancelLabel="Annuler" variant="destructive" loading={deletingBulk} onConfirm={handleDeleteSelected} />

      {/* Video Upload Dialog - Redesigned */}
      <Dialog open={showVideoDialog} onOpenChange={(open) => {
        setShowVideoDialog(open)
        if (!open) {
          setSelectedVideoFile(null)
          setNewExercise({ ...newExercise, videoUrl: "" })
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vidéo de l&apos;exercice</DialogTitle>
            <DialogDescription>
              Envoyez un fichier vidéo ou collez une URL pour {selectedExercise?.name || "cet exercice"}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FieldGroup>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Téléverser</h3>
                  <Field>
                    <Card className="border-2 border-dashed hover:border-primary transition-colors bg-muted/30">
                      <CardContent className="p-6">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFileSelect}
                          className="hidden"
                          id="video-upload"
                        />
                        <label
                          htmlFor="video-upload"
                          className="cursor-pointer flex flex-col items-center gap-3"
                        >
                          <div className="rounded-full bg-muted p-3 border border-border">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {selectedVideoFile ? selectedVideoFile.name : "Cliquez pour envoyer ou glisser-déposer"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              MP4, MOV, AVI, WEBM (max 100 Mo)
                            </p>
                          </div>
                        </label>
                        {selectedVideoFile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-4 w-full"
                            onClick={() => {
                              setSelectedVideoFile(null)
                              if (fileInputRef.current) {
                                fileInputRef.current.value = ""
                              }
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Retirer le fichier
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Field>
                </div>

                {(selectedVideoFile || (selectedExercise?.videoUrl && (selectedExercise.videoUrl.startsWith('/api/videos/') || selectedExercise.videoUrl.startsWith('/media/')))) && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Aperçu</h3>
                    <Field>
                      <div className="relative rounded-lg overflow-hidden aspect-video border border-border bg-muted">
                        {selectedVideoFile ? (
                          <video
                            src={URL.createObjectURL(selectedVideoFile)}
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : selectedExercise?.videoUrl ? (
                          <video
                            src={getVideoUrl(selectedExercise.videoUrl) || undefined}
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : null}
                      </div>
                    </Field>
                  </div>
                )}

                {uploadingVideo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Envoi en cours…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-[width] duration-200 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </FieldGroup>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={uploadingVideo}>{fr.buttons.cancel}</Button>
            </DialogClose>
            <Button
              onClick={handleUploadVideo}
              disabled={uploadingVideo || !selectedVideoFile}
              type="button"
              className="gap-2"
            >
              {uploadingVideo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {selectedExercise?.videoUrl ? "Mettre à jour la vidéo" : "Envoyer la vidéo"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={showVideoPlayer} onOpenChange={setShowVideoPlayer}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Lecteur vidéo</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedVideoUrl && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                <video
                  src={selectedVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
