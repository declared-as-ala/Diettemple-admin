"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import {
  ArrowLeft, Check, RefreshCw, TrendingUp, Activity, MessageSquare,
  UtensilsCrossed, Calendar, ListOrdered, CreditCard, Users, User,
  MessageSquarePlus, AlertCircle, Loader2, Circle, Flame,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "overview" | "training" | "diet" | "timeline"

interface ClientData {
  _id: string
  name?: string
  email?: string
  phone?: string
  sexe?: string
  level?: string
  nutritionTarget?: { dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number }
}

interface SubscriptionData {
  _id: string
  levelTemplateId?: { _id?: string; name?: string; gender?: string }
  effectiveStatus: string
  startAt: string
  endAt: string
  history?: Array<{ action: string; date: string; note?: string }>
}

interface ProfileData {
  client: ClientData
  subscription: SubscriptionData | null
  nutritionAssignment: null
  lastCoachNote: { date: string; message?: string; title?: string } | null
  lastWorkoutDate: string | null
  setupChecklist: { subscription: boolean; trainingPlan: boolean; dietPlan: boolean; nextCheckIn: boolean }
}

interface NutritionLog {
  date: string
  consumedCalories?: number
  consumedMacros?: { proteinG?: number; carbsG?: number; fatG?: number }
}

interface TimelineEvent {
  type: string
  date: string
  title?: string
  meta?: Record<string, unknown>
}

interface LevelTemplate {
  _id: string
  name: string
  gender?: string
  isActive?: boolean
}

interface NutritionPlan {
  _id: string
  name: string
  goalType: string
  dailyCalories: number
  macros: { proteinG: number; carbsG: number; fatG: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  Intiate:  "from-slate-600 to-slate-800",
  Fighter:  "from-blue-600 to-blue-900",
  Warrior:  "from-emerald-600 to-emerald-900",
  Champion: "from-amber-500 to-amber-800",
  Elite:    "from-rose-600 to-rose-900",
}

const LEVEL_NAMES = ["Intiate", "Fighter", "Warrior", "Champion", "Elite"]

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Sèche",
  maintain: "Maintien",
  gain_muscle: "Prise de masse",
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function calcCurrentWeek(startAt: string): number {
  const days = Math.floor((Date.now() - new Date(startAt).getTime()) / 86400000)
  return Math.min(Math.max(Math.floor(days / 7) + 1, 1), 5)
}

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function quickEndDate(days: number): string {
  return format(addDays(new Date(), days), "yyyy-MM-dd")
}

// ─── Timeline icon helper ──────────────────────────────────────────────────────

function TimelineIcon({ type }: { type: string }) {
  const base = "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
  if (type === "coach_note") return <div className={cn(base, "bg-blue-500/10")}><MessageSquare className="h-4 w-4 text-blue-500" /></div>
  if (type === "subscription_assigned") return <div className={cn(base, "bg-emerald-500/10")}><CreditCard className="h-4 w-4 text-emerald-500" /></div>
  if (type === "subscription_renewed") return <div className={cn(base, "bg-teal-500/10")}><RefreshCw className="h-4 w-4 text-teal-500" /></div>
  if (type === "subscription_level_changed") return <div className={cn(base, "bg-amber-500/10")}><TrendingUp className="h-4 w-4 text-amber-500" /></div>
  if (type === "workout" || type === "workout_session") return <div className={cn(base, "bg-purple-500/10")}><Activity className="h-4 w-4 text-purple-500" /></div>
  return <div className={cn(base, "bg-muted")}><Circle className="h-4 w-4 text-muted-foreground" /></div>
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AdminClientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { toast } = useToast()

  // Core data
  const [tab, setTab] = useState<TabId>("overview")
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Diet tab
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsLoaded, setLogsLoaded] = useState(false)
  const [kcal, setKcal] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [savingTargets, setSavingTargets] = useState(false)

