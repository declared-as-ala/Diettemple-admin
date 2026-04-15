"use client"

import { useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Check, AlertCircle, Activity, MessageSquare, CreditCard, Flame,
  RefreshCw, ShoppingBag, Loader2, User, Package, DollarSign, Clock,
  ChevronRight, Phone, Mail, ExternalLink,
} from "lucide-react"
import type { ProfileData, ClientOrder, Recommendation, OrderFilter } from "./types"
import {
  fmtDate, fmtRelative, calcProfileCompletion, getMissingFields,
  COMPLETION_FIELD_LABELS, formatMoney,
} from "./utils"

// ─── Profile Completion Ring ─────────────────────────────────────────────────

function CompletionRing({ percent }: { percent: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  const color =
    percent >= 80
      ? "text-emerald-500"
      : percent >= 50
        ? "text-amber-500"
        : "text-red-500"

  return (
    <div className="relative h-14 w-14 flex-shrink-0">
      <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <circle
          cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className={cn(color, "transition-all duration-700")}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {percent}%
      </span>
    </div>
  )
}

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

// ─── Setup Checklist chip ───────────────────────────────────────────────────

function ChecklistChip({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
        done
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
          : "bg-muted/40 text-muted-foreground border-border"
      )}
    >
      {done ? (
        <Check className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      )}
      {label}
    </div>
  )
}

// ─── Main OverviewTab ────────────────────────────────────────────────────────

interface OverviewTabProps {
  profile: ProfileData
  orders: ClientOrder[]
  ordersLoading: boolean
  orderFilter: OrderFilter
  onOrderFilterChange: (f: OrderFilter) => void
  recommendations: Recommendation[]
  onOpenSubModal: () => void
  onOpenNoteModal: () => void
  onGoToDiet: () => void
  onGoToTraining: () => void
}

