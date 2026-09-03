"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { fr as dateFnsFr } from "date-fns/locale"
import { BadgeCheck, Ban, ChevronLeft, ChevronRight, CircleUserRound, Edit3, Eye, KeyRound, Loader2, Mail, MoreHorizontal, Phone, Plus, RefreshCw, ShieldCheck, ShoppingBag, Trash2, UserCheck, Users } from "lucide-react"
import { api } from "@/lib/api"
import { getMediaBaseUrl } from "@/lib/apiBaseUrl"
import { cn } from "@/lib/utils"
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchInput } from "@/components/ui/SearchInput"
import { useToast } from "@/components/ui/toast"
import { ConfirmModal } from "@/components/shared/ConfirmModal"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const PAGE_SIZE = 20
const LEVEL_OPTIONS = ["Intiate", "Fighter", "Warrior", "Champion", "Elite"] as const
const ROLE_OPTIONS = ["user", "employee", "coach", "nutritionist", "admin"] as const
type UserRole = (typeof ROLE_OPTIONS)[number]
type UserLevel = (typeof LEVEL_OPTIONS)[number]
type UserRow = { _id: string; name?: string; email?: string; phone?: string; photoUri?: string; level?: UserLevel; role?: UserRole; isActive?: boolean; orderCount?: number; sexe?: "M" | "F"; age?: string; createdAt?: string; updatedAt?: string; newPassword?: string }
type Summary = { total: number; active: number; disabled: number; roleDistribution: Array<{ role: string; count: number }>; levelDistribution: Array<{ level: string; count: number }> }

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", level: "Intiate" as UserLevel, role: "user" as UserRole }
const ROLE_LABELS: Record<UserRole, string> = { user: "Client", employee: "Employé", coach: "Coach", nutritionist: "Nutritionniste", admin: "Administrateur" }
const LEVEL_STYLES: Record<UserLevel, string> = {
  Intiate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Fighter: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Warrior: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  Champion: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Elite: "bg-primary/10 text-primary",
}

