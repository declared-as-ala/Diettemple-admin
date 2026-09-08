"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User, Activity, CreditCard, Flame,
  ShoppingBag, Loader2, Package, DollarSign, Clock,
  ChevronRight, ExternalLink, MessageSquare, Pencil,
  ShieldCheck, RefreshCw, Scale, Phone, Mail, MapPin,
  Calendar, CheckCircle2,
} from "lucide-react"
import type { ProfileData, ClientOrder, OrderFilter, PlanAssignmentData } from "./types"
import { fmtDate, fmtRelative, formatMoney } from "./utils"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { AdminModal, AdminModalFooter } from "@/components/admin"

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  iconColor?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
          iconColor || "bg-muted"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground truncate uppercase tracking-wide font-medium">
          {label}
        </p>
        <p className="text-base font-bold truncate mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main OverviewTab (Fiche Client) ──────────────────────────────────────────

interface OverviewTabProps {
  profile: ProfileData
  planAssignment?: PlanAssignmentData | null
  orders: ClientOrder[]
  ordersLoading: boolean
  orderFilter: OrderFilter
  onOrderFilterChange: (f: OrderFilter) => void
  onOpenEditFiche: () => void
  onOpenSubModal: () => void
  onOpenNoteModal: () => void
  onGoToPlan: () => void
  onRefetchProfile: () => void
}