export default function OverviewTab({
  profile,
  orders,
  ordersLoading,
  orderFilter,
  onOrderFilterChange,
  recommendations,
  onOpenSubModal,
  onOpenNoteModal,
  onGoToDiet,
  onGoToTraining,
}: OverviewTabProps) {
  const sub = profile.subscription
  const client = profile.client
  const isActive = sub?.effectiveStatus === "ACTIVE"
  const isExpired = sub?.effectiveStatus === "EXPIRED"
  const levelName = sub?.levelTemplateId?.name ?? ""
  const daysLeft = sub ? Math.ceil((new Date(sub.endAt).getTime() - Date.now()) / 86400000) : 0
  const hasNutrition = !!client.nutritionTarget?.dailyCalories
  const meta = profile.profileMeta
  const completionPct = calcProfileCompletion(meta?.profileCompletion)
  const missing = getMissingFields(meta?.profileCompletion)
  const commerce = profile.commerceSummary

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders
    if (orderFilter === "paid") return orders.filter((o) => o.paymentStatus === "PAID")
    if (orderFilter === "unpaid") return orders.filter((o) => o.paymentStatus !== "PAID")
    return orders.filter((o) => o.status === "delivered")
  }, [orders, orderFilter])

  return (
    <div className="space-y-6">
      {/* ── Recommendations (priority banner) ── */}
      {recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-amber-500/[0.03] to-transparent p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold">
                Recommandations
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  {recommendations.length} à traiter
                </span>
              </h3>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {recommendations.slice(0, 6).map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 flex items-start justify-between gap-3",
                  rec.severity === "high"
                    ? "border-red-500/25 bg-red-500/5"
                    : rec.severity === "medium"
                      ? "border-amber-500/25 bg-amber-500/5"
                      : "border-blue-500/25 bg-blue-500/5"
                )}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0",
                      rec.severity === "high"
                        ? "bg-red-500"
                        : rec.severity === "medium"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                    )}
                  />
                  <span className="text-xs leading-relaxed">{rec.message}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] shrink-0 px-2.5"
                  onClick={rec.action}
                >
                  {rec.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Setup checklist ── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Configuration client 360
          </p>
          <span className="text-[11px] text-muted-foreground">
            {
              [
                profile.setupChecklist.subscription,
                profile.setupChecklist.trainingPlan,
                hasNutrition,
                !!profile.lastCoachNote,
              ].filter(Boolean).length
            }
            /4
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ChecklistChip label="Abonnement" done={profile.setupChecklist.subscription} />
          <ChecklistChip label="Plan entraînement" done={profile.setupChecklist.trainingPlan} />
          <ChecklistChip label="Diet configuré" done={hasNutrition} />
          <ChecklistChip label="Note récente" done={!!profile.lastCoachNote} />
        </div>
      </div>

      {/* ── Profile + Subscription + Nutrition row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Profil
              </CardTitle>
              <CompletionRing percent={completionPct} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              {[
                { label: "Sexe", value: meta?.sexe || client.sexe },
                { label: "Âge", value: meta?.age || client.age },
                { label: "Taille", value: meta?.taille || client.taille ? `${meta?.taille || client.taille} cm` : null },
                { label: "Poids", value: meta?.poids || client.poids ? `${meta?.poids || client.poids} kg` : null },
                { label: "Objectif", value: meta?.objectif || client.objectif },
              ].map(({ label, value }) => (
                <div key={label} className="contents">
                  <span className="text-muted-foreground py-0.5">{label}</span>
                  <span
                    className={cn(
                      "font-medium py-0.5",
                      !value && "text-muted-foreground/50 italic"
                    )}
                  >
                    {value || "Non renseigné"}
                  </span>
                </div>
              ))}
            </div>
            {missing.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5">
                  {missing.length} champ{missing.length > 1 ? "s" : ""} manquant{missing.length > 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-1">
                  {missing.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                    >
                      {COMPLETION_FIELD_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sub ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold truncate">{levelName || "—"}</span>
                  <Badge
                    variant={isActive ? "default" : isExpired ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {isActive ? "Actif" : isExpired ? "Expiré" : sub.effectiveStatus}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Début : <span className="text-foreground font-medium">{fmtDate(sub.startAt)}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isActive ? "Expire le" : "Expiré le"}{" "}
                    <span className="text-foreground font-medium">{fmtDate(sub.endAt)}</span>
                    {isActive && daysLeft <= 14 && daysLeft > 0 && (
                      <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                        · J-{daysLeft}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  onClick={onOpenSubModal}
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Gérer l&apos;abonnement
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">Aucun abonnement configuré</p>
                <Button size="sm" className="h-8 text-xs" onClick={onOpenSubModal}>
                  Assigner un plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nutrition card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasNutrition ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold leading-none">
                    {client.nutritionTarget?.dailyCalories}
                  </span>
                  <span className="text-[11px] text-muted-foreground">kcal / jour</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { letter: "P", value: client.nutritionTarget?.proteinG, color: "bg-blue-500" },
                    { letter: "G", value: client.nutritionTarget?.carbsG, color: "bg-amber-500" },
                    { letter: "L", value: client.nutritionTarget?.fatG, color: "bg-rose-500" },
                  ].map(({ letter, value, color }) => (
                    <div key={letter} className="rounded-lg bg-muted/50 px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {letter}
                        </span>
                      </div>
                      <p className="text-xs font-bold mt-0.5">{value ?? "—"}g</p>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  onClick={onGoToDiet}
                >
                  Modifier les objectifs
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Flame className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">Aucun objectif défini</p>
                <Button size="sm" className="h-8 text-xs" onClick={onGoToDiet}>
                  Configurer le diet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Commerce KPIs ── */}
      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Commandes & paiements
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
      </div>

      {/* ── Recent activity ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!profile.lastWorkoutDate && !profile.lastCoachNote ? (
            <p className="text-xs text-muted-foreground py-2">
              Aucune activité enregistrée.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              {profile.lastWorkoutDate && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Dernière séance</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(profile.lastWorkoutDate)} · {fmtRelative(profile.lastWorkoutDate)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={onGoToTraining}
                  >
                    Voir <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              )}
              {profile.lastCoachNote && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">
                      {profile.lastCoachNote.title || "Note coach"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(profile.lastCoachNote.date)} · {fmtRelative(profile.lastCoachNote.date)}
                    </p>
                    {profile.lastCoachNote.message && (
                      <p className="text-[11px] mt-1 line-clamp-2 text-muted-foreground">
                        {profile.lastCoachNote.message}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={onOpenNoteModal}
                  >
                    + Note
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Orders Table ── */}
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
                      ? "bg-primary text-primary-foreground border-primary"
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
                      <td className="py-2.5 font-medium">
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
                      <td className="py-2.5 text-right font-semibold tabular-nums">
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
                          <ExternalLink className="h-3 w-3" />
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
  )
}
