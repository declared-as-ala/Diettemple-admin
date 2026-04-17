"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fr } from "@/lib/i18n/fr"
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/SearchInput"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import { Plus, Edit, Trash2 } from "lucide-react"
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
const LEVEL_OPTIONS = ["Intiate", "Fighter", "Champion", "Elite"] as const

export default function UsersPage() {
  const { toast } = useToast()
  const { query, setQuery, effectiveQuery, isDebouncing } = useDebouncedSearch()
  const abortRef = useRef<AbortController | null>(null)
  const hasLoadedOnce = useRef(false)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", level: "Intiate" as string })

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    const isSearchOrRefresh = hasLoadedOnce.current
    if (isSearchOrRefresh) setSearchLoading(true)
    else setLoading(true)
    try {
      const data = await api.getUsers(
        { page, limit: PAGE_SIZE, search: effectiveQuery || undefined },
        { signal }
      )
      if (signal.aborted) return
      hasLoadedOnce.current = true
      setUsers(data.users || [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return
      toast(err.response?.data?.message || err.message || "Erreur lors du chargement des utilisateurs", "error")
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        setSearchLoading(false)
      }
    }
  }, [page, effectiveQuery, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [effectiveQuery])

  const handleCreate = async () => {
    if (!form.email && !form.phone) {
      toast("Email ou téléphone requis", "error")
      return
    }
    if (!form.password || form.password.length < 6) {
      toast("Le mot de passe doit contenir au moins 6 caractères", "error")
      return
    }
    setSaving(true)
    try {
      await api.createUser({
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        level: form.level,
      })
      toast("Utilisateur créé", "success")
      setCreateOpen(false)
      setForm({ name: "", email: "", phone: "", password: "", level: "Intiate" })
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || fr.messages.errorCreating, "error")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editUser) return
    if (!editUser.email && !editUser.phone) {
      toast("Email ou téléphone requis", "error")
      return
    }
    setSaving(true)
    try {
      await api.updateUser(editUser._id, {
        name: editUser.name || undefined,
        email: editUser.email || undefined,
        phone: editUser.phone || undefined,
        level: editUser.level,
        password: editUser.newPassword || undefined,
      })
      toast("Utilisateur mis à jour", "success")
      setEditUser(null)
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de la mise à jour", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await api.deleteUser(id)
      toast("Utilisateur supprimé", "success")
      setDeleteId(null)
      load()
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de la suppression", "error")
    } finally {
      setDeleting(false)
    }
  }

  if (loading && users.length === 0) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{fr.pages.users}</h1>
          <p className="text-muted-foreground mt-1">{fr.pages.manageUsersAndLevels}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {fr.buttons.addUser}
        </Button>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="w-full max-w-md">
            <SearchInput
              placeholder={fr.pages.searchByNameEmailPhone}
              value={query}
              onChange={setQuery}
              isLoading={searchLoading || isDebouncing}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{total} utilisateur{total !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {fr.pages.noUserFound}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium">Nom</th>
                    <th className="text-left py-3 px-2 font-medium">Email / Téléphone</th>
                    <th className="text-left py-3 px-2 font-medium">Niveau</th>
                    <th className="text-right py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-border/50">
                      <td className="py-3 px-2 font-medium">{u.name || "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {u.email || u.phone || "—"}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{u.level || "Intiate"}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditUser({ ...u })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(u._id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr.pages.addUser}</DialogTitle>
            <DialogDescription>{fr.pages.addUserDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{fr.pages.name}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={fr.pages.optional} className="mt-1" />
            </div>
            <div>
              <Label>{fr.pages.email}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder={fr.pages.emailPlaceholder} className="mt-1" />
            </div>
            <div>
              <Label>{fr.pages.phone}</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={fr.pages.optional} className="mt-1" />
            </div>
            <div>
              <Label>{fr.pages.password} *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={fr.pages.minPassword} className="mt-1" />
            </div>
            <div>
              <Label>{fr.dashboard.level}</Label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 mt-1"
              >
                {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Création…" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>Modifiez les informations et le niveau.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Nom</Label>
                <Input value={editUser.name || ""} onChange={(e) => setEditUser((u: any) => ({ ...u, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editUser.email || ""} onChange={(e) => setEditUser((u: any) => ({ ...u, email: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={editUser.phone || ""} onChange={(e) => setEditUser((u: any) => ({ ...u, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Niveau</Label>
                <select
                  value={editUser.level || "Intiate"}
                  onChange={(e) => setEditUser((u: any) => ({ ...u, level: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 mt-1"
                >
                  {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label>{fr.pages.newPasswordOptional}</Label>
                <Input type="password" value={editUser.newPassword || ""} onChange={(e) => setEditUser((u: any) => ({ ...u, newPassword: e.target.value }))} placeholder={fr.pages.optional} className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditUser(null)}>{fr.buttons.cancel}</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? fr.status.savingShort : fr.buttons.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr.pages.deleteUser}</DialogTitle>
            <DialogDescription>{fr.deleteDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>{fr.buttons.cancel}</Button>
            <Button variant="destructive" disabled={deleting} onClick={() => deleteId && handleDelete(deleteId)}>
              {deleting ? fr.status.deleting : fr.deleteDialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
