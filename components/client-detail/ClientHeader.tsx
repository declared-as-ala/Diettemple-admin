"use client"

import { cn } from "@/lib/utils"
import { getLevelImageUrl, normalizeLevelName } from "@/lib/levelAssets"
import {
  ArrowLeft, RefreshCw, MessageSquarePlus, User, Users, Phone, Mail,
  Clock, Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlanAssignmentData, ProfileData, TabId } from "./types"
import { daysUntil, fmtDate, fmtRelative } from "./utils"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "fiche", label: "Fiche client", icon: User },
  { id: "plan", label: "Plan", icon: Trophy },
  { id: "journal", label: "Journal", icon: Clock },
]

interface ClientHeaderProps {
  profile: ProfileData
  clientLevel: string
  tab: TabId
  onTabChange: (tab: TabId) => void
  onBack: () => void
  onOpenSubModal: () => void
  onOpenNoteModal: () => void
  planAssignment: PlanAssignmentData | null
}

export default function ClientHeader({
  profile,
  clientLevel,
  tab,
  onTabChange,
  onBack,
  onOpenSubModal,
  onOpenNoteModal,
  planAssignment,
}: ClientHeaderProps) {
  const sub = profile.subscription
  const client = profile.client
  const meta = profile.profileMeta
  const levelName = planAssignment?.levelName || sub?.levelTemplateId?.name || ""
  const clientDisplayName = sub?.levelTemplateId?.clientDisplayName || levelName
  const levelGender = sub?.levelTemplateId?.gender ?? ""
  const tierForUi = normalizeLevelName(clientLevel || clientDisplayName || levelName)
  const heroLevel = tierForUi || clientDisplayName || levelName || "Initiate"
  const isActive = planAssignment?.status === "active" || (!planAssignment && sub?.effectiveStatus === "ACTIVE")
  const isExpired = planAssignment?.status === "completed" || (!planAssignment && sub?.effectiveStatus === "EXPIRED")
  const planEndDate = planAssignment?.finalActiveDate || sub?.endAt
  const daysLeft = planEndDate ? daysUntil(planEndDate) : 0
  const displayName = client.name || (client.firstName && client.lastName ? `${client.firstName} ${client.lastName}` : "Client sans nom")
  const photo = meta?.photoUri || client.photoUri

  return (
    <div className="relative">
      {/* ── STICKY TOP ACTION BAR ── */}
      <div className="sticky top-0 z-30 backdrop-blur bg-background/85 border-b border-border">
        <div className="flex items-center justify-between gap-3 px-6 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold text-sm truncate">{displayName}</span>
            {(planAssignment || sub) && (
              <span
                className={cn(
                  "hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : isExpired
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isActive ? "Actif" : isExpired ? "Terminé" : planAssignment?.status || sub?.effectiveStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={onOpenNoteModal}
            >
              <MessageSquarePlus className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Note coach</span>
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={onOpenSubModal}
            >
              <RefreshCw className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{planAssignment || sub ? "Gérer le plan" : "Configurer le plan"}</span>
              <span className="sm:hidden">Plan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
          <img
            src={getLevelImageUrl(heroLevel)}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-6 top-1/2 hidden h-56 w-56 -translate-y-1/2 object-contain opacity-[0.07] grayscale md:block"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />

          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
              {photo ? (
                <img
                  src={photo}
                  alt={displayName}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-border object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-foreground text-xl font-semibold text-background">
                  {displayName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || <User className="h-8 w-8" />}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {tierForUi && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-background">
                      <Trophy className="h-3 w-3" />
                      {tierForUi}
                    </span>
                  )}
                  {(planAssignment || sub) && (
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                        isActive
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : isExpired
                            ? "bg-red-500/15 text-red-700 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isActive ? "Plan actif" : isExpired ? "Terminé" : planAssignment?.status || sub?.effectiveStatus}
                    </span>
                  )}
                </div>

                <h1 className="mt-1.5 truncate text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">{displayName}</h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {client.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </span>
                  )}
                  {client.createdAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Inscrit {fmtRelative(client.createdAt)}
                    </span>
                  )}
                </div>

                {(levelName || planAssignment?.progress?.currentWeek) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {levelName && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 font-medium text-foreground">
                        {levelGender === "F" ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                        {clientDisplayName || levelName}
                      </span>
                    )}
                    {planAssignment?.progress?.currentWeek && (
                      <span className="num inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 font-medium text-foreground">
                        Semaine {planAssignment.progress.currentWeek} / {planAssignment.durationWeeks}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {planEndDate && (
              <div className="flex shrink-0 flex-col rounded-xl border border-border bg-background px-4 py-3 lg:min-w-[210px] lg:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isActive ? "Accès au plan jusqu’au" : "Plan terminé le"}
                </p>
                <p className="num mt-0.5 text-base font-semibold text-foreground">{fmtDate(planEndDate)}</p>
                <p
                  className={cn(
                    "num mt-0.5 text-xs font-semibold",
                    daysLeft > 14 ? "text-emerald-600 dark:text-emerald-400" : daysLeft > 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {daysLeft > 0 ? `${daysLeft} jours restants` : `J+${Math.abs(daysLeft)}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TAB BAR (sticky under top bar) ── */}
      <div className="sticky top-[49px] z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex gap-1 px-6 overflow-x-auto scrollbar-none">
          {TABS.map(({ id: tid, label, icon: Icon }) => {
            const active = tab === tid
            return (
              <button
                key={tid}
                onClick={() => onTabChange(tid)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
