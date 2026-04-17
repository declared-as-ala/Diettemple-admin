"use client"

import { cn } from "@/lib/utils"
import { getLevelImageUrl, LEVELS, normalizeLevelName } from "@/lib/levelAssets"
import {
  ArrowLeft, Check, RefreshCw, MessageSquarePlus, User, Users, Phone, Mail,
  Activity, ListOrdered, UtensilsCrossed, Calendar, Clock, Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProfileData, TabId } from "./types"
import { LEVEL_COLORS, daysUntil, fmtDate, fmtRelative } from "./utils"

const LEVEL_NAMES = [...LEVELS]

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Aperçu", icon: ListOrdered },
  { id: "training", label: "Entraînement", icon: Activity },
  { id: "diet", label: "Diet", icon: UtensilsCrossed },
  { id: "timeline", label: "Timeline", icon: Calendar },
]

interface ClientHeaderProps {
  profile: ProfileData
  clientLevel: string
  tab: TabId
  onTabChange: (tab: TabId) => void
  onBack: () => void
  onOpenSubModal: () => void
  onOpenNoteModal: () => void
  onUpdateLevel: (level: string) => void
  levelSaving: boolean
}

export default function ClientHeader({
  profile,
  clientLevel,
  tab,
  onTabChange,
  onBack,
  onOpenSubModal,
  onOpenNoteModal,
  onUpdateLevel,
  levelSaving,
}: ClientHeaderProps) {
  const sub = profile.subscription
  const client = profile.client
  const meta = profile.profileMeta
  const levelName = sub?.levelTemplateId?.name ?? ""
  const levelGender = sub?.levelTemplateId?.gender ?? ""
  const tierForUi = normalizeLevelName(clientLevel || levelName)
  const heroLevel = tierForUi || levelName || "Intiate"
  const gradientClass =
    LEVEL_COLORS[tierForUi] ?? LEVEL_COLORS[clientLevel] ?? LEVEL_COLORS[levelName] ?? "from-slate-800 via-slate-900 to-black"
  const isActive = sub?.effectiveStatus === "ACTIVE"
  const isExpired = sub?.effectiveStatus === "EXPIRED"
  const daysLeft = sub ? daysUntil(sub.endAt) : 0
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
            {sub && (
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
                {isActive ? "Actif" : isExpired ? "Expiré" : sub.effectiveStatus}
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
              <span className="hidden sm:inline">{sub ? "Gérer l'abonnement" : "Configurer"}</span>
              <span className="sm:hidden">{sub ? "Gérer" : "Configurer"}</span>
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
                {sub && (
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
                    {isActive ? "Abonné actif" : isExpired ? "Expiré" : sub.effectiveStatus}
                  </span>
                )}
                {typeof client.xp === "number" && client.xp > 0 && (
                  <span className="text-[11px] text-white/60 bg-white/8 px-2 py-0.5 rounded-md">
                    {client.xp} XP
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
                  <span className="inline-flex items-center gap-1.5">
                    {levelGender === "F" ? (
                      <Users className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    Programme {levelName}
                  </span>
                )}
              </div>
            </div>

            {/* Subscription end card */}
            {sub && (
              <div className="hidden sm:flex flex-col items-end text-right bg-white/8 backdrop-blur rounded-xl border border-white/10 px-4 py-3 flex-shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                  {isActive ? "Expire le" : "Expiré le"}
                </p>
                <p className="text-white font-bold text-sm mt-0.5">
                  {fmtDate(sub.endAt)}
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

          {/* Level selector pills */}
          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mr-1">
              Niveau du client
            </span>
            {LEVEL_NAMES.map((lvl) => {
              const isCurrent = tierForUi === lvl
              return (
                <button
                  key={lvl}
                  disabled={levelSaving}
                  onClick={() => onUpdateLevel(lvl)}
                  className={cn(
                    "group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border backdrop-blur transition-all",
                    isCurrent
                      ? "bg-white/25 text-white border-white/40 shadow-lg"
                      : "bg-white/5 text-white/50 border-white/10 hover:bg-white/15 hover:text-white/90",
                    levelSaving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <img
                    src={getLevelImageUrl(lvl)}
                    alt={lvl}
                    className={cn(
                      "h-5 w-5 rounded-full object-cover transition-transform",
                      isCurrent && "scale-110"
                    )}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                  {lvl}
                  {isCurrent && <Check className="h-3 w-3" />}
                </button>
              )
            })}
          </div>
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
