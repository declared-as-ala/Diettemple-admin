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
import { Plus, Search, Video, Edit, Trash2, Dumbbell, Play, Upload, X } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { getApiBaseUrl, getMediaBaseUrl } from "@/lib/apiBaseUrl"

export default function ExercisesPage() {
  const API_BASE_URL = getApiBaseUrl()
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingBulk, setDeletingBulk] = useState(false)
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
      const params: { limit: number; search?: string; muscleGroup?: string; difficulty?: string; equipment?: string; hasVideo?: string } = { limit: 500 }
      if (effectiveQuery) params.search = effectiveQuery
      if (selectedMuscleGroup && selectedMuscleGroup !== "all") params.muscleGroup = selectedMuscleGroup
      if (selectedDifficulty && selectedDifficulty !== "all") params.difficulty = selectedDifficulty
      if (selectedEquipment && selectedEquipment !== "all") params.equipment = selectedEquipment
      if (hasVideoFilter === "yes") params.hasVideo = "true"
      if (hasVideoFilter === "no") params.hasVideo = "false"
      const [exercisesData, muscleGroupsData] = await Promise.all([
        api.getExercises(params, { signal }),
        api.getMuscleGroups(),
      ])
      if (signal.aborted) return
      hasLoadedOnce.current = true
      const exercisesList = exercisesData.exercises || []
      setExercises(exercisesList)
      setMuscleGroups(muscleGroupsData.muscleGroups || [])
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
    if (createVideoInputRef.current) createVideoInputRef.current.value = ""
  }

  const handleCreateExercise = async () => {
    if (!newExercise.name || !newExercise.muscleGroup) {
      toast("Veuillez remplir les champs obligatoires", "error")
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
      toast(error.message || "Erreur lors de la création", "error")
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
    if (!selectedExercise || !newExercise.name || !newExercise.muscleGroup) {
      toast("Veuillez remplir les champs obligatoires", "error")
      return
    }

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
      toast(error.message || "Erreur lors de la mise à jour", "error")
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
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel exercice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un exercice</DialogTitle>
              <DialogDescription>
                Ajoutez un exercice à la bibliothèque. Remplissez les champs requis puis cliquez sur créer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-white dark:bg-[#121212]">
              <FieldGroup>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Basic Information</h3>
                    <div className="space-y-4">
                      <Field>
                        <Label htmlFor="exercise-name">Exercise Name *</Label>
                        <Input
                          id="exercise-name"
                          value={newExercise.name}
                          onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                          placeholder="e.g., Bench Press"
                        />
                      </Field>
                      <Field>
                        <Label>Groupe musculaire *</Label>
                        <Select
                          value={newExercise.muscleGroup || undefined}
                          onValueChange={(value) => setNewExercise({ ...newExercise, muscleGroup: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select muscle group" />
                          </SelectTrigger>
                          <SelectContent>
                            {muscleGroups.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={newExercise.description}
                          onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                          placeholder="Description optionnelle"
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Paramètres</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field>
                        <Label htmlFor="sets">Séries par défaut</Label>
                        <Input
                          id="sets"
                          type="number"
                          value={newExercise.sets}
                          onChange={(e) => setNewExercise({ ...newExercise, sets: e.target.value })}
                          placeholder="Optionnel"
                        />
                      </Field>
                      <Field>
                        <Label htmlFor="reps">Default Reps</Label>
                        <Input
                          id="reps"
                          type="number"
                          value={newExercise.reps}
                          onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                          placeholder="Optionnel"
                        />
                      </Field>
                      <Field>
                        <Label htmlFor="rest-time">Temps de repos (secondes)</Label>
                        <Input
                          id="rest-time"
                          type="number"
                          value={newExercise.restTime}
                          onChange={(e) => setNewExercise({ ...newExercise, restTime: e.target.value })}
                          placeholder="Optionnel"
                        />
                      </Field>
                      <Field>
                        <Label htmlFor="weight">Default Weight (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.5"
                          value={newExercise.defaultWeight}
                          onChange={(e) => setNewExercise({ ...newExercise, defaultWeight: e.target.value })}
                          placeholder="Optionnel"
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Vidéo (optionnel)</h3>
                    <Field>
                      <input
                        ref={createVideoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileSelect}
                        className="hidden"
                        id="create-video-upload"
                      />
                      <Card className="border-2 border-dashed hover:border-primary transition-colors bg-muted/30">
                        <CardContent className="p-4">
                          <label
                            htmlFor="create-video-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {selectedVideoFile ? selectedVideoFile.name : "Cliquez pour ajouter une vidéo (MP4, MOV, WEBM, max 100 Mo)"}
                            </span>
                          </label>
                          {selectedVideoFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => {
                                setSelectedVideoFile(null)
                                if (createVideoInputRef.current) createVideoInputRef.current.value = ""
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Retirer la vidéo
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Field>
                  </div>
                </div>
              </FieldGroup>
            </div>
            {creatingExercise && (
              <div className="px-6 pb-2 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{selectedVideoFile ? "Création et envoi de la vidéo…" : "Création…"}</span>
                  {selectedVideoFile && uploadProgress > 0 && <span>{uploadProgress}%</span>}
                </div>
                {(selectedVideoFile && uploadProgress > 0) && (
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-[width] duration-200 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" disabled={creatingExercise}>{fr.buttons.cancel}</Button>
              </DialogClose>
              <Button
                onClick={handleCreateExercise}
                type="button"
                disabled={creatingExercise}
              >
                {creatingExercise ? (
                  <>Création…</>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {fr.buttons.createExercise}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                onClick={handleDeleteSelected}
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
                        onClick={() => handleDeleteOne(exercise._id)}
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

      {/* Edit Exercise Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{fr.buttons.editExercise}</DialogTitle>
            <DialogDescription>
              Modifiez l&apos;exercice ci-dessous. Cliquez sur Enregistrer quand vous avez terminé.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-white dark:bg-[#121212]">
            <FieldGroup>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Basic Information</h3>
                  <div className="space-y-4">
                    <Field>
                      <Label htmlFor="edit-exercise-name">Nom de l'exercice *</Label>
                      <Input
                        id="edit-exercise-name"
                        value={newExercise.name}
                        onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                        placeholder="e.g., Bench Press"
                      />
                    </Field>
                    <Field>
                      <Label>Muscle Group *</Label>
                      <Select
                        value={newExercise.muscleGroup || undefined}
                        onValueChange={(value) => setNewExercise({ ...newExercise, muscleGroup: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select muscle group" />
                        </SelectTrigger>
                        <SelectContent>
                          {muscleGroups.map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label htmlFor="edit-description">Description</Label>
                      <Input
                        id="edit-description"
                        value={newExercise.description}
                        onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                        placeholder="Description optionnelle"
                      />
                    </Field>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Exercise Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                        <Label htmlFor="edit-sets">Séries par défaut</Label>
                      <Input
                        id="edit-sets"
                        type="number"
                        value={newExercise.sets}
                        onChange={(e) => setNewExercise({ ...newExercise, sets: e.target.value })}
                        placeholder="Optionnel"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="edit-reps">Default Reps</Label>
                      <Input
                        id="edit-reps"
                        type="number"
                        value={newExercise.reps}
                        onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                        placeholder="Optionnel"
                      />
                    </Field>
                    <Field>
                        <Label htmlFor="edit-rest-time">Temps de repos (secondes)</Label>
                      <Input
                        id="edit-rest-time"
                        type="number"
                        value={newExercise.restTime}
                        onChange={(e) => setNewExercise({ ...newExercise, restTime: e.target.value })}
                        placeholder="Optionnel"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="edit-weight">Default Weight (kg)</Label>
                      <Input
                        id="edit-weight"
                        type="number"
                        step="0.5"
                        value={newExercise.defaultWeight}
                        onChange={(e) => setNewExercise({ ...newExercise, defaultWeight: e.target.value })}
                        placeholder="Optionnel"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </FieldGroup>
          </div>
            <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{fr.buttons.cancel}</Button>
            </DialogClose>
            <Button onClick={handleUpdateExercise} type="button">
              <Edit className="h-4 w-4 mr-2" />
              {fr.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vidéo de l'exercice</DialogTitle>
            <DialogDescription>
              Envoyez un fichier vidéo ou collez une URL pour {selectedExercise?.name || "cet exercice"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-white dark:bg-[#121212]">
            <FieldGroup>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Téléverser</h3>
                  <Field>
                    <Card className="border-2 border-dashed hover:border-primary transition-colors bg-white dark:bg-[#121212]">
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
                          <div className="rounded-full bg-white dark:bg-[#121212] p-3 border border-border">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {selectedVideoFile ? selectedVideoFile.name : "Click to upload or drag and drop"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              MP4, MOV, AVI, WEBM (Max 100MB)
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
                            Remove file
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
                      <div className="relative bg-white dark:bg-[#121212] rounded-lg overflow-hidden aspect-video border border-border">
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
              </div>
            </FieldGroup>
          </div>
          {uploadingVideo && (
            <div className="px-6 pb-2 space-y-1">
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={uploadingVideo}>{fr.buttons.cancel}</Button>
            </DialogClose>
            <Button
              onClick={handleUploadVideo}
              disabled={uploadingVideo || !selectedVideoFile}
              type="button"
            >
              {uploadingVideo ? (
                <>Envoi en cours…</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedExercise?.videoUrl ? "Mettre à jour la vidéo" : "Envoyer la vidéo"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={showVideoPlayer} onOpenChange={setShowVideoPlayer}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lecteur vidéo</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 bg-white dark:bg-[#121212]">
            {selectedVideoUrl && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                <video
                  src={selectedVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