function initials(user: UserRow) {
  if (user.name?.trim()) return user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
  return (user.email?.[0] || user.phone?.[0] || "U").toUpperCase()
}
function avatarUrl(value?: string) {
  if (!value) return null
  if (/^(https?:|data:)/.test(value)) return value
  return `${getMediaBaseUrl()}${value.startsWith("/") ? "" : "/"}${value}`
}
function UserAvatar({ user, size = "md" }: { user: UserRow; size?: "md" | "lg" }) {
  const [failed, setFailed] = useState(false)
  const src = avatarUrl(user.photoUri)
  return <div className={cn("relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/50 text-primary-foreground shadow-sm ring-1 ring-black/5", size === "lg" ? "h-16 w-16" : "h-11 w-11")}>
    <span className={cn("absolute inset-0 grid place-items-center font-bold", size === "lg" ? "text-xl" : "text-sm")}>{initials(user)}</span>
    {src && !failed ? <img src={src} alt={`Photo de ${user.name || "l’utilisateur"}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} /> : null}
  </div>
}
function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: typeof Users; label: string; value: number; detail: string; tone: "primary" | "green" | "red" | "violet" }) {
  const tones = { primary: "bg-primary/10 text-primary", green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", red: "bg-red-500/10 text-red-600 dark:text-red-400", violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400" }
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value.toLocaleString("fr-FR")}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}><Icon className="h-5 w-5" aria-hidden="true" /></div></div></div>
}

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { query, setQuery, effectiveQuery, isDebouncing } = useDebouncedSearch({ debounceMs: 350, minLength: 1 })
  const abortRef = useRef<AbortController | null>(null)
  const hasLoadedOnce = useRef(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, disabled: 0, roleDistribution: [], levelDistribution: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [roleFilter, setRoleFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [detailUser, setDetailUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)

  const load = useCallback(async (manual = false) => {
    abortRef.current?.abort(); abortRef.current = new AbortController(); const signal = abortRef.current.signal
    if (manual) setRefreshing(true); else if (!hasLoadedOnce.current) setLoading(true)
    try {
      const data = await api.getUsers({ page, limit: PAGE_SIZE, search: effectiveQuery || undefined, role: roleFilter === "all" ? undefined : roleFilter, level: levelFilter === "all" ? undefined : levelFilter, status: statusFilter === "all" ? undefined : statusFilter }, { signal })
      if (signal.aborted) return
      hasLoadedOnce.current = true; setUsers(data.users || []); setSummary(data.summary || { total: data.pagination?.total || 0, active: 0, disabled: 0, roleDistribution: [], levelDistribution: [] }); setTotal(data.pagination?.total || 0); setPages(Math.max(1, data.pagination?.pages || 1))
    } catch (error: any) {
      if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") return
      toast(error.response?.data?.message || "Impossible de charger les utilisateurs. Réessayez.", "error")
    } finally { if (!signal.aborted) { setLoading(false); setRefreshing(false) } }
  }, [effectiveQuery, levelFilter, page, roleFilter, statusFilter, toast])
  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [effectiveQuery, roleFilter, levelFilter, statusFilter])
  useEffect(() => () => abortRef.current?.abort(), [])
  const staffCount = useMemo(() => summary.roleDistribution.filter((item) => item.role !== "user").reduce((sum, item) => sum + item.count, 0), [summary.roleDistribution])
  const validateIdentity = (email?: string, phone?: string) => { if (!email?.trim() && !phone?.trim()) { toast("Renseignez un email ou un numéro de téléphone.", "error"); return false } return true }

  const handleCreate = async () => {
    if (!validateIdentity(form.email, form.phone)) return
    if (form.password.length < 6) { toast("Le mot de passe doit contenir au moins 6 caractères.", "error"); return }
    setSaving(true)
    try {
      const result = await api.createUser({ name: form.name.trim() || undefined, email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, password: form.password, level: form.level })
      if (form.role !== "user" && result.user?._id) await api.updateUserRole(result.user._id, form.role)
      toast("Le compte a été créé.", "success"); setCreateOpen(false); setForm(EMPTY_FORM); await load(true)
    } catch (error: any) { toast(error.response?.data?.message || "La création du compte a échoué.", "error") } finally { setSaving(false) }
  }
  const handleUpdate = async () => {
    if (!editUser || !validateIdentity(editUser.email, editUser.phone)) return
    if (editUser.newPassword && editUser.newPassword.length < 6) { toast("Le nouveau mot de passe doit contenir au moins 6 caractères.", "error"); return }
    setSaving(true)
    try {
      await api.updateUser(editUser._id, { name: editUser.name?.trim() || undefined, email: editUser.email?.trim() || undefined, phone: editUser.phone?.trim() || undefined, level: editUser.level || "Intiate", password: editUser.newPassword || undefined })
      if (editUser.role) await api.updateUserRole(editUser._id, editUser.role)
      toast("Les modifications ont été enregistrées.", "success"); setEditUser(null); await load(true)
    } catch (error: any) { toast(error.response?.data?.message || "La mise à jour a échoué.", "error") } finally { setSaving(false) }
  }
  const handleStatus = async (user: UserRow) => {
    const next = user.isActive === false; setStatusBusyId(user._id)
    try {
      await api.updateUserStatus(user._id, next)
      setUsers((current) => current.map((item) => item._id === user._id ? { ...item, isActive: next } : item))
      setSummary((current) => ({ ...current, active: current.active + (next ? 1 : -1), disabled: current.disabled + (next ? -1 : 1) }))
      toast(next ? "Compte réactivé." : "Compte désactivé.", "success")
    } catch (error: any) { toast(error.response?.data?.message || "Le statut n’a pas pu être modifié.", "error") } finally { setStatusBusyId(null) }
  }
  const handleDelete = async () => {
    if (!deleteUser) return; setDeleting(true)
    try { await api.deleteUser(deleteUser._id); toast("L’utilisateur a été supprimé.", "success"); setDeleteUser(null); await load(true) } catch (error: any) { toast(error.response?.data?.message || "La suppression a échoué.", "error") } finally { setDeleting(false) }
  }
  const clearFilters = () => { setQuery(""); setRoleFilter("all"); setLevelFilter("all"); setStatusFilter("all") }
  const openEdit = (user: UserRow) => setEditUser({ ...user, level: user.level || "Intiate", role: user.role || "user", newPassword: "" })
  const userActions = (user: UserRow) => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Actions pour ${user.name || "cet utilisateur"}`}><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuItem onClick={() => setDetailUser(user)}><Eye className="h-4 w-4" />Voir les informations</DropdownMenuItem><DropdownMenuItem onClick={() => openEdit(user)}><Edit3 className="h-4 w-4" />Modifier le compte</DropdownMenuItem>{user.role === "user" && <DropdownMenuItem onClick={() => router.push(`/admin/clients/${user._id}`)}><CircleUserRound className="h-4 w-4" />Ouvrir le dossier client</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleStatus(user)} disabled={statusBusyId === user._id}>{user.isActive === false ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{user.isActive === false ? "Réactiver le compte" : "Désactiver le compte"}</DropdownMenuItem><DropdownMenuItem onClick={() => setDeleteUser(user)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />Supprimer définitivement</DropdownMenuItem></DropdownMenuContent></DropdownMenu>

  return <div className="mx-auto w-full max-w-[1600px] space-y-6 animate-fade-in">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="h-4 w-4" />Administration des accès</div><h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Utilisateurs</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">Gérez les comptes, les rôles, les niveaux et les accès depuis un espace unique.</p></div><Button onClick={() => setCreateOpen(true)} className="h-11 gap-2 px-5 shadow-sm"><Plus className="h-4 w-4" />Nouvel utilisateur</Button></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Résumé des utilisateurs"><MetricCard icon={Users} label="Tous les comptes" value={summary.total} detail="Base utilisateurs complète" tone="primary" /><MetricCard icon={BadgeCheck} label="Comptes actifs" value={summary.active} detail="Accès à la plateforme" tone="green" /><MetricCard icon={Ban} label="Comptes désactivés" value={summary.disabled} detail="Accès temporairement bloqué" tone="red" /><MetricCard icon={ShieldCheck} label="Équipe interne" value={staffCount} detail="Admin, coach et équipe" tone="violet" /></section>
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-4 sm:p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput placeholder="Rechercher par nom, email ou téléphone…" value={query} onChange={setQuery} isLoading={isDebouncing || refreshing} /></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex"><FilterSelect id="role-filter" value={roleFilter} onChange={setRoleFilter} label="Filtrer par rôle"><option value="all">Tous les rôles</option>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</FilterSelect><FilterSelect id="level-filter" value={levelFilter} onChange={setLevelFilter} label="Filtrer par niveau"><option value="all">Tous les niveaux</option>{LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{level === "Intiate" ? "Initiate" : level}</option>)}</FilterSelect><FilterSelect id="status-filter" value={statusFilter} onChange={setStatusFilter} label="Filtrer par statut"><option value="all">Tous les statuts</option><option value="active">Actifs</option><option value="disabled">Désactivés</option></FilterSelect></div><Button variant="outline" size="icon" onClick={() => load(true)} disabled={refreshing} className="h-10 w-10 shrink-0" aria-label="Actualiser la liste"><RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /></Button></div></div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5"><p className="text-sm font-semibold">{total.toLocaleString("fr-FR")} résultat{total !== 1 ? "s" : ""}</p><p className="text-xs text-muted-foreground">Page {page} sur {pages}</p></div>
      {loading ? <div className="space-y-3 p-4" aria-label="Chargement des utilisateurs">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div> : users.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted"><Users className="h-6 w-6 text-muted-foreground" /></div><h2 className="mt-4 text-lg font-semibold">Aucun utilisateur trouvé</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">Modifiez vos filtres ou votre recherche pour retrouver un compte.</p><Button variant="outline" onClick={clearFilters} className="mt-5">Réinitialiser les filtres</Button></div> : <UserList users={users} setDetailUser={setDetailUser} actions={userActions} />}
      <div className="flex items-center justify-between border-t border-border p-4"><p className="hidden text-xs text-muted-foreground sm:block">{total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total}` : "0 résultat"}</p><div className="ml-auto flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || refreshing} className="gap-1"><ChevronLeft className="h-4 w-4" />Précédent</Button><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page >= pages || refreshing} className="gap-1">Suivant<ChevronRight className="h-4 w-4" /></Button></div></div>
    </section>
    <UserFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} values={form} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onSubmit={handleCreate} saving={saving} />
    <UserFormDialog mode="edit" open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)} values={{ name: editUser?.name || "", email: editUser?.email || "", phone: editUser?.phone || "", password: editUser?.newPassword || "", level: editUser?.level || "Intiate", role: editUser?.role || "user" }} onChange={(key, value) => setEditUser((current) => current ? { ...current, [key === "password" ? "newPassword" : key]: value } : current)} onSubmit={handleUpdate} saving={saving} />
    <UserDetailDialog user={detailUser} onClose={() => setDetailUser(null)} onEdit={(user) => { openEdit(user); setDetailUser(null) }} />
    <ConfirmModal open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)} title="Supprimer définitivement cet utilisateur ?" description={`Le compte de ${deleteUser?.name || deleteUser?.email || "cet utilisateur"} sera supprimé. Cette action est irréversible.`} confirmLabel="Supprimer le compte" cancelLabel="Annuler" variant="destructive" loading={deleting} onConfirm={handleDelete} />
  </div>
}

function FilterSelect({ id, value, onChange, label, children }: { id: string; value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) { return <><label className="sr-only" htmlFor={id}>{label}</label><select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30">{children}</select></> }
function UserList({ users, setDetailUser, actions }: { users: UserRow[]; setDetailUser: (user: UserRow) => void; actions: (user: UserRow) => React.ReactNode }) {
  return <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[920px]"><thead><tr className="border-b border-border bg-muted/35 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"><th className="px-5 py-3">Utilisateur</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3">Niveau</th><th className="px-4 py-3">Commandes</th><th className="px-4 py-3">Statut</th><th className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-border/70">{users.map((user) => <tr key={user._id} className="group transition-colors hover:bg-muted/30"><td className="px-5 py-3.5"><button onClick={() => setDetailUser(user)} className="flex items-center gap-3 text-left focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><UserAvatar user={user} /><span className="min-w-0"><span className="block max-w-56 truncate text-sm font-semibold">{user.name || "Utilisateur sans nom"}</span><span className="mt-0.5 block text-xs text-muted-foreground">Inscrit {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: dateFnsFr }) : "—"}</span></span></button></td><td className="px-4 py-3.5"><div className="space-y-1 text-sm"><p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="max-w-52 truncate">{user.email || "—"}</span></p>{user.phone && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" />{user.phone}</p>}</div></td><td className="px-4 py-3.5"><RolePill role={user.role} /></td><td className="px-4 py-3.5"><LevelPill level={user.level} /></td><td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 text-sm tabular-nums"><ShoppingBag className="h-4 w-4 text-muted-foreground" />{user.orderCount || 0}</span></td><td className="px-4 py-3.5"><StatusPill active={user.isActive !== false} /></td><td className="px-5 py-3.5 text-right">{actions(user)}</td></tr>)}</tbody></table></div><div className="divide-y divide-border md:hidden">{users.map((user) => <article key={user._id} className="p-4"><div className="flex items-start gap-3"><UserAvatar user={user} /><button onClick={() => setDetailUser(user)} className="min-w-0 flex-1 text-left"><h2 className="truncate text-sm font-semibold">{user.name || "Utilisateur sans nom"}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email || user.phone || "Aucun contact"}</p></button>{actions(user)}</div><div className="mt-3 flex flex-wrap items-center gap-2 pl-14"><RolePill role={user.role} /><LevelPill level={user.level} /><StatusPill active={user.isActive !== false} /></div></article>)}</div></>
}
function RolePill({ role = "user" }: { role?: UserRole }) { return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{ROLE_LABELS[role]}</span> }
function LevelPill({ level = "Intiate" }: { level?: UserLevel }) { return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", LEVEL_STYLES[level])}>{level === "Intiate" ? "Initiate" : level}</span> }
function StatusPill({ active }: { active: boolean }) { return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400")}><span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-red-500")} />{active ? "Actif" : "Désactivé"}</span> }
function Detail({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Mail }) { return <div className="rounded-xl border border-border p-3"><dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</dt><dd className="mt-1.5 break-words text-sm font-semibold">{value}</dd></div> }
function UserDetailDialog({ user, onClose, onEdit }: { user: UserRow | null; onClose: () => void; onEdit: (user: UserRow) => void }) { return <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Fiche utilisateur</DialogTitle><DialogDescription>Informations principales et accès du compte.</DialogDescription></DialogHeader>{user && <DialogBody><div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/30 p-4"><UserAvatar user={user} size="lg" /><div className="min-w-0"><h3 className="truncate text-lg font-bold">{user.name || "Utilisateur sans nom"}</h3><p className="truncate text-sm text-muted-foreground">{user.email || user.phone || "Aucun contact"}</p><div className="mt-2 flex flex-wrap gap-2"><RolePill role={user.role} /><LevelPill level={user.level} /></div></div></div><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Detail label="Email" value={user.email || "Non renseigné"} icon={Mail} /><Detail label="Téléphone" value={user.phone || "Non renseigné"} icon={Phone} /><Detail label="Commandes" value={`${user.orderCount || 0}`} icon={ShoppingBag} /><Detail label="Création" value={user.createdAt ? format(new Date(user.createdAt), "dd MMMM yyyy", { locale: dateFnsFr }) : "Inconnue"} icon={UserCheck} /></dl></DialogBody>}<DialogFooter><Button variant="outline" onClick={onClose}>Fermer</Button><Button onClick={() => user && onEdit(user)} className="gap-2"><Edit3 className="h-4 w-4" />Modifier</Button></DialogFooter></DialogContent></Dialog> }
function UserFormDialog({ mode, open, onOpenChange, values, onChange, onSubmit, saving }: { mode: "create" | "edit"; open: boolean; onOpenChange: (open: boolean) => void; values: typeof EMPTY_FORM; onChange: (key: keyof typeof EMPTY_FORM, value: string) => void; onSubmit: () => void; saving: boolean }) {
  const isCreate = mode === "create"
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isCreate ? "Créer un utilisateur" : "Modifier l’utilisateur"}</DialogTitle><DialogDescription>{isCreate ? "Créez un compte client ou un accès pour un membre de l’équipe." : "Mettez à jour l’identité, le rôle, le niveau ou le mot de passe."}</DialogDescription></DialogHeader><DialogBody className="space-y-5"><fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 flex items-center gap-2 text-sm font-semibold sm:col-span-2"><CircleUserRound className="h-4 w-4 text-primary" />Identité et contact</legend><div className="sm:col-span-2"><Label htmlFor={`${mode}-name`}>Nom complet</Label><Input id={`${mode}-name`} value={values.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Nom et prénom" className="mt-1.5 h-11" autoComplete="name" /></div><div><Label htmlFor={`${mode}-email`}>Email</Label><Input id={`${mode}-email`} type="email" value={values.email} onChange={(e) => onChange("email", e.target.value)} placeholder="nom@exemple.com" className="mt-1.5 h-11" autoComplete="email" /></div><div><Label htmlFor={`${mode}-phone`}>Téléphone</Label><Input id={`${mode}-phone`} type="tel" value={values.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+216 00 000 000" className="mt-1.5 h-11" autoComplete="tel" /></div></fieldset><fieldset className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2"><legend className="mb-3 flex items-center gap-2 text-sm font-semibold sm:col-span-2"><ShieldCheck className="h-4 w-4 text-primary" />Accès et classification</legend><div><Label htmlFor={`${mode}-role`}>Rôle</Label><select id={`${mode}-role`} value={values.role} onChange={(e) => onChange("role", e.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></div><div><Label htmlFor={`${mode}-level`}>Niveau</Label><select id={`${mode}-level`} value={values.level} onChange={(e) => onChange("level", e.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">{LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{level === "Intiate" ? "Initiate" : level}</option>)}</select></div><div className="sm:col-span-2"><Label htmlFor={`${mode}-password`}>{isCreate ? "Mot de passe *" : "Nouveau mot de passe"}</Label><div className="relative mt-1.5"><KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input id={`${mode}-password`} type="password" value={values.password} onChange={(e) => onChange("password", e.target.value)} placeholder={isCreate ? "6 caractères minimum" : "Laisser vide pour ne pas modifier"} className="h-11 pl-10" autoComplete="new-password" /></div></div></fieldset></DialogBody><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button><Button onClick={onSubmit} disabled={saving} className="min-w-32 gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Enregistrement…" : isCreate ? "Créer le compte" : "Enregistrer"}</Button></DialogFooter></DialogContent></Dialog>
}
