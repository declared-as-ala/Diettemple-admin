"use client"

import { useState, useEffect, useRef } from "react"
import { api } from "@/lib/api"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"

type GenderConfig = {
  gender: string
  title: string
  description: string
  videoUrl: string
  isActive: boolean
}

const GENDERS: { key: "homme" | "femme"; label: string; gradient: string; emoji: string }[] = [
  { key: "homme", label: "Homme", gradient: "from-blue-950 to-slate-900 border-blue-800", emoji: "♂" },
  { key: "femme", label: "Femme", gradient: "from-rose-950 to-slate-900 border-rose-800", emoji: "♀" },
]

export default function LandingVideosPage() {
  const [configs, setConfigs] = useState<Record<string, GenderConfig>>({
    homme: { gender: "homme", title: "", description: "", videoUrl: "", isActive: true },
    femme: { gender: "femme", title: "", description: "", videoUrl: "", isActive: true },
  })
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState<Record<string, boolean>>({})
  const [uploading,      setUploading]      = useState<Record<string, boolean>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [success,        setSuccess]        = useState<Record<string, string>>({})
  const [error,          setError]          = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const apiBase = getApiBaseUrl().replace(/\/api$/, "")

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getLandingVideos()
      const map: Record<string, GenderConfig> = {
        homme: { gender: "homme", title: "", description: "", videoUrl: "", isActive: true },
        femme: { gender: "femme", title: "", description: "", videoUrl: "", isActive: true },
      }
      for (const v of data.videos) map[v.gender] = v
      setConfigs(map)
    } catch {
      setError({ global: "Impossible de charger les vidéos." })
    } finally {
      setLoading(false)
    }
  }

  function update(gender: "homme" | "femme", field: keyof GenderConfig, value: string | boolean) {
    setConfigs(prev => ({ ...prev, [gender]: { ...prev[gender], [field]: value } }))
  }

  function flash(gender: string, type: "success" | "error", msg: string) {
    if (type === "success") {
      setSuccess(p => ({ ...p, [gender]: msg }))
      setTimeout(() => setSuccess(p => ({ ...p, [gender]: "" })), 4000)
    } else {
      setError(p => ({ ...p, [gender]: msg }))
    }
  }

  async function save(gender: "homme" | "femme") {
    setSaving(p => ({ ...p, [gender]: true }))
    setError(p => ({ ...p, [gender]: "" }))
    try {
      const cfg = configs[gender]
      await api.upsertLandingVideo(gender, {
        title: cfg.title,
        description: cfg.description,
        isActive: cfg.isActive,
        videoUrl: cfg.videoUrl, // preserve existing URL
      })
      flash(gender, "success", "Informations sauvegardées.")
    } catch {
      flash(gender, "error", "Erreur lors de la sauvegarde.")
    } finally {
      setSaving(p => ({ ...p, [gender]: false }))
    }
  }

  async function handleUpload(gender: "homme" | "femme", file: File) {
    setUploading(p => ({ ...p, [gender]: true }))
    setUploadProgress(p => ({ ...p, [gender]: 0 }))
    setError(p => ({ ...p, [gender]: "" }))
    setSuccess(p => ({ ...p, [gender]: "" }))
    try {
      const result = await api.uploadLandingVideo(gender, file, pct => {
        setUploadProgress(p => ({ ...p, [gender]: pct }))
      })
      setConfigs(prev => ({ ...prev, [gender]: { ...prev[gender], videoUrl: result.videoUrl } }))
      flash(gender, "success", "Vidéo uploadée avec succès ✓")
    } catch {
      flash(gender, "error", "Échec de l'upload. Réessayez.")
    } finally {
      setUploading(p => ({ ...p, [gender]: false }))
      setUploadProgress(p => ({ ...p, [gender]: 0 }))
    }
  }

  function resolveVideoUrl(url: string) {
    if (!url) return ""
    if (url.startsWith("http")) return url
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vidéos Landing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uploadez la vidéo d'introduction pour chaque programme (Homme / Femme).
        </p>
      </div>

      {error.global && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
          {error.global}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {GENDERS.map(({ key, label, gradient, emoji }) => {
          const cfg        = configs[key]
          const videoUrl   = resolveVideoUrl(cfg.videoUrl)
          const isUploading = uploading[key]
          const progress   = uploadProgress[key] ?? 0

          return (
            <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">

              {/* Card header */}
              <div className={`bg-gradient-to-br ${gradient} border-b border-border p-5`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{emoji}</span>
                  <div>
                    <h2 className="text-lg font-bold text-white">{label}</h2>
                    <p className="text-xs text-white/50 font-mono uppercase tracking-widest mt-0.5">
                      Vidéo d'introduction
                    </p>
                  </div>
                  {/* Active toggle */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-white/50">Actif</span>
                    <button
                      type="button"
                      onClick={() => update(key, "isActive", !cfg.isActive)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${cfg.isActive ? "bg-green-500" : "bg-white/20"}`}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${cfg.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-4 flex-1">

                {/* Video preview */}
                {videoUrl ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border">
                    <video
                      key={videoUrl}
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-video rounded-xl bg-muted/20 border-2 border-dashed border-border flex flex-col items-center justify-content-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    <div className="text-5xl pt-8">🎬</div>
                    <p className="text-sm text-muted-foreground pb-8">Aucune vidéo — cliquez pour uploader</p>
                  </div>
                )}

                {/* Upload zone */}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  ref={el => { fileRefs.current[key] = el }}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(key, file)
                    e.target.value = "" // reset so same file can be re-selected
                  }}
                />

                {isUploading ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">Upload en cours…</span>
                      <span className="font-mono font-bold text-primary">{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRefs.current[key]?.click()}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <span>📁</span>
                    {videoUrl ? "Remplacer la vidéo" : "Choisir une vidéo"}
                    <span className="text-xs font-normal opacity-60">(mp4, webm, mov)</span>
                  </button>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={cfg.title}
                    onChange={e => update(key, "title", e.target.value)}
                    placeholder={`Programme ${label} — DietTemple`}
                    className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={cfg.description}
                    onChange={e => update(key, "description", e.target.value)}
                    placeholder="Découvrez le programme conçu pour vous…"
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>

                {/* Feedback */}
                {success[key] && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-600 dark:text-green-400">
                    {success[key]}
                  </div>
                )}
                {error[key] && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    {error[key]}
                  </div>
                )}

                {/* Save title/description/active */}
                <button
                  type="button"
                  onClick={() => save(key)}
                  disabled={saving[key] || isUploading}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold rounded-xl transition-colors mt-auto"
                >
                  {saving[key] ? "Sauvegarde…" : "Sauvegarder"}
                </button>

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
