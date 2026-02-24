"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fr } from "@/lib/i18n/fr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import { Plus, Search, Edit, Trash2, Layout } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

const PAGE_SIZE = 20
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
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
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        difficulty: difficulty || undefined,
      })
      setTemplates(data.sessionTemplates || [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || fr.messages.errorLoading, "error")
    } finally {
      setLoading(false)
    }
  }, [page, search, difficulty, toast])

  useEffect(() => {
    load()
  }, [load])

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

  if (loading && templates.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Séances</h1>
          <p className="text-muted-foreground mt-1">Créez des séances d'entraînement à partir des exercices.</p>
        </div>
        <Link href="/admin/session-templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Créer une séance
          </Button>
        </Link>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <select
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{total} séance{total !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No session templates yet. Create one to build workouts.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium">Titre</th>
                    <th className="text-left py-3 px-2 font-medium">Difficulté</th>
                    <th className="text-left py-3 px-2 font-medium">Durée</th>
                    <th className="text-left py-3 px-2 font-medium">Exercices</th>
                    <th className="text-right py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t._id} className="border-b border-border/50">
                      <td className="py-3 px-2 font-medium">{t.title}</td>
                      <td className="py-3 px-2">
                        {t.difficulty ? (
                          <Badge variant="secondary">{DIFFICULTY_LABELS[t.difficulty] ?? t.difficulty}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {t.durationMinutes != null ? `${t.durationMinutes} min` : "—"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{t.items?.length ?? 0}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/session-templates/${t._id}`}>
                            <Button variant="ghost" size="sm">
                              <Layout className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                          </Link>
                          <Link href={`/admin/session-templates/${t._id}`}>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(t._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la séance</DialogTitle>
            <DialogDescription>Cette action est irréversible.</DialogDescription>
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
