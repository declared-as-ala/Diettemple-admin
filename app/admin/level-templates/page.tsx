"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CalendarDays,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react"

type LevelTemplateRow = {
  _id: string
  name?: string
  description?: string
  gender?: string
  isActive?: boolean
  weeks?: Array<{ days?: Record<string, unknown[]> }>
}

function countSessions(template: LevelTemplateRow): number {
  if (!template?.weeks?.length) return 0
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  return template.weeks.reduce((sum, w) => {
    const d = w.days || {}
    return sum + dayKeys.reduce((s, k) => s + (d[k]?.length || 0), 0)
  }, 0)
}

function countConfiguredWeeks(template: LevelTemplateRow): number {
  if (!template?.weeks?.length) return 0
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  return template.weeks.filter((w) => {
    const d = w.days || {}
    return dayKeys.some((k) => (d[k]?.length || 0) > 0)
  }).length
}

export default function LevelTemplatesPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [list, setList] = useState<LevelTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newGender, setNewGender] = useState<"M" | "F">("M")
  const [newDescription, setNewDescription] = useState("")

  const load = useCallback(async (searchQuery: string) => {
    setLoading(true)
    try {
      const q = searchQuery.trim()
      const data = await api.getLevelTemplates({ limit: 100, search: q || undefined })
      setList((data.levelTemplates || []) as LevelTemplateRow[])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur de chargement", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const t = setTimeout(() => {
      void load(search)
    }, 300)
    return () => clearTimeout(t)
  }, [search, load])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) {
      toast("Indiquez un nom de plan", "error")
      return
    }
    setCreating(true)
    try {
      const data = await api.createLevelTemplate({
        name,
        gender: newGender,
        description: newDescription.trim() || undefined,
      })
      const created = (data as { levelTemplate?: { _id: string } })?.levelTemplate
      toast("Plan créé", "success")
      setCreateOpen(false)
      setNewName("")
      setNewDescription("")
      setNewGender("M")
      if (created?._id) {
        router.push(`/admin/level-templates/${created._id}`)
      } else {
        await load("")
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Erreur lors de la création", "error")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez des plans (5 semaines), ajoutez des séances, puis affectez un plan à chaque client.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load(search)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un plan
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">{list.length} plan{list.length !== 1 ? "s" : ""}</p>
      </div>

      {loading && list.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Aucun plan</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Créez un plan puis ajoutez les séances sur les 5 semaines. Depuis la fiche client, vous pourrez affecter ce plan
            à l’abonnement.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const sessions = countSessions(t)
            const weeks = countConfiguredWeeks(t)
            const gender = t.gender === "F" ? "F" : "M"
            return (
              <div
                key={t._id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{t.name ?? "—"}</p>
                    {t.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={t.isActive !== false ? "default" : "secondary"} className="text-[10px]">
                      {t.isActive !== false ? "Actif" : "Inactif"}
                    </Badge>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium"
                      title={gender === "F" ? "Femme" : "Homme"}
                    >
                      {gender === "F" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {gender === "F" ? "F" : "M"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {weeks}/5 sem.
                  </span>
                  <span>{sessions} séance{sessions !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Link href={`/admin/level-templates/${t._id}`} className="flex-1">
                    <Button size="sm" className="w-full" variant="default">
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Planning
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Button>
                  </Link>
                  <Link href={`/admin/level-templates/${t._id}?tab=info`}>
                    <Button size="sm" variant="outline" title="Informations">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau plan</DialogTitle>
            <DialogDescription>
              Nom et genre (homme / femme) identifient le plan côté serveur. Vous pourrez ensuite remplir les 5 semaines.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nom du plan</Label>
              <Input
                id="plan-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex. Fighter printemps"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newGender === "M" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setNewGender("M")}
                  disabled={creating}
                >
                  <User className="h-4 w-4 mr-2" />
                  Homme
                </Button>
                <Button
                  type="button"
                  variant={newGender === "F" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setNewGender("F")}
                  disabled={creating}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Femme
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-desc">Description (optionnel)</Label>
              <Input
                id="plan-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Courte note pour l’équipe"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création…
                </>
              ) : (
                "Créer et ouvrir le planning"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
