"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, RefreshCw, Save, Trash2, Upload } from "lucide-react"
import { api, type LevelHomeContentItem } from "@/lib/api"
import { getMediaBaseUrl } from "@/lib/apiBaseUrl"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LevelOption = {
  slug: string
  label: string
}

const LEVEL_OPTIONS: LevelOption[] = [
  { slug: "intiate", label: "Intiate" },
  { slug: "fighter", label: "Fighter" },
  { slug: "champion", label: "Champion" },
  { slug: "elite", label: "Elite" },
]

function videoSrcFromStoredPath(videoUrl: string): string | null {
  const u = videoUrl.trim()
  if (!u) return null
  if (u.startsWith("http://") || u.startsWith("https://")) return u
  const base = getMediaBaseUrl()
  return base + (u.startsWith("/") ? u : `/${u}`)
}

export default function LevelHomeContentPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [items, setItems] = useState<LevelHomeContentItem[]>([])
  const [selectedLevelSlug, setSelectedLevelSlug] = useState(LEVEL_OPTIONS[0].slug)

  const selectedItem = useMemo(
    () => items.find((item) => item.levelSlug === selectedLevelSlug) || null,
    [items, selectedLevelSlug]
  )

  const [title, setTitle] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [instructions, setInstructions] = useState("")
  const [isActive, setIsActive] = useState(true)

  const hydrateForm = (item: LevelHomeContentItem | null) => {
    setTitle(item?.title || "")
    setVideoUrl(item?.videoUrl || "")
    setInstructions(item?.instructions || "")
    setIsActive(item?.isActive ?? true)
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getLevelHomeContent()
      setItems(data.items || [])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur de chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    hydrateForm(selectedItem)
  }, [selectedItem])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await api.upsertLevelHomeContent(selectedLevelSlug, {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        instructions: instructions.trim(),
        isActive,
      })

      const updated = data.item
      setItems((prev) => {
        const found = prev.some((entry) => entry.levelSlug === updated.levelSlug)
        if (found) {
          return prev.map((entry) => (entry.levelSlug === updated.levelSlug ? updated : entry))
        }
        return [...prev, updated]
      })
      setVideoUrl(updated.videoUrl || "")
      toast("Contenu Home mis à jour", "success")
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur lors de l'enregistrement", "error")
    } finally {
      setSaving(false)
    }
  }

  const handlePickVideo = () => fileInputRef.current?.click()

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    setUploadPercent(0)
    try {
      const data = await api.uploadLevelHomeVideo(selectedLevelSlug, file, (pct) => setUploadPercent(pct))
      const updated = data.item
      setVideoUrl(updated.videoUrl || data.videoUrl || "")
      setItems((prev) => {
        const found = prev.some((entry) => entry.levelSlug === updated.levelSlug)
        if (found) {
          return prev.map((entry) => (entry.levelSlug === updated.levelSlug ? updated : entry))
        }
        return [...prev, updated]
      })
      toast("Vidéo téléversée", "success")
    } catch (err: unknown) {
      const ex = err as { response?: { data?: { message?: string } }; message?: string }
      toast(ex.response?.data?.message || ex.message || "Échec du téléversement", "error")
    } finally {
      setUploading(false)
      setUploadPercent(0)
    }
  }

  const handleRemoveVideo = async () => {
    setSaving(true)
    try {
      const data = await api.upsertLevelHomeContent(selectedLevelSlug, {
        title: title.trim(),
        videoUrl: "",
        instructions: instructions.trim(),
        isActive,
      })
      const updated = data.item
      setVideoUrl("")
      setItems((prev) => {
        const found = prev.some((entry) => entry.levelSlug === updated.levelSlug)
        if (found) {
          return prev.map((entry) => (entry.levelSlug === updated.levelSlug ? updated : entry))
        }
        return [...prev, updated]
      })
      toast("Vidéo supprimée", "success")
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur", "error")
    } finally {
      setSaving(false)
    }
  }

  const previewSrc = videoSrcFromStoredPath(videoUrl)

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contenu Home par niveau</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Téléversez une vidéo et rédigez les instructions affichées sur la Home mobile pour chaque niveau.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="level-select">Niveau</Label>
          <select
            id="level-select"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedLevelSlug}
            onChange={(e) => setSelectedLevelSlug(e.target.value)}
          >
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="home-title">Titre</Label>
          <Input
            id="home-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Objectif de la semaine"
          />
        </div>

        <div className="space-y-3">
          <Label>Vidéo</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={(e) => void handleVideoFile(e)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handlePickVideo} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {videoUrl ? "Remplacer la vidéo" : "Téléverser une vidéo"}
            </Button>
            {videoUrl ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveVideo()} disabled={saving || uploading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer la vidéo
              </Button>
            ) : null}
          </div>
          {uploading ? (
            <p className="text-xs text-muted-foreground">Téléversement… {uploadPercent}%</p>
          ) : null}
          {videoUrl ? (
            <p className="text-xs text-muted-foreground break-all">Fichier enregistré : {videoUrl}</p>
          ) : (
            <p className="text-xs text-muted-foreground">MP4 ou WebM recommandé (max. 300 Mo).</p>
          )}
          {previewSrc ? (
            <video key={previewSrc} className="mt-2 w-full max-w-lg rounded-md border border-border bg-black" controls src={previewSrc} />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="home-instructions">Instructions</Label>
          <Textarea
            id="home-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={7}
            placeholder="Conseils et instructions à afficher sur la Home mobile..."
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Section active</p>
            <p className="text-xs text-muted-foreground">Désactivez pour masquer ce contenu côté mobile.</p>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={saving || uploading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer titre & instructions
          </Button>
        </div>
      </div>
    </div>
  )
}
