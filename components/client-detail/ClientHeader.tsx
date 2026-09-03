"use client"

import { cn } from "@/lib/utils"
import { getLevelImageUrl, normalizeLevelName } from "@/lib/levelAssets"
import {
  ArrowLeft, RefreshCw, MessageSquarePlus, User, Users, Phone, Mail,
  Activity, UtensilsCrossed, Clock, Trophy, TrendingUp, Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlanAssignmentData, ProfileData, TabId } from "./types"
import { daysUntil, fmtDate, fmtRelative } from "./utils"

const LEVEL_COLORS: Record<string, string> = {
  'Initiate': 'from-blue-600 via-blue-700 to-blue-800',
  'Fighter': 'from-amber-600 via-amber-700 to-amber-800',
  'Warrior': 'from-purple-600 via-purple-700 to-purple-800',
  'Champion': 'from-rose-600 via-rose-700 to-rose-800',
  'Elite': 'from-yellow-600 via-yellow-700 to-yellow-800',
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Profil", icon: User },
  { id: "bodyComposition", label: "Composition corporelle", icon: Activity },
  { id: "diet", label: "Objectifs nutritionnels", icon: UtensilsCrossed },
  { id: "training", label: "Plan", icon: Trophy },
  { id: "weeklyProgress", label: "Progression hebdomadaire", icon: TrendingUp },
  { id: "timeline", label: "Journal", icon: Clock },
]

interface ClientHeaderProps {
  profile: ProfileData
  clientLevel: string
  tab: TabId
  onTabChange: (tab: TabId) => void
  onBack: () => void
  onOpenSubModal: () => void
  onOpenNoteModal: () => void
  onEditClient: () => void
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
  onEditClient,
  planAssignment,
}: ClientHeaderProps) {
  const sub = profile.subscription
  const client = profile.client
  const meta = profile.profileMeta
  const levelName = planAssignment?.levelName || sub?.levelTemplateId?.name || ""
  const clientDisplayName = sub?.levelTemplateId?.clientDisplayName || levelName
  const levelGender = sub?.levelTemplateId?.gender ?? ""
  const tierForUi = normalizeLevelName(clientLevel || clientDisplayName || levelName)
  const heroLevel = tierForUi || clientDisplayName || levelName || "Intiate"
  const gradientClass =
    LEVEL_COLORS[tierForUi] ?? LEVEL_COLORS[clientLevel] ?? LEVEL_COLORS[levelName] ?? "from-slate-800 via-slate-900 to-black"
  const isActive = planAssignment?.status === "active" || (!planAssignment && sub?.effectiveStatus === "ACTIVE")
  const isExpired = planAssignment?.status === "completed" || (!planAssignment && sub?.effectiveStatus === "EXPIRED")
  const planEndDate = planAssignment?.finalActiveDate || sub?.endAt
  const daysLeft = planEndDate ? daysUntil(planEndDate) : 0
  const displayName = client.name || "Client sans nom"
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
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onEditClient}>
              <Pencil className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Modifier</span>
            </Button>
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
              <span className="hidden sm:inline">{sub ? "Gérer le plan" : "Configurer"}</span>
              <span className="sm:hidden">{sub ? "Plan" : "Configurer"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── HERO BAND ── */}
      <div className={cn("relative bg-gradient-to-br overflow-hidden", gradientClass)}>
        {/* Decorative radial glow */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top right, rgba(255,255,255,0.18), transparent 55%)",
          }}
        />

        {/* BIG level hero image — significantly visible on the right */}
        <div className="absolute right-0 top-0 bottom-0 w-full pointer-events-none select-none">
          <img
            src={getLevelImageUrl(heroLevel)}
            alt={heroLevel}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-[150%] max-h-[480px] w-auto object-contain opacity-[0.22] md:opacity-[0.3] drop-shadow-2xl"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />
          {/* crisp foreground version (medium) */}
          <img
            src={getLevelImageUrl(heroLevel)}
            alt=""
            aria-hidden
            className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 h-44 w-44 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 px-6 py-8 lg:pr-64">
          {/* Identity row */}
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt={displayName}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-white/25 shadow-2xl"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-xl backdrop-blur-sm">
                  <User className="h-9 w-9 text-white/40" />
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {tierForUi && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70 bg-white/10 backdrop-blur px-2 py-0.5 rounded-md border border-white/15">
                    <Trophy className="inline h-3 w-3 mr-1 -mt-0.5" />
                    {tierForUi}
                  </span>
                )}
                {(planAssignment || sub) && (
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider",
                      isActive
                        ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/30"
                        : isExpired
                          ? "bg-red-400/20 text-red-200 ring-1 ring-red-400/30"
                          : "bg-white/10 text-white/60"
                    )}
                  >
                    {isActive ? "Plan actif" : isExpired ? "Terminé" : planAssignment?.status || sub?.effectiveStatus}
                  </span>
                )}
              </div>

              <h1 className="mt-1.5 text-2xl md:text-3xl font-bold text-white truncate leading-tight tracking-tight">
                {displayName}
              </h1>

              {/* Contact + account meta row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
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
                {levelName && (
                  <span className="inline-flex items-center gap-1.5 text-white/80 font-medium">
                    {levelGender === "F" ? (
                      <Users className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    Plan client : {clientDisplayName} (Réf : {levelName})
                  </span>
                )}
                {planAssignment?.progress?.currentWeek && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-white/80">Semaine {planAssignment.progress.currentWeek} sur {planAssignment.durationWeeks}</span>
                )}
              </div>
            </div>

            {/* Subscription end card */}
            {planEndDate && (
              <div className="hidden sm:flex flex-col items-end text-right bg-white/8 backdrop-blur rounded-xl border border-white/10 px-4 py-3 flex-shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                  {isActive ? "Accès au plan jusqu’au" : "Plan terminé le"}
                </p>
                <p className="text-white font-bold text-sm mt-0.5">
                  {fmtDate(planEndDate)}
                </p>
                <p
                  className={cn(
                    "text-[11px] font-semibold mt-0.5",
                    daysLeft > 14
                      ? "text-emerald-300"
                      : daysLeft > 0
                        ? "text-amber-300"
                        : "text-red-300"
                  )}
                >
                  {daysLeft > 0 ? `${daysLeft} jours restants` : `J+${Math.abs(daysLeft)}`}
                </p>
              </div>
            )}
          </div>

          {/* Level is now read-only, derived from assigned plan */}
        </div>
      </div>

      {/* ── TAB BAR (sticky under top bar) ── */}
      <div className="sticky top-[49px] z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex gap-0.5 px-6 overflow-x-auto scrollbar-none">
          {TABS.map(({ id: tid, label, icon: Icon }) => {
            const active = tab === tid
            return (
              <button
                key={tid}
                onClick={() => onTabChange(tid)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "text-foreground"
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