  // Timeline tab
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineLoaded, setTimelineLoaded] = useState(false)

  // Subscription modal
  const [subModal, setSubModal] = useState(false)
  const [subScenario, setSubScenario] = useState<"renew" | "change" | "new">("renew")
  const [subTemplates, setSubTemplates] = useState<LevelTemplate[]>([])
  const [subTemplatesLoading, setSubTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedLevelName, setSelectedLevelName] = useState("")
  const [selectedLevelGender, setSelectedLevelGender] = useState<"M" | "F">("M")
  const [subEndDate, setSubEndDate] = useState("")
  const [subStartDate, setSubStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [subNote, setSubNote] = useState("")
  const [subSaving, setSubSaving] = useState(false)
  const [restartS1Saving, setRestartS1Saving] = useState(false)

  // Nutrition template modal
  const [nutModal, setNutModal] = useState(false)
  const [nutPlans, setNutPlans] = useState<NutritionPlan[]>([])
  const [nutPlansLoading, setNutPlansLoading] = useState(false)

  // Note modal
  const [noteModal, setNoteModal] = useState(false)
  const [noteDate, setNoteDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [noteTitle, setNoteTitle] = useState("")
  const [noteMessage, setNoteMessage] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)

  // Client level (User.level — separate from subscription LevelTemplate)
  const [clientLevel, setClientLevel] = useState("")
  const [levelSaving, setLevelSaving] = useState(false)

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await api.getClient(id)
      setProfile(data)
      if (data?.client?.level) setClientLevel(data.client.level)
      const nt = data?.client?.nutritionTarget
      if (nt) {
        setKcal(nt.dailyCalories ? String(nt.dailyCalories) : "")
        setProtein(nt.proteinG ? String(nt.proteinG) : "")
        setCarbs(nt.carbsG ? String(nt.carbsG) : "")
        setFat(nt.fatG ? String(nt.fatG) : "")
      }
    } catch {
      toast("Erreur de chargement du client", "error")
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  const loadLogs = useCallback(async () => {
    if (!id || logsLoaded) return
    setLogsLoading(true)
    try {
      const data = await api.getClientNutrition(id)
      setLogs(data?.logs || [])
      setLogsLoaded(true)
    } catch {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }, [id, logsLoaded])

  const loadTimeline = useCallback(async () => {
    if (!id || timelineLoaded) return
    setTimelineLoading(true)
    try {
      const data = await api.getClientTimeline(id, { limit: 50 })
      setTimeline(data?.timeline || [])
      setTimelineLoaded(true)
    } catch {
      setTimeline([])
    } finally {
      setTimelineLoading(false)
    }
  }, [id, timelineLoaded])

  const loadLevelTemplates = useCallback(async () => {
    if (subTemplates.length > 0) return
    setSubTemplatesLoading(true)
    try {
      const data = await api.getLevelTemplates({ limit: 100 })
      setSubTemplates(data?.levelTemplates || [])
    } catch {
      setSubTemplates([])
    } finally {
      setSubTemplatesLoading(false)
    }
  }, [subTemplates.length])

  const loadNutritionPlans = useCallback(async () => {
    if (nutPlans.length > 0) return
    setNutPlansLoading(true)
    try {
      const data = await api.getNutritionPlans()
      setNutPlans(data?.nutritionPlanTemplates || [])
    } catch {
      setNutPlans([])
    } finally {
      setNutPlansLoading(false)
    }
  }, [nutPlans.length])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => { if (tab === "diet") loadLogs() }, [tab, loadLogs])
  useEffect(() => { if (tab === "timeline") loadTimeline() }, [tab, loadTimeline])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleSaveNutrition = async () => {
    setSavingTargets(true)
    try {
      const payload: { dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number } = {}
      const c = parseInt(kcal, 10); if (!isNaN(c)) payload.dailyCalories = c
      const p = parseInt(protein, 10); if (!isNaN(p)) payload.proteinG = p
      const g = parseInt(carbs, 10); if (!isNaN(g)) payload.carbsG = g
      const f = parseInt(fat, 10); if (!isNaN(f)) payload.fatG = f
      await api.setClientNutritionTarget(id, payload)
      await loadProfile()
      toast("Objectifs nutrition sauvegardés ✓", "success")
    } catch {
      toast("Erreur lors de la sauvegarde", "error")
    } finally {
      setSavingTargets(false)
    }
  }

  const handleApplyTemplate = (plan: NutritionPlan) => {
    setKcal(String(plan.dailyCalories))
    setProtein(String(plan.macros.proteinG))
    setCarbs(String(plan.macros.carbsG))
    setFat(String(plan.macros.fatG))
    setNutModal(false)
    toast(`Modèle "${plan.name}" appliqué — pensez à sauvegarder`, "success")
  }

  const handleOpenSubModal = () => {
    const hasSub = !!profile?.subscription
    setSubScenario(hasSub ? "renew" : "new")
    setSubEndDate(quickEndDate(30))
    setSubStartDate(format(new Date(), "yyyy-MM-dd"))
    setSelectedTemplate(profile?.subscription?.levelTemplateId?._id || "")
    setSelectedLevelName(profile?.subscription?.levelTemplateId?.name || "")
    setSelectedLevelGender((profile?.subscription?.levelTemplateId?.gender as "M" | "F") || "M")
    setSubNote("")
    setSubModal(true)
    loadLevelTemplates()
  }

  const handleSaveSubscription = async () => {
    const sub = profile?.subscription
    const templateId =
      selectedTemplate ||
      (selectedLevelName
        ? subTemplates.find(
            (t) => t.name === selectedLevelName && (t.gender || "M") === selectedLevelGender
          )?._id
        : undefined)
    setSubSaving(true)
    try {
      if (subScenario === "renew" && sub) {
        if (!subEndDate) { toast("Choisissez une date de fin", "error"); setSubSaving(false); return }
        await api.renewSubscription(sub._id, {
          newEndAt: subEndDate + "T23:59:59.999Z",
          note: subNote || undefined,
        })
        toast("Abonnement renouvelé ✓", "success")
      } else if (subScenario === "change" && sub) {
        if (!templateId) { toast("Choisissez un plan", "error"); setSubSaving(false); return }
        await api.changeSubscriptionLevel(sub._id, {
          newLevelTemplateId: templateId,
          keepDates: !subEndDate,
          ...(subEndDate ? { newEndAt: subEndDate + "T23:59:59.999Z" } : {}),
          note: subNote || undefined,
        })
        toast("Plan mis à jour ✓", "success")
      } else {
        if (!templateId) { toast("Choisissez un plan", "error"); setSubSaving(false); return }
        await api.assignSubscription({
          userId: id,
          levelTemplateId: templateId,
          startAt: subStartDate + "T00:00:00.000Z",
          endAt: subEndDate + "T23:59:59.999Z",
          note: subNote || undefined,
        })
        toast("Abonnement assigné ✓", "success")
      }
      setSubModal(false)
      await loadProfile()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e?.response?.data?.message || e?.message || "Erreur", "error")
    } finally {
      setSubSaving(false)
    }
  }

  const handleRestartProgramWeek1 = async () => {
    const s = profile?.subscription
    if (!s?._id) return
    if (
      !confirm(
        "Repartir à la semaine 1 ? La date de début du programme sera fixée à aujourd’hui (côté serveur). La date de fin d’abonnement ne change pas."
      )
    ) {
      return
    }
    setRestartS1Saving(true)
    try {
      await api.restartSubscriptionProgramWeek1(s._id)
      toast("Programme repositionné en semaine 1 ✓", "success")
      setTimelineLoaded(false)
      await loadProfile()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e?.response?.data?.message || e?.message || "Erreur", "error")
    } finally {
      setRestartS1Saving(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteMessage.trim()) return
    setNoteSaving(true)
    try {
      await api.addCoachNote(id, { date: noteDate, message: noteMessage.trim(), title: noteTitle.trim() || undefined })
      toast("Note ajoutée ✓", "success")
      setNoteModal(false)
      setNoteMessage("")
      setNoteTitle("")
      setTimelineLoaded(false)
      await loadProfile()
    } catch {
      toast("Erreur lors de l'ajout de la note", "error")
    } finally {
      setNoteSaving(false)
    }
  }

  const handleUpdateLevel = async (level: string) => {
    if (level === clientLevel) return
    setLevelSaving(true)
    try {
      await api.updateUserLevel(id, level)
      setClientLevel(level)
      toast(`Niveau mis à jour : ${level} ✓`, "success")
    } catch {
      toast("Erreur lors de la mise à jour du niveau", "error")
    } finally {
      setLevelSaving(false)
    }
  }

  // ─── Derived values ──────────────────────────────────────────────────────────

  const sub = profile?.subscription
  const levelName = sub?.levelTemplateId?.name ?? ""
  const levelGender = sub?.levelTemplateId?.gender ?? ""
  const gradientClass = LEVEL_COLORS[clientLevel] ?? LEVEL_COLORS[levelName] ?? "from-gray-600 to-gray-900"
  const isActive = sub?.effectiveStatus === "ACTIVE"
  const isExpired = sub?.effectiveStatus === "EXPIRED"
  const daysLeft = sub ? daysUntil(sub.endAt) : 0
  const currentWeek = sub ? calcCurrentWeek(sub.startAt) : 0
  const hasNutrition = !!(profile?.client?.nutritionTarget?.dailyCalories)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-40 animate-pulse bg-muted" />
        <div className="p-6 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push("/admin/clients")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux clients
        </Button>
        <p className="text-muted-foreground">Client introuvable.</p>
      </div>
    )
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview",  label: "Aperçu",         icon: ListOrdered },
    { id: "training",  label: "Entraînement",    icon: Activity },
    { id: "diet",      label: "Diet",            icon: UtensilsCrossed },
    { id: "timeline",  label: "Timeline",        icon: Calendar },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── HEADER ── */}
      <div className={cn("relative bg-gradient-to-r overflow-hidden", gradientClass)}>
        {(clientLevel || levelName) && (
          <img
            src={`/levels/${clientLevel || levelName}.png`}
            alt=""
            className="absolute right-0 top-0 h-full w-48 object-cover opacity-10 pointer-events-none select-none"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
          />
        )}
        <div className="relative z-10 px-6 pt-5 pb-0">
          {/* Back + actions row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <button
              onClick={() => router.push("/admin/clients")}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Clients
            </button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                onClick={() => { setNoteDate(format(new Date(), "yyyy-MM-dd")); setNoteMessage(""); setNoteTitle(""); setNoteModal(true) }}
              >
                <MessageSquarePlus className="h-4 w-4 mr-1.5" />
                Note coach
              </Button>
              <Button
                size="sm"
                className="bg-white text-gray-900 hover:bg-white/90 font-semibold"
                onClick={handleOpenSubModal}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {sub ? "Renouveler / Modifier" : "Configurer"}
              </Button>
            </div>
          </div>

          {/* Client identity */}
          <div className="flex items-end gap-4">
            {/* Level avatar — shows User.level badge (not the LevelTemplate) */}
            {clientLevel ? (
              <img
                src={`/levels/${clientLevel}.png`}
                alt={clientLevel}
                className="h-14 w-14 rounded-full object-cover border-2 border-white/30 shadow-lg flex-shrink-0"
                onError={(e) => {
                  const el = e.target as HTMLImageElement
                  el.style.display = "none"
                }}
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-white/50" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {clientLevel && (
                  <span className="text-white/90 text-sm font-semibold bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                    {clientLevel}
                  </span>
                )}
                {levelName && levelName !== clientLevel && (
                  <span className="text-white/60 text-xs">Programme: {levelName}</span>
                )}
                {levelGender && (
                  <span className="flex items-center gap-1 text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                    {levelGender === "F" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {levelGender === "F" ? "Femme" : "Homme"}
                  </span>
                )}
                {sub && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    isActive ? "bg-emerald-500/20 text-emerald-300" :
                    isExpired ? "bg-red-500/20 text-red-300" :
                    "bg-white/10 text-white/50"
                  )}>
                    {isActive ? "Actif" : isExpired ? "Expiré" : sub.effectiveStatus}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white truncate">
                {profile.client.name || "Client sans nom"}
              </h1>
              <p className="text-white/50 text-sm">
                {profile.client.email || profile.client.phone || "—"}
              </p>
            </div>

            {sub && (
              <div className="text-right hidden sm:block flex-shrink-0">
                <p className="text-white/40 text-xs">
                  {isActive ? "Expire le" : "Expiré le"}
                </p>
                <p className="text-white font-semibold text-sm">{fmtDate(sub.endAt)}</p>
                <p className={cn("text-xs", daysLeft > 7 ? "text-white/50" : "text-amber-300")}>
                  {daysLeft > 0 ? `J-${daysLeft}` : `J+${Math.abs(daysLeft)}`}
                </p>
              </div>
            )}
          </div>

          {/* ── Niveau du client ── always visible in header */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-white/40 text-xs font-semibold uppercase tracking-wide">Niveau :</span>
            {LEVEL_NAMES.map((lvl) => (
              <button
                key={lvl}
                disabled={levelSaving}
                onClick={() => handleUpdateLevel(lvl)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                  clientLevel === lvl
                    ? "bg-white/20 text-white border-white/40"
                    : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80",
                  levelSaving && "opacity-50 cursor-not-allowed"
                )}
              >
                <img
                  src={`/levels/${lvl}.png`}
                  alt={lvl}
                  className="h-4 w-4 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
                {lvl}
                {clientLevel === lvl && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-4">
            {tabs.map(({ id: tid, label, icon: Icon }) => (
              <button
                key={tid}
                onClick={() => setTab(tid)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors",
                  tab === tid
                    ? "bg-background text-foreground"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 p-6 space-y-4">

        {/* ── APERÇU ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Checklist */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Configuration</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Abonnement", done: profile.setupChecklist.subscription },
                  { label: "Plan entraînement", done: profile.setupChecklist.trainingPlan },
                  { label: "Diet configuré", done: hasNutrition },
                  { label: "Note récente", done: !!profile.lastCoachNote },
                ].map(({ label, done }) => (
                  <div key={label} className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                    done ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>
                    {done
                      ? <Check className="h-4 w-4 flex-shrink-0" />
                      : <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    }
                    <span className="font-medium text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cards grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Abonnement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sub ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{levelName || clientLevel || "—"}</span>
                        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                          {isActive ? "Actif" : isExpired ? "Expiré" : sub.effectiveStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isActive ? "Expire le" : "Expiré le"} {fmtDate(sub.endAt)}
                        {isActive && daysLeft <= 14 && (
                          <span className="ml-2 text-amber-500 font-medium">J-{daysLeft}</span>
                        )}
                      </p>
                      <Button size="sm" variant="outline" className="w-full mt-1 h-7 text-xs" onClick={handleOpenSubModal}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Renouveler / Modifier
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Aucun abonnement.</p>
                      <Button size="sm" className="w-full h-7 text-xs" onClick={handleOpenSubModal}>
                        Assigner un plan
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="h-4 w-4 text-muted-foreground" />
                    Nutrition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasNutrition ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{profile.client.nutritionTarget?.dailyCalories} kcal/j</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>P {profile.client.nutritionTarget?.proteinG ?? "—"}g</span>
                        <span>G {profile.client.nutritionTarget?.carbsG ?? "—"}g</span>
                        <span>L {profile.client.nutritionTarget?.fatG ?? "—"}g</span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-1 h-7 text-xs" onClick={() => setTab("diet")}>
                        Modifier les objectifs
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Aucun objectif défini.</p>
                      <Button size="sm" className="w-full h-7 text-xs mt-2" onClick={() => setTab("diet")}>
                        Configurer le diet
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent activity */}
            {(profile.lastWorkoutDate || profile.lastCoachNote) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Activité récente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {profile.lastWorkoutDate && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5" />
                      Dernière séance : {fmtDate(profile.lastWorkoutDate)}
                    </div>
                  )}
                  {profile.lastCoachNote && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{profile.lastCoachNote.title || "Note coach"}</span>
                        <span className="ml-2 text-xs">· {fmtDate(profile.lastCoachNote.date)}</span>
                        {profile.lastCoachNote.message && (
                          <p className="text-xs mt-0.5 line-clamp-2">{profile.lastCoachNote.message}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── ENTRAÎNEMENT ── */}
        {tab === "training" && (
          <div className="space-y-4">

            {!sub ? (
              <Card>
                <CardContent className="py-10 text-center space-y-3">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground">Aucun abonnement actif.</p>
                  <Button onClick={handleOpenSubModal}>Assigner un plan</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Plan d'entraînement
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSubScenario("change"); setSubModal(true); loadLevelTemplates() }}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Changer de plan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground gap-1.5"
                          disabled={!isActive || restartS1Saving}
                          onClick={() => void handleRestartProgramWeek1()}
                        >
                          {restartS1Saving && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                          {restartS1Saving ? "En cours…" : "Repartir S1"}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      {levelName && (
                        <img
                          src={`/levels/${levelName}.png`}
                          alt={levelName}
                          className="h-12 w-12 rounded-xl object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      )}
                      <div>
                        <p className="font-semibold text-lg">{levelName || "—"}</p>
                        <p className="text-sm text-muted-foreground">
                          {levelGender === "F" ? "Programme Femme" : "Programme Homme"}
                        </p>
                      </div>
                    </div>

                    {/* Week progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Semaine courante</span>
                        <span className={cn(
                          "text-sm font-bold",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {isActive ? `S${currentWeek} / 5` : "—"}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1,2,3,4,5].map((w) => (
                          <div
                            key={w}
                            className={cn(
                              "flex-1 h-2 rounded-full transition-all",
                              isActive && w < currentWeek ? "bg-primary" :
                              isActive && w === currentWeek ? "bg-primary/70" :
                              "bg-muted"
                            )}
                            title={`Semaine ${w}`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        {[1,2,3,4,5].map((w) => (
                          <span key={w} className={cn("text-[10px]", w === currentWeek && isActive ? "text-primary font-bold" : "text-muted-foreground")}>S{w}</span>
                        ))}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
                      <span>Début : {fmtDate(sub.startAt)}</span>
                      <span>{isActive ? "Fin" : "Terminé"} : {fmtDate(sub.endAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── DIET ── */}
        {tab === "diet" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="h-4 w-4 text-muted-foreground" />
                    Objectifs journaliers
                  </CardTitle>
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => { setNutModal(true); loadNutritionPlans() }}
                  >
                    Appliquer un modèle
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Calories (kcal)", value: kcal, set: setKcal, placeholder: "2200" },
                    { label: "Protéines (g)", value: protein, set: setProtein, placeholder: "160" },
                    { label: "Glucides (g)", value: carbs, set: setCarbs, placeholder: "250" },
                    { label: "Lipides (g)", value: fat, set: setFat, placeholder: "70" },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input
                        type="number" min={0}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        placeholder={placeholder}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveNutrition} disabled={savingTargets} className="w-full sm:w-auto">
                  {savingTargets ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</> : "Sauvegarder les objectifs"}
                </Button>
              </CardContent>
            </Card>

            {/* Logs */}
            {logsLoading ? (
              <div className="rounded-xl border border-border p-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : logs.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Journaux récents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border">
                          <th className="text-left pb-2 font-medium">Date</th>
                          <th className="text-right pb-2 font-medium">Kcal</th>
                          <th className="text-right pb-2 font-medium">P</th>
                          <th className="text-right pb-2 font-medium">G</th>
                          <th className="text-right pb-2 font-medium">L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.slice(0, 14).map((log, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-1.5 text-muted-foreground">{fmtDate(log.date)}</td>
                            <td className="py-1.5 text-right font-medium">{log.consumedCalories ?? "—"}</td>
                            <td className="py-1.5 text-right text-muted-foreground">{log.consumedMacros?.proteinG ?? "—"}g</td>
                            <td className="py-1.5 text-right text-muted-foreground">{log.consumedMacros?.carbsG ?? "—"}g</td>
                            <td className="py-1.5 text-right text-muted-foreground">{log.consumedMacros?.fatG ?? "—"}g</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {/* ── TIMELINE ── */}
        {tab === "timeline" && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Historique</CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                  onClick={() => { setNoteDate(format(new Date(), "yyyy-MM-dd")); setNoteMessage(""); setNoteTitle(""); setNoteModal(true) }}>
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Ajouter une note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
              ) : timeline.length === 0 ? (
                <p className="text-muted-foreground text-sm py-6 text-center">Aucun événement pour l'instant.</p>
              ) : (
                <ul className="space-y-3">
                  {timeline.map((ev, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <TimelineIcon type={ev.type} />
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium capitalize">{ev.title || ev.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(ev.date)}</p>
                        {ev.meta && typeof ev.meta.message === "string" && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">{ev.meta.message}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── SUBSCRIPTION MODAL ── */}
      <Dialog open={subModal} onOpenChange={setSubModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{sub ? "Renouveler / Modifier" : "Configurer l'abonnement"}</DialogTitle>
          </DialogHeader>

          {/* Scenario selector */}
          {sub && (
            <div className="flex gap-2 border-b border-border pb-3">
              {([
                { key: "renew", label: "Renouveler" },
                { key: "change", label: "Changer de plan" },
                { key: "new", label: "Réaffecter" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSubScenario(key)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg font-medium transition-colors",
                    subScenario === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Duration quick picks */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Durée</Label>
              <div className="flex gap-2 flex-wrap mb-2">
                {[30, 60, 90].map((d) => (
                  <Button key={d} size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setSubEndDate(quickEndDate(d))}>
                    +{d}j
                  </Button>
                ))}
              </div>
              {subScenario === "new" && (
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date début</Label>
                    <Input type="date" value={subStartDate} onChange={(e) => setSubStartDate(e.target.value)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date fin</Label>
                    <Input type="date" value={subEndDate} onChange={(e) => setSubEndDate(e.target.value)} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
              )}
              {subScenario !== "new" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Nouvelle date de fin</Label>
                  <Input type="date" value={subEndDate} onChange={(e) => setSubEndDate(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
              )}
            </div>

            {/* Training plan picker (for change or new) */}
            {(subScenario === "change" || subScenario === "new") && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                  Plan d&apos;entraînement
                </Label>
                {subTemplatesLoading ? (
                  <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Genre du plan :</span>
                      <div className="flex gap-1.5">
                        {(["M", "F"] as const).map((g) => {
                          const hasAny = subTemplates.some((t) => (t.gender || "M") === g)
                          const isActiveGender = selectedLevelGender === g
                          return (
                            <button
                              key={g}
                              type="button"
                              disabled={!hasAny}
                              onClick={() => {
                                setSelectedLevelGender(g)
                                const first = subTemplates.find((t) => (t.gender || "M") === g)
                                if (first) {
                                  setSelectedTemplate(first._id)
                                  setSelectedLevelName(first.name || "")
                                }
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                isActiveGender
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:bg-muted",
                                !hasAny && "opacity-40 cursor-not-allowed"
                              )}
                            >
                              {g === "M" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                              {g === "M" ? "Homme" : "Femme"}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                      {subTemplates.filter((t) => (t.gender || "M") === selectedLevelGender).length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground text-center">
                          Aucun plan pour ce genre. Créez-en dans Plans (menu Entraînement).
                        </p>
                      ) : (
                        subTemplates
                          .filter((t) => (t.gender || "M") === selectedLevelGender)
                          .map((t) => {
                            const isPick = selectedTemplate === t._id
                            const isCurrent = sub?.levelTemplateId?._id === t._id
                            return (
                              <button
                                key={t._id}
                                type="button"
                                onClick={() => {
                                  setSelectedTemplate(t._id)
                                  setSelectedLevelName(t.name || "")
                                  setSelectedLevelGender((t.gender || "M") as "M" | "F")
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between gap-2",
                                  isPick ? "bg-primary/10 font-medium" : "hover:bg-muted/80"
                                )}
                              >
                                <span className="truncate">{t.name || t._id}</span>
                                {isCurrent && (
                                  <span className="text-[10px] shrink-0 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Actuel
                                  </span>
                                )}
                              </button>
                            )
                          })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <Label className="text-xs text-muted-foreground">Note (optionnel)</Label>
              <Input
                value={subNote}
                onChange={(e) => setSubNote(e.target.value)}
                placeholder="Ex: Renouvellement 3 mois, upgrade Fighter → Warrior"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubModal(false)}>Annuler</Button>
            <Button onClick={handleSaveSubscription} disabled={subSaving}>
              {subSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</> : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NUTRITION TEMPLATE MODAL ── */}
      <Dialog open={nutModal} onOpenChange={setNutModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appliquer un modèle nutrition</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-96 overflow-y-auto">
            {nutPlansLoading ? (
              <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
            ) : nutPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun modèle nutrition disponible.
              </p>
            ) : (
              nutPlans.map((plan) => (
                <button
                  key={plan._id}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                  onClick={() => handleApplyTemplate(plan)}
                >
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {GOAL_LABELS[plan.goalType] || plan.goalType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {plan.macros.proteinG}P · {plan.macros.carbsG}G · {plan.macros.fatG}L
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{plan.dailyCalories}</p>
                    <p className="text-[10px] text-muted-foreground">kcal/j</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNutModal(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NOTE MODAL ── */}
      <Dialog open={noteModal} onOpenChange={setNoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note coach</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Date</Label>
              <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm">Titre (optionnel)</Label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Ex: Check-in hebdomadaire" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm">Message</Label>
              <Textarea value={noteMessage} onChange={(e) => setNoteMessage(e.target.value)} placeholder="Votre note pour ce client…" rows={4} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModal(false)}>Annuler</Button>
            <Button onClick={handleAddNote} disabled={!noteMessage.trim() || noteSaving}>
              {noteSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</> : "Enregistrer la note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
