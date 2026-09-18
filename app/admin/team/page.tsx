"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { api } from "@/lib/api"
import { auth } from "@/lib/auth"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/SearchInput"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  ShieldCheck,
  Briefcase,
  UserPlus,
  MoreHorizontal,
  Edit3,
  KeyRound,
  Trash2,
  Mail,
  Phone,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Lock,
} from "lucide-react"
import { format } from "date-fns"
import { fr as dateFnsFr } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface TeamMember {
  _id: string
  name: string
  email?: string
  phone?: string
  role: "admin" | "employee"
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt?: string
}

interface TeamStats {
  total: number
  adminCount: number
  employeeCount: number
  activeCount: number
}

function generateRandomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*"
  let pass = ""
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}

export default function TeamAccessPage() {
  const { toast } = useToast()
  const currentUser = auth.getUser()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats>({
    total: 0,
    adminCount: 0,
    employeeCount: 0,
    activeCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "employee">("all")

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [passwordMember, setPasswordMember] = useState<TeamMember | null>(null)
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null)

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "employee" as "admin" | "employee",
  })
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "employee" as "admin" | "employee",
  })
  const [newPassword, setNewPassword] = useState("")
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load team data
  const loadMembers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const res = await api.getTeamMembers({
        search: searchQuery || undefined,
        role: roleFilter,
      })

      setMembers(res.members || [])
      if (res.stats) {
        setStats(res.stats)
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Impossible de charger la liste des membres", "error")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [searchQuery, roleFilter, toast])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // Handle Create Member
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim()) {
      toast("Le nom complet est obligatoire", "error")
      return
    }
    if (!createForm.email?.trim() && !createForm.phone?.trim()) {
      toast("Veuillez renseigner un email ou un numéro de téléphone", "error")
      return
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast("Le mot de passe doit comporter au moins 6 caractères", "error")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await api.createTeamMember(createForm)
      toast(res.message || "Le compte a été créé avec succès", "success")
      setIsCreateOpen(false)
      setCreateForm({ name: "", email: "", phone: "", password: "", role: "employee" })
      loadMembers(true)
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Échec de création du compte", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Member
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMember) return
    if (!editForm.name.trim()) {
      toast("Le nom complet ne peut pas être vide", "error")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await api.updateTeamMember(editMember._id, editForm)
      toast(res.message || "Les informations ont été enregistrées", "success")
      setEditMember(null)
      loadMembers(true)
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Échec de modification", "error")
    } finally {
      setIsSubmitting(false)
    }
  }


  // Handle Reset Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordMember) return
    if (!newPassword || newPassword.length < 6) {
      toast("Le mot de passe doit comporter au moins 6 caractères", "error")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await api.resetTeamMemberPassword(passwordMember._id, newPassword)
      toast(res.message || "Le mot de passe a été réinitialisé avec succès.", "success")
      setPasswordMember(null)
      setNewPassword("")
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Échec de réinitialisation", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Member
  const handleDeleteSubmit = async () => {
    if (!deleteMember) return
    const isSelf = Boolean(currentUser?._id && String(currentUser._id) === String(deleteMember._id))
    if (isSelf) {
      toast("Vous ne pouvez pas supprimer votre propre compte.", "error")
      setDeleteMember(null)
      return
    }

    if (deleteMember.role === "admin" && stats.adminCount <= 1) {
      toast("La plateforme doit conserver au moins un compte administrateur.", "error")
      setDeleteMember(null)
      return
    }

    try {
      setIsSubmitting(true)
      const res = await api.deleteTeamMember(deleteMember._id)
      toast(res.message || "Le compte a été supprimé définitivement.", "success")
      setDeleteMember(null)
      loadMembers(true)
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Échec de la suppression", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (member: TeamMember) => {
    setEditMember(member)
    setEditForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      role: member.role,
    })
  }

  const openPasswordDialog = (member: TeamMember) => {
    setPasswordMember(member)
    setNewPassword(generateRandomPassword())
    setPasswordCopied(false)
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword)
    setPasswordCopied(true)
    setTimeout(() => setPasswordCopied(false), 2000)
  }

  const openCreateDialog = () => {
    setCreateForm({
      name: "",
      email: "",
      phone: "",
      password: generateRandomPassword(),
      role: "employee",
    })
    setIsCreateOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Équipe & Accès</h1>
              <p className="text-sm text-muted-foreground">
                Gérez les administrateurs et employés autorisés sur le back-office DietTemple
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadMembers(true)}
            disabled={refreshing || loading}
            aria-label="Actualiser la liste"
            className="h-10 w-10 shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button onClick={openCreateDialog} className="gap-2 h-10 font-semibold btn-glow">
            <UserPlus className="h-4 w-4" />
            Ajouter un membre
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="card-hover border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total collaborateurs</p>
              <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums text-foreground">
                {stats.total}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Administrateurs</p>
              <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums text-primary">
                {stats.adminCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Employés (Boutique)</p>
              <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums text-secondary-foreground">
                {stats.employeeCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-secondary/80 text-secondary-foreground flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-border/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <SearchInput
                placeholder="Rechercher par nom, email ou téléphone…"
                value={searchQuery}
                onChange={setSearchQuery}
                isLoading={refreshing}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrer par rôle"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateurs</option>
                <option value="employee">Employés</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Chargement de l'équipe…</p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground p-6">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-7 w-7 opacity-60" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Aucun collaborateur trouvé</h3>
              <p className="text-sm max-w-sm mt-1">
                {searchQuery || roleFilter !== "all"
                  ? "Aucun membre ne correspond aux critères de recherche actuels."
                  : "Commencez par ajouter un administrateur ou un employé à la plateforme."}
              </p>
              {(searchQuery || roleFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setRoleFilter("all")
                  }}
                  className="mt-4"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Collaborateur</th>
                      <th className="px-4 py-3.5">Email / Téléphone</th>
                      <th className="px-4 py-3.5">Rôle</th>
                      <th className="px-4 py-3.5">Dernière connexion</th>
                      <th className="px-4 py-3.5">Créé le</th>
                      <th className="px-5 py-3.5 text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {members.map((member) => {
                      const isSelf = Boolean(currentUser?._id && String(currentUser._id) === String(member._id))
                      return (
                        <tr key={member._id} className="transition-colors hover:bg-muted/30">
                          {/* Nom + Avatar */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 border border-primary/20">
                                {member.name
                                  ? member.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")
                                      .toUpperCase()
                                  : "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate flex items-center gap-2">
                                  {member.name || "Utilisateur sans nom"}
                                  {isSelf && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                                      Vous
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  ID: {member._id.slice(-6)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Email / Téléphone */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              {member.email ? (
                                <p className="flex items-center gap-1.5 text-xs text-foreground">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[200px]">{member.email}</span>
                                </p>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              {member.phone && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span>{member.phone}</span>
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Rôle */}
                          <td className="px-4 py-4">
                            {member.role === "admin" ? (
                              <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 gap-1.5 font-semibold">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Administrateur
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1.5 font-semibold text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5" />
                                Employé
                              </Badge>
                            )}
                          </td>

                          {/* Dernière connexion */}
                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            {member.lastLogin ? (
                              <div className="flex items-center gap-1.5 text-foreground">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>
                                  {format(new Date(member.lastLogin), "dd MMM yyyy, HH:mm", {
                                    locale: dateFnsFr,
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="italic text-muted-foreground/80">Jamais connecté</span>
                            )}
                          </td>

                          {/* Date de création */}
                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            {member.createdAt
                              ? format(new Date(member.createdAt), "dd MMM yyyy", { locale: dateFnsFr })
                              : "—"}
                          </td>

                          {/* Actions ⋯ */}
                          <td className="px-5 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="Actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => openEditDialog(member)} className="gap-2">
                                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                                  Modifier le compte
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => openPasswordDialog(member)} className="gap-2">
                                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                                  Définir mot de passe
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => setDeleteMember(member)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                  disabled={isSelf}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer le compte
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="divide-y divide-border/70 md:hidden">
                {members.map((member) => {
                  const isSelf = Boolean(currentUser?._id && String(currentUser._id) === String(member._id))
                  return (
                    <div key={member._id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 border border-primary/20">
                            {member.name
                              ? member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              : "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              {member.name}
                              {isSelf && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                                  Vous
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.email || member.phone || "Sans contact"}</p>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(member)}>
                              <Edit3 className="h-4 w-4 mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordDialog(member)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteMember(member)} className="text-destructive" disabled={isSelf}>
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        {member.role === "admin" ? (
                          <Badge className="bg-primary/15 text-primary border-primary/30">Administrateur</Badge>
                        ) : (
                          <Badge variant="secondary">Employé</Badge>
                        )}
                        <span className="text-muted-foreground">
                          {member.lastLogin
                            ? `Connecté le ${format(new Date(member.lastLogin), "dd/MM/yyyy", { locale: dateFnsFr })}`
                            : "Jamais connecté"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* CREATE MEMBER DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Ajouter un membre à l'équipe
            </DialogTitle>
            <DialogDescription>
              Créez un compte administrateur ou employé pour autoriser l'accès au back-office.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Nom complet *</Label>
                <Input
                  id="create-name"
                  placeholder="Ex: Ahmed Ben Salah"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-email">Adresse email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="nom@diettemple.tn"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-phone">Téléphone</Label>
                  <Input
                    id="create-phone"
                    placeholder="+216 00 000 000"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="create-password">Mot de passe temporaire *</Label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: generateRandomPassword() })}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Générer aléatoirement
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="create-password"
                    type="text"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                    className="pr-10 font-mono text-sm"
                  />
                  <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Transmettez ce mot de passe au collaborateur pour sa première connexion.
                </p>
              </div>

              {/* Role Selection Cards */}
              <div className="space-y-2 pt-2">
                <Label>Rôle et permissions *</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className={cn(
                      "flex flex-col gap-1 p-3.5 rounded-xl border cursor-pointer transition-all",
                      createForm.role === "admin"
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Administrateur
                      </div>
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={createForm.role === "admin"}
                        onChange={() => setCreateForm({ ...createForm, role: "admin" })}
                        className="accent-primary"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Accès total à tous les modules (Clients, Plans, Séances, Boutique, Équipe, etc.)
                    </p>
                  </label>

                  <label
                    className={cn(
                      "flex flex-col gap-1 p-3.5 rounded-xl border cursor-pointer transition-all",
                      createForm.role === "employee"
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                        <Briefcase className="h-4 w-4 text-secondary-foreground" />
                        Employé
                      </div>
                      <input
                        type="radio"
                        name="role"
                        value="employee"
                        checked={createForm.role === "employee"}
                        onChange={() => setCreateForm({ ...createForm, role: "employee" })}
                        className="accent-primary"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Accès strictement limité à la gestion des <strong>Produits</strong> et <strong>Commandes</strong>.
                    </p>
                  </label>
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-32 font-semibold btn-glow">
                {isSubmitting ? "Création…" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MEMBER DIALOG */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Modifier le compte
            </DialogTitle>
            <DialogDescription>
              Mettez à jour les informations et permissions de {editMember?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Nom complet *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Téléphone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2 pt-2">
                <Label>Rôle</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className={cn(
                      "flex flex-col gap-1 p-3.5 rounded-xl border cursor-pointer transition-all",
                      editForm.role === "admin"
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-primary" /> Administrateur
                      </span>
                      <input
                        type="radio"
                        name="edit-role"
                        value="admin"
                        checked={editForm.role === "admin"}
                        onChange={() => setEditForm({ ...editForm, role: "admin" })}
                        className="accent-primary"
                      />
                    </div>
                  </label>

                  <label
                    className={cn(
                      "flex flex-col gap-1 p-3.5 rounded-xl border cursor-pointer transition-all",
                      editForm.role === "employee"
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" /> Employé
                      </span>
                      <input
                        type="radio"
                        name="edit-role"
                        value="employee"
                        checked={editForm.role === "employee"}
                        onChange={() => setEditForm({ ...editForm, role: "employee" })}
                        className="accent-primary"
                      />
                    </div>
                  </label>
                </div>
                {editMember?.role === "admin" && editForm.role === "employee" && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Ce membre n'aura plus accès aux fonctions d'administration avancées.
                  </p>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMember(null)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-32 font-semibold">
                {isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={!!passwordMember} onOpenChange={(open) => !open && setPasswordMember(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Définir un mot de passe temporaire
            </DialogTitle>
            <DialogDescription>
              Modifiez le mot de passe de {passwordMember?.name}. Ses sessions actives seront immédiatement invalidées.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temp-password">Nouveau mot de passe</Label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Régénérer
                  </button>
                </div>
                <div className="relative flex items-center gap-2">
                  <Input
                    id="temp-password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    title="Copier le mot de passe"
                    className="h-10 w-10 shrink-0"
                  >
                    {passwordCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordCopied && (
                  <p className="text-xs text-emerald-500 font-medium animate-fade-in">
                    Copié dans le presse-papiers !
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Transmettez ce mot de passe au collaborateur. Il sera requis lors de sa prochaine connexion.
                </span>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordMember(null)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-32 font-semibold">
                {isSubmitting ? "Mise à jour…" : "Appliquer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteMember} onOpenChange={(open) => !open && setDeleteMember(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Supprimer le compte
            </DialogTitle>
            <DialogDescription>
              Êtes-vous certain de vouloir supprimer définitivement le compte de <strong>{deleteMember?.name}</strong> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMember(null)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
