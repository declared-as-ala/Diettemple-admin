"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import {
  Plus, Search, Edit2, Trash2, Clock, Dumbbell, ChevronRight, LayoutGrid, Filter,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: "Débutant",       color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  intermediate: { label: "Intermédiaire",  color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/30" },
  advanced:     { label: "Avancé",         color: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/30" },
}

export default function SessionTemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSessionTemplates({
        page, limit: PAGE_SIZE,
        search: search || undefined,
        difficulty: difficulty || undefined,
      })
      setTemplates(data.sessionTemplates || [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur de chargement", "error")
    } finally {
      setLoading(false)
    }
  }, [page, search, difficulty, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await api.deleteSessionTemplate(id)
      toast("Séance supprimée", "success")
      setDeleteId(null)
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de la suppression", "error")
    } finally {
      setDeleting(false)
    }
  }

  if (loading && templates.length === 0) return <PageLoader />

  const pages = Math.ceil(total / PAGE_SIZE)
  const deleteTarget = templates.find(t => t._id === deleteId)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Séances d'entraînement</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} séance{total !== 1 ? "s" : ""} · Glissez-déposez des exercices pour composer vos séances
          </p>
        </div>
        <Link href="/admin/session-templates/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle séance
          </Button>
        </Link>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {["", "beginner", "intermediate", "advanced"].map((d) => {
            const cfg = d ? DIFFICULTY_CONFIG[d] : null
            return (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setPage(1) }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  difficulty === d
                    ? cfg ? `${cfg.bg} ${cfg.color} border-current` : "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {cfg?.label ?? "Tous"}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border border-dashed border-border text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-foreground">Aucune séance trouvée</p>
            <p className="text-sm text-muted-foreground mt-1">Créez votre première séance d'entraînement</p>
          </div>
          <Link href="/admin/session-templates/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Créer une séance
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => {
            const diff = t.difficulty ? DIFFICULTY_CONFIG[t.difficulty] : null
            const exerciseCount = t.items?.length ?? 0
            const muscleGroups: string[] = [...new Set(
              (t.items || []).map((i: any) => i.exerciseId?.muscleGroup).filter(Boolean)
            )].slice(0, 3) as string[]

            return (
              <div
                key={t._id}
                className="group relative flex flex-col rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
              >
                {/* Accent bar */}
                <div className={cn(
                  "h-1 w-full",
                  t.difficulty === "advanced" ? "bg-rose-500" :
                  t.difficulty === "intermediate" ? "bg-amber-500" :
                  t.difficulty === "beginner" ? "bg-emerald-500" : "bg-border"
                )} />

                <div className="flex flex-col flex-1 p-5 gap-3">
                  {/* Title + difficulty */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground leading-tight line-clamp-2 flex-1">{t.title}</h3>
                    {diff && (
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0", diff.bg, diff.color)}>
                        {diff.label}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5" />
                      {exerciseCount} exercice{exerciseCount !== 1 ? "s" : ""}
                    </span>
                    {t.durationMinutes != null && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {t.durationMinutes} min
                      </span>
                    )}
                  </div>

                  {/* Muscle groups */}
                  {muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {muscleGroups.map((mg) => (
                        <span key={mg} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          {mg}
                        </span>
                      ))}
                      {(t.items || []).filter((i: any) => i.exerciseId?.muscleGroup).length > 3 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          +{(t.items || []).filter((i: any) => i.exerciseId?.muscleGroup).length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
                    <Link href={`/admin/session-templates/${t._id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 group-hover:border-primary/40 group-hover:text-primary transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                        Modifier
                        <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(t._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground px-3">Page {page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            Suivant
          </Button>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la séance</DialogTitle>
            <DialogDescription>
              Supprimer <strong>«{deleteTarget?.title}»</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleting} onClick={() => deleteId && handleDelete(deleteId)}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
