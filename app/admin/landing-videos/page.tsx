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

const GENDERS: { key: "homme" | "femme"; label: string; color: string; emoji: string }[] = [
  { key: "homme", label: "Homme", color: "from-blue-950 to-blue-900 border-blue-700", emoji: "♂" },
  { key: "femme", label: "Femme", color: "from-rose-950 to-rose-900 border-rose-700", emoji: "♀" },
]

export default function LandingVideosPage() {
  const [configs, setConfigs] = useState<Record<string, GenderConfig>>({ homme: { gender: "homme", title: "", description: "", videoUrl: "", isActive: true }, femme: { gender: "femme", title: "", description: "", videoUrl: "", isActive: true } })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [success, setSuccess] = useState<Record<string, string>>({})
  const [error, setError] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const apiBase = getApiBaseUrl().replace(/\/api$/, "")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getLandingVideos()
      const map: Record<string, GenderConfig> = { homme: { gender: "homme", title: "", description: "", videoUrl: "", isActive: true }, femme: { gender: "femme", title: "", description: "", videoUrl: "", isActive: true } }
      for (const v of data.videos) {
        map[v.gender] = v
      }
      setConfigs(map)
    } catch {
      setError({ global: "Impossible de charger les vidéos." })
    } finally {
      setLoading(false)
    }
  }

  function update(gender: "homme" | "femme", field: keyof GenderConfig, value: string | boolean) {
    setConfigs((prev) => ({ ...prev, [gender]: { ...prev[gender], [field]: value } }))
  }

  async function save(gender: "homme" | "femme") {
    setSaving((p) => ({ ...p, [gender]: true }))
    setError((p) => ({ ...p, [gender]: "" }))
    setSuccess((p) => ({ ...p, [gender]: "" }))
    try {
      const cfg = configs[gender]
      await api.upsertLandingVideo(gender, { title: cfg.title, description: cfg.description, videoUrl: cfg.videoUrl, isActive: cfg.isActive })
      setSuccess((p) => ({ ...p, [gender]: "Sauvegardé avec succès." }))
      setTimeout(() => setSuccess((p) => ({ ...p, [gender]: "" })), 3000)
    } catch {
      setError((p) => ({ ...p, [gender]: "Erreur lors de la sauvegarde." }))
    } finally {
      setSaving((p) => ({ ...p, [gender]: false }))
    }
  }

  async function handleFileUpload(gender: "homme" | "femme", file: File) {
    setUploading((p) => ({ ...p, [gender]: true }))
    setUploadProgress((p) => ({ ...p, [gender]: 0 }))
    setError((p) => ({ ...p, [gender]: "" }))
    setSuccess((p) => ({ ...p, [gender]: "" }))
    try {
      const result = await api.uploadLandingVideo(gender, file, (pct) => {
        setUploadProgress((p) => ({ ...p, [gender]: pct }))
      })
      setConfigs((prev) => ({ ...prev, [gender]: { ...prev[gender], videoUrl: result.videoUrl } }))
      setSuccess((p) => ({ ...p, [gender]: `Vidéo uploadée : ${result.videoUrl}` }))
      setTimeout(() => setSuccess((p) => ({ ...p, [gender]: "" })), 5000)
    } catch {
      setError((p) => ({ ...p, [gender]: "Échec de l'upload vidéo." }))
    } finally {
      setUploading((p) => ({ ...p, [gender]: false }))
      setUploadProgress((p) => ({ ...p, [gender]: 0 }))
    }
  }

  function resolveVideoUrl(url: string) {
    if (!url) return ""
    if (url.startsWith("http")) return url
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`
  }

  function isYouTube(url: string) {
    return url.includes("youtube.com") || url.includes("youtu.be")
  }

  function youtubeEmbedUrl(url: string) {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    return match ? `https://www.youtube.com/embed/${match[1]}` : url
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vidéos Landing — Rejoindre</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les vidéos affichées sur la page Rejoindre lorsque l'utilisateur choisit son genre.
          </p>
        </div>
      </div>

      {error.global && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
          {error.global}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {GENDERS.map(({ key, label, color, emoji }) => {
          const cfg = configs[key]
          const videoUrl = resolveVideoUrl(cfg.videoUrl)
          const isYT = isYouTube(videoUrl)

          return (
            <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {/* Card header */}
              <div className={`bg-gradient-to-br ${color} border-b border-border p-5`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{emoji}</span>
                  <div>
                    <h2 className="text-lg font-bold text-white">{label}</h2>
                    <p className="text-xs text-white/60 font-mono uppercase tracking-widest">
                      Vidéo d'introduction · {key}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-white/60">Actif</span>
                      <div
                        className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${cfg.isActive ? "bg-green-500" : "bg-white/20"}`}
                        onClick={() => update(key, "isActive", !cfg.isActive)}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${cfg.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Video preview */}
                {videoUrl ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border">
                    {isYT ? (
                      <iframe
                        src={youtubeEmbedUrl(videoUrl)}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={videoUrl} controls className="w-full h-full object-contain" />
                    )}
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl bg-muted/30 border border-dashed border-border flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎬</div>
                      <p className="text-sm text-muted-foreground">Aucune vidéo configurée</p>
                    </div>
                  </div>
                )}

                {/* Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Titre
                    </label>
                    <input
                      type="text"
                      value={cfg.title}
                      onChange={(e) => update(key, "title", e.target.value)}
                      placeholder={`Programme ${label} — DietTemple`}
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={cfg.description}
                      onChange={(e) => update(key, "description", e.target.value)}
                      placeholder="Découvrez le programme conçu pour vous..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground placeholder:text-muted-foreground resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      URL Vidéo
                    </label>
                    <input
                      type="text"
                      value={cfg.videoUrl}
                      onChange={(e) => update(key, "videoUrl", e.target.value)}
                      placeholder="https://youtube.com/watch?v=... ou /videos/landing/..."
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-foreground placeholder:text-muted-foreground font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Accepte YouTube, Vimeo, ou une URL directe (.mp4 / .webm)
                    </p>
                  </div>
                </div>

                {/* Upload zone */}
                <div className="border border-dashed border-border rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Upload direct
                  </p>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    ref={(el) => { fileRefs.current[key] = el }}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(key, file)
                    }}
                  />

                  {uploading[key] ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Upload en cours...</span>
                        <span className="font-mono">{uploadProgress[key] ?? 0}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress[key] ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRefs.current[key]?.click()}
                      className="w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors border border-border"
                    >
                      📁 Choisir un fichier vidéo (mp4, webm)
                    </button>
                  )}
                </div>

                {/* Feedback */}
                {success[key] && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-600 dark:text-green-400">
                    ✓ {success[key]}
                  </div>
                )}
                {error[key] && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    ✗ {error[key]}
                  </div>
                )}

                {/* Save button */}
                <button
                  onClick={() => save(key)}
                  disabled={saving[key]}
                  className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold rounded-xl transition-colors"
                >
                  {saving[key] ? "Sauvegarde..." : `Sauvegarder · ${label}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview link */}
      <div className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-foreground">Page publique</p>
          <p className="text-xs text-muted-foreground mt-0.5">Aperçu de la page de choix de genre</p>
        </div>
        <a
          href="/api/landing/videos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline font-mono"
        >
          GET /api/landing/videos ↗
        </a>
      </div>
    </div>
  )
}