export default function OverviewTab({
  profile,
  planAssignment,
  orders,
  ordersLoading,
  orderFilter,
  onOrderFilterChange,
  onOpenEditFiche,
  onOpenSubModal,
  onOpenNoteModal,
  onGoToPlan,
  onRefetchProfile,
}: OverviewTabProps) {
  const { toast } = useToast()
  const sub = profile.subscription
  const client = profile.client
  const meta = profile.profileMeta
  const commerce = profile.commerceSummary

  const isActive = planAssignment?.status === "active" || (!planAssignment && sub?.effectiveStatus === "ACTIVE")
  const isExpired = planAssignment?.status === "completed" || (!planAssignment && sub?.effectiveStatus === "EXPIRED")
  const levelName = planAssignment?.levelName || sub?.levelTemplateId?.name || ""
  const clientDisplayName = sub?.levelTemplateId?.clientDisplayName || levelName

  // ── Quick Nutrition Edit Modal state ──
  const [nutritionModalOpen, setNutritionModalOpen] = useState(false)
  const [nutKcal, setNutKcal] = useState("")
  const [nutProt, setNutProt] = useState("")
  const [nutCarbs, setNutCarbs] = useState("")
  const [nutFat, setNutFat] = useState("")
  const [nutSaving, setNutSaving] = useState(false)

  const handleOpenNutritionEdit = () => {
    const nt = client.nutritionTarget
    setNutKcal(nt?.dailyCalories ? String(nt.dailyCalories) : "")
    setNutProt(nt?.proteinG ? String(nt.proteinG) : "")
    setNutCarbs(nt?.carbsG ? String(nt.carbsG) : "")
    setNutFat(nt?.fatG ? String(nt.fatG) : "")
    setNutritionModalOpen(true)
  }

  const handleSaveNutrition = async () => {
    setNutSaving(true)
    try {
      const payload: {
        dailyCalories?: number
        proteinG?: number
        carbsG?: number
        fatG?: number
      } = {}
      if (nutKcal) payload.dailyCalories = parseInt(nutKcal, 10)
      if (nutProt) payload.proteinG = parseInt(nutProt, 10)
      if (nutCarbs) payload.carbsG = parseInt(nutCarbs, 10)
      if (nutFat) payload.fatG = parseInt(nutFat, 10)

      await api.setClientNutritionTarget(client._id, payload)
      toast("Objectifs nutritionnels mis à jour ✓", "success")
      setNutritionModalOpen(false)
      onRefetchProfile()
    } catch {
      toast("Erreur lors de la mise à jour", "error")
    } finally {
      setNutSaving(false)
    }
  }

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders
    if (orderFilter === "paid") return orders.filter((o) => o.paymentStatus === "PAID")
    if (orderFilter === "unpaid") return orders.filter((o) => o.paymentStatus !== "PAID")
    return orders.filter((o) => o.status === "delivered")
  }, [orders, orderFilter])

  const addressString = useMemo(() => {
    const addr = client.address
    if (!addr) return null
    const parts = [
      addr.line1,
      addr.line2,
      addr.postalCode ? `${addr.postalCode} ${addr.city || ""}`.trim() : addr.city,
      addr.region,
      addr.country,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : null
  }, [client.address])

  const hasNutrition = !!client.nutritionTarget?.dailyCalories

  return (
    <div className="space-y-6">
      {/* ── 1. FICHE CLIENT HEADER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground">Fiche client</h2>
              <Badge
                variant={isActive ? "default" : isExpired ? "destructive" : "secondary"}
                className="text-[10px]"
              >
                {isActive ? "Client actif" : isExpired ? "Plan expiré" : "Prospect / Inactif"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identité, données physiologiques, objectifs nutritionnels et programme.
            </p>
          </div>
        </div>
        <Button
          onClick={onOpenEditFiche}
          className="gap-1.5 h-9 text-xs font-semibold shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier la fiche
        </Button>
      </div>

      {/* ── 2. MAIN 12-COLUMN DASHBOARD GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        
        {/* ── CARD A: INFORMATIONS PERSONNELLES (6 cols) ── */}
        <Card className="lg:col-span-6 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                <User className="h-4 w-4 text-primary" />
                Informations personnelles
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={onOpenEditFiche}
              >
                <Pencil className="h-3 w-3" />
                Modifier
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Nom / Prénom</span>
                <span className="font-semibold text-sm text-foreground">
                  {client.name || (client.firstName && client.lastName ? `${client.firstName} ${client.lastName}` : "Non renseigné")}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Sexe</span>
                <span className="font-semibold text-foreground">
                  {client.sexe === "M" ? "Homme" : client.sexe === "F" ? "Femme" : "Non renseigné"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </span>
                <span className="font-medium text-foreground truncate block">
                  {client.email || "Non renseigné"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Téléphone
                </span>
                <span className="font-medium text-foreground">
                  {client.phone || "Non renseigné"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date de naissance / Âge
                </span>
                <span className="font-medium text-foreground">
                  {client.dateOfBirth ? fmtDate(client.dateOfBirth) : ""}
                  {client.age ? ` (${client.age} ans)` : (!client.dateOfBirth ? "Non renseigné" : "")}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Inscrit depuis
                </span>
                <span className="font-medium text-foreground">
                  {client.createdAt ? `${fmtDate(client.createdAt)} (${fmtRelative(client.createdAt)})` : "—"}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-[11px] text-muted-foreground block mb-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Adresse postale
              </span>
              <span className="font-medium text-foreground">
                {addressString || "Aucune adresse enregistrée"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── CARD B: DONNÉES PHYSIQUES & OBJECTIF (6 cols) ── */}
        <Card className="lg:col-span-6 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                <Activity className="h-4 w-4 text-emerald-500" />
                Données physiques & Objectif
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={onOpenEditFiche}
              >
                <Pencil className="h-3 w-3" />
                Modifier
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block mb-1">Taille</span>
                <span className="text-lg font-bold text-foreground">
                  {client.taille ? `${client.taille} cm` : "—"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block mb-1">Poids actuel</span>
                <span className="text-lg font-bold text-foreground">
                  {client.poids ? `${client.poids} kg` : "—"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-center">
                <span className="text-[11px] text-muted-foreground block mb-1">Niveau sportif</span>
                <span className="text-lg font-bold text-foreground">
                  {client.fitnessLevel ? `Niveau ${client.fitnessLevel}` : "Niveau A"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-[11px] font-semibold text-primary block uppercase tracking-wider mb-1">
                Objectif personnel
              </span>
              <p className="text-sm font-bold text-foreground">
                {client.objectif || "Non défini"}
              </p>
            </div>

            {/* Optional Body Composition */}
            {(client.bodyComposition?.bodyFatPercentage != null || client.bodyComposition?.muscleMassPercentage != null) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block">Masse grasse</span>
                  <span className="font-semibold text-xs text-foreground">
                    {client.bodyComposition.bodyFatPercentage ?? "—"} %
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block">Masse musculaire</span>
                  <span className="font-semibold text-xs text-foreground">
                    {client.bodyComposition.muscleMassPercentage ?? "—"} %
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── CARD C: OBJECTIFS NUTRITIONNELS (6 cols) ── */}
        <Card className="lg:col-span-6 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                <Flame className="h-4 w-4 text-amber-500" />
                Objectifs nutritionnels
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleOpenNutritionEdit}
              >
                <Pencil className="h-3 w-3" />
                Modifier
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasNutrition ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {client.nutritionTarget?.dailyCalories}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    kcal / jour
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Protéines", value: client.nutritionTarget?.proteinG, color: "bg-blue-500" },
                    { label: "Glucides", value: client.nutritionTarget?.carbsG, color: "bg-amber-500" },
                    { label: "Lipides", value: client.nutritionTarget?.fatG, color: "bg-rose-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl bg-muted/50 border border-border/60 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn("h-2 w-2 rounded-full", color)} />
                        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                      </div>
                      <p className="text-base font-bold text-foreground">{value ?? "—"} g</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 border border-dashed border-border rounded-xl">
                <Flame className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium mb-3">
                  Aucun objectif nutritionnel configuré
                </p>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleOpenNutritionEdit}>
                  Définir les macros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── CARD D: ABONNEMENT / PLAN (6 cols) ── */}
        <Card className="lg:col-span-6 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                <CreditCard className="h-4 w-4 text-purple-500" />
                Abonnement / Plan
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={onOpenSubModal}
              >
                <RefreshCw className="h-3 w-3" />
                Gérer le plan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {planAssignment || sub ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium">Plan actif</p>
                    <p className="text-base font-bold text-foreground">
                      {clientDisplayName || levelName || "Programme DietTemple"}
                    </p>
                  </div>
                  <Badge
                    variant={isActive ? "default" : isExpired ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {isActive ? "Actif" : isExpired ? "Terminé" : planAssignment?.status || sub?.effectiveStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Début</span>
                    <span className="font-semibold text-foreground">
                      {fmtDate(planAssignment?.startDate || sub?.startAt)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Fin</span>
                    <span className="font-semibold text-foreground">
                      {fmtDate(planAssignment?.finalActiveDate || planAssignment?.endDate || sub?.endAt)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Semaine</span>
                    <span className="font-semibold text-foreground">
                      {planAssignment?.progress?.currentWeek
                        ? `${planAssignment.progress.currentWeek} / ${planAssignment.durationWeeks}`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary font-semibold gap-1 p-0 hover:bg-transparent"
                    onClick={onGoToPlan}
                  >
                    Voir les détails du plan d'entraînement <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border rounded-xl">
                <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium mb-3">
                  Aucun abonnement ni programme assigné
                </p>
                <Button size="sm" className="h-8 text-xs" onClick={onOpenSubModal}>
                  Assigner un plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── 3. RECENT ACTIVITY & COACH NOTES (LOWER PRIORITY) ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Activité récente & Notes coach
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={onOpenNoteModal}
            >
              + Note coach
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!profile.lastWorkoutDate && !profile.lastCoachNote ? (
            <p className="text-xs text-muted-foreground py-2">
              Aucune activité récente enregistrée.
            </p>
          ) : (
            <div className="space-y-3">
              {profile.lastWorkoutDate && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Dernière séance d'entraînement</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(profile.lastWorkoutDate)} · {fmtRelative(profile.lastWorkoutDate)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={onGoToPlan}
                  >
                    Voir dans Plan <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {profile.lastCoachNote && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">
                      {profile.lastCoachNote.title || "Note coach"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(profile.lastCoachNote.date)} · {fmtRelative(profile.lastCoachNote.date)}
                    </p>
                    {profile.lastCoachNote.message && (
                      <p className="text-xs mt-1 text-muted-foreground leading-relaxed">
                        {profile.lastCoachNote.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. COMMERCE / ORDERS SECTION (LOWER PRIORITY) ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Commandes & Achats
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={ShoppingBag}
            label="Commandes"
            value={commerce?.totalOrders ?? 0}
            iconColor="bg-blue-500/10 text-blue-500"
          />
          <KpiCard
            icon={DollarSign}
            label="Total dépensé"
            value={formatMoney(commerce?.totalSpent)}
            iconColor="bg-emerald-500/10 text-emerald-500"
          />
          <KpiCard
            icon={Package}
            label="Payées"
            value={commerce?.paidOrders ?? 0}
            sub={`sur ${commerce?.totalOrders ?? 0} au total`}
            iconColor="bg-purple-500/10 text-purple-500"
          />
          <KpiCard
            icon={Clock}
            label="Dernière commande"
            value={commerce?.lastOrderAt ? fmtDate(commerce.lastOrderAt) : "—"}
            sub={commerce?.lastOrderAt ? fmtRelative(commerce.lastOrderAt) : undefined}
            iconColor="bg-amber-500/10 text-amber-500"
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                Historique des commandes
              </CardTitle>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "all", label: "Toutes" },
                    { id: "paid", label: "Payées" },
                    { id: "unpaid", label: "Non payées" },
                    { id: "delivered", label: "Livrées" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onOrderFilterChange(f.id)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-md border transition-colors",
                      orderFilter === f.id
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune commande disponible.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted-foreground border-b border-border">
                      <th className="text-left pb-2 font-medium">Référence</th>
                      <th className="text-left pb-2 font-medium">Statut</th>
                      <th className="text-left pb-2 font-medium">Paiement</th>
                      <th className="text-right pb-2 font-medium">Montant</th>
                      <th className="text-right pb-2 font-medium">Date</th>
                      <th className="text-right pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <tr
                        key={o._id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 font-medium text-xs">
                          {o.reference || o._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              o.status === "delivered"
                                ? "default"
                                : o.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={o.paymentStatus === "PAID" ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {o.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-xs">
                          {formatMoney(o.totalPrice)}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground text-xs tabular-nums">
                          {fmtDate(o.createdAt)}
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/admin/orders/${o._id}`}
                            className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Nutrition Edit Modal ── */}
      <AdminModal
        open={nutritionModalOpen}
        onOpenChange={setNutritionModalOpen}
        title="Modifier les objectifs nutritionnels"
        description="Définissez les calories journalières et la répartition en macronutriments."
        icon={<Flame className="h-5 w-5 text-amber-500" />}
        size="md"
        busy={nutSaving}
        footer={(close) => (
          <AdminModalFooter
            submitLabel="Enregistrer les objectifs"
            loadingLabel="Enregistrement…"
            loading={nutSaving}
            onCancel={close}
            onSubmit={handleSaveNutrition}
          />
        )}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="quick-nut-kcal" className="text-xs">Calories journalières (kcal / jour)</Label>
              <Input
                id="quick-nut-kcal"
                type="number"
                value={nutKcal}
                onChange={(e) => setNutKcal(e.target.value)}
                placeholder="2200"
                className="h-10 text-sm font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-nut-prot" className="text-xs">Protéines (g)</Label>
              <Input
                id="quick-nut-prot"
                type="number"
                value={nutProt}
                onChange={(e) => setNutProt(e.target.value)}
                placeholder="160"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-nut-carbs" className="text-xs">Glucides (g)</Label>
              <Input
                id="quick-nut-carbs"
                type="number"
                value={nutCarbs}
                onChange={(e) => setNutCarbs(e.target.value)}
                placeholder="250"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-nut-fat" className="text-xs">Lipides (g)</Label>
              <Input
                id="quick-nut-fat"
                type="number"
                value={nutFat}
                onChange={(e) => setNutFat(e.target.value)}
                placeholder="70"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
