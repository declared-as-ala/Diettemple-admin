"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

// Client 360 components
import ClientHeader from "@/components/client-detail/ClientHeader"
import OverviewTab from "@/components/client-detail/OverviewTab"
import TrainingTab from "@/components/client-detail/TrainingTab"
import DietTab from "@/components/client-detail/DietTab"
import TimelineTab from "@/components/client-detail/TimelineTab"
import SubscriptionModal from "@/components/client-detail/SubscriptionModal"
import NoteModal from "@/components/client-detail/NoteModal"
import NutritionTemplateModal from "@/components/client-detail/NutritionTemplateModal"
import ClientDetailSkeleton from "@/components/client-detail/ClientDetailSkeleton"
import { useClientProfile } from "@/components/client-detail/useClientProfile"
import type {
  TabId, OrderFilter, SubScenario, Recommendation, NutritionPlan,
} from "@/components/client-detail/types"
import { quickEndDate } from "@/components/client-detail/utils"

export default function AdminClientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { toast } = useToast()

  const {
    profile, profileLoading, profileError, refetchProfile,
    logs, logsLoading,
    timeline, timelineLoading,
    orders, ordersLoading,
    exerciseHistory, exerciseHistoryLoading,
    levelTemplates, levelTemplatesLoading, loadLevelTemplates,
    nutritionPlans, nutritionPlansLoading, loadNutritionPlans,
    ensureTabData, invalidateTimeline,
  } = useClientProfile(id)

  // ─── Tab state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabId>("overview")
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all")

  // ─── Client level (User.level — separate from LevelTemplate) ───────────
  const [clientLevel, setClientLevel] = useState("")
  const [levelSaving, setLevelSaving] = useState(false)

  // ─── Nutrition target form state ───────────────────────────────────────
  const [kcal, setKcal] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [savingTargets, setSavingTargets] = useState(false)

  // ─── Subscription modal state ──────────────────────────────────────────
  const [subModal, setSubModal] = useState(false)
  const [subScenario, setSubScenario] = useState<SubScenario>("renew")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedLevelName, setSelectedLevelName] = useState("")
  const [selectedLevelGender, setSelectedLevelGender] = useState<"M" | "F">("M")
  const [subEndDate, setSubEndDate] = useState("")
  const [subStartDate, setSubStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [subNote, setSubNote] = useState("")
  const [subSaving, setSubSaving] = useState(false)
  const [restartS1Saving, setRestartS1Saving] = useState(false)

  // ─── Note modal state ──────────────────────────────────────────────────
  const [noteModal, setNoteModal] = useState(false)
  const [noteDate, setNoteDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [noteTitle, setNoteTitle] = useState("")
  const [noteMessage, setNoteMessage] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)

  // ─── Nutrition template modal ──────────────────────────────────────────
  const [nutModal, setNutModal] = useState(false)

  // ─── Sync derived state when profile loads ─────────────────────────────
  useEffect(() => {
    if (!profile) return
    if (profile.client?.level) setClientLevel(profile.client.level)
    const nt = profile.client?.nutritionTarget
    if (nt) {
      setKcal(nt.dailyCalories ? String(nt.dailyCalories) : "")
      setProtein(nt.proteinG ? String(nt.proteinG) : "")
      setCarbs(nt.carbsG ? String(nt.carbsG) : "")
      setFat(nt.fatG ? String(nt.fatG) : "")
    }
  }, [profile])

  // ─── Trigger lazy tab data on tab change ───────────────────────────────
  useEffect(() => {
    ensureTabData(tab)
  }, [tab, ensureTabData])

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleOpenNoteModal = useCallback(() => {
    setNoteDate(format(new Date(), "yyyy-MM-dd"))
    setNoteMessage("")
    setNoteTitle("")
    setNoteModal(true)
  }, [])

  const handleOpenSubModal = useCallback(() => {
    const hasSub = !!profile?.subscription
    setSubScenario(hasSub ? "renew" : "new")
    setSubEndDate(quickEndDate(30))
    setSubStartDate(format(new Date(), "yyyy-MM-dd"))
    setSelectedTemplate(profile?.subscription?.levelTemplateId?._id || "")
    setSelectedLevelName(profile?.subscription?.levelTemplateId?.name || "")
    setSelectedLevelGender(
      (profile?.subscription?.levelTemplateId?.gender as "M" | "F") || "M"
    )
    setSubNote("")
    setSubModal(true)
    loadLevelTemplates()
  }, [profile, loadLevelTemplates])

  const handleChangePlan = useCallback(() => {
    setSubScenario("change")
    setSubModal(true)
    loadLevelTemplates()
  }, [loadLevelTemplates])

  const handleSaveSubscription = useCallback(async () => {
    const sub = profile?.subscription
    const templateId =
      selectedTemplate ||
      (selectedLevelName
        ? levelTemplates.find(
            (t) => t.name === selectedLevelName && (t.gender || "M") === selectedLevelGender
          )?._id
        : undefined)
    setSubSaving(true)
    try {
      if (subScenario === "renew" && sub) {
        if (!subEndDate) {
          toast("Choisissez une date de fin", "error")
          setSubSaving(false)
          return
        }
        await api.renewSubscription(sub._id, {
          newEndAt: subEndDate + "T23:59:59.999Z",
          note: subNote || undefined,
        })
        toast("Abonnement renouvelé ✓", "success")
      } else if (subScenario === "change" && sub) {
        if (!templateId) {
          toast("Choisissez un plan", "error")
          setSubSaving(false)
          return
        }
        await api.changeSubscriptionLevel(sub._id, {
          newLevelTemplateId: templateId,
          keepDates: !subEndDate,
          ...(subEndDate ? { newEndAt: subEndDate + "T23:59:59.999Z" } : {}),
          note: subNote || undefined,
        })
        toast("Plan mis à jour ✓", "success")
      } else {
        if (!templateId) {
          toast("Choisissez un plan", "error")
          setSubSaving(false)
          return
        }
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
      invalidateTimeline()
      await refetchProfile()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e?.response?.data?.message || e?.message || "Erreur", "error")
    } finally {
      setSubSaving(false)
    }
  }, [
    profile, selectedTemplate, selectedLevelName, levelTemplates, selectedLevelGender,
    subScenario, subEndDate, subStartDate, subNote, id, toast, invalidateTimeline, refetchProfile,
  ])

  const handleRestartProgramWeek1 = useCallback(async () => {
    const s = profile?.subscription
    if (!s?._id) return
    if (
      !confirm(
        "Repartir à la semaine 1 ? La date de début du programme sera fixée à aujourd'hui (côté serveur). La date de fin d'abonnement ne change pas."
      )
    ) {
      return
    }
    setRestartS1Saving(true)
    try {
      await api.restartSubscriptionProgramWeek1(s._id)
      toast("Programme repositionné en semaine 1 ✓", "success")
      invalidateTimeline()
      await refetchProfile()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e?.response?.data?.message || e?.message || "Erreur", "error")
    } finally {
      setRestartS1Saving(false)
    }
  }, [profile, toast, invalidateTimeline, refetchProfile])

  const handleAddNote = useCallback(async () => {
    if (!noteMessage.trim()) return
    setNoteSaving(true)
    try {
      await api.addCoachNote(id, {
        date: noteDate,
        message: noteMessage.trim(),
        title: noteTitle.trim() || undefined,
      })
      toast("Note ajoutée ✓", "success")
      setNoteModal(false)
      setNoteMessage("")
      setNoteTitle("")
      invalidateTimeline()
      await refetchProfile()
    } catch {
      toast("Erreur lors de l'ajout de la note", "error")
    } finally {
      setNoteSaving(false)
    }
  }, [id, noteDate, noteMessage, noteTitle, toast, invalidateTimeline, refetchProfile])

  const handleUpdateLevel = useCallback(
    async (level: string) => {
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
    },
    [id, clientLevel, toast]
  )

  const handleSaveNutrition = useCallback(async () => {
    setSavingTargets(true)
    try {
      const payload: {
        dailyCalories?: number
        proteinG?: number
        carbsG?: number
        fatG?: number
      } = {}
      const c = parseInt(kcal, 10)
      if (!isNaN(c)) payload.dailyCalories = c
      const p = parseInt(protein, 10)
      if (!isNaN(p)) payload.proteinG = p
      const g = parseInt(carbs, 10)
      if (!isNaN(g)) payload.carbsG = g
      const f = parseInt(fat, 10)
      if (!isNaN(f)) payload.fatG = f
      await api.setClientNutritionTarget(id, payload)
      await refetchProfile()
      toast("Objectifs nutrition sauvegardés ✓", "success")
    } catch {
      toast("Erreur lors de la sauvegarde", "error")
    } finally {
      setSavingTargets(false)
    }
  }, [id, kcal, protein, carbs, fat, toast, refetchProfile])

  const handleApplyTemplate = useCallback(
    (plan: NutritionPlan) => {
      setKcal(String(plan.dailyCalories))
      setProtein(String(plan.macros.proteinG))
      setCarbs(String(plan.macros.carbsG))
      setFat(String(plan.macros.fatG))
      setNutModal(false)
      toast(`Modèle "${plan.name}" appliqué — pensez à sauvegarder`, "success")
    },
    [toast]
  )

  // ─── Recommendations engine ─────────────────────────────────────────────

  const recommendations = useMemo<Recommendation[]>(() => {
    if (!profile) return []
    const completion = profile.profileMeta?.profileCompletion
    const commerce = profile.commerceSummary
    const list: Recommendation[] = []

    // HIGH severity
    if (!profile.setupChecklist.subscription) {
      list.push({
        id: "no-subscription",
        message: "Aucun abonnement actif — le client n'a pas accès au coaching.",
        severity: "high",
        actionLabel: "Assigner",
        action: handleOpenSubModal,
      })
    }
    if (!profile.lastWorkoutDate && profile.setupChecklist.subscription) {
      list.push({
        id: "no-workout",
        message: "Aucune séance enregistrée — vérifier l'engagement du client.",
        severity: "high",
        actionLabel: "Ajouter note",
        action: handleOpenNoteModal,
      })
    }

    // MEDIUM severity
    if (!profile.client?.nutritionTarget?.dailyCalories) {
      list.push({
        id: "no-nutrition",
        message: "Objectifs nutrition non définis.",
        severity: "medium",
        actionLabel: "Configurer diet",
        action: () => setTab("diet"),
      })
    }
    if (!profile.lastCoachNote) {
      list.push({
        id: "no-note",
        message: "Aucune note coach — planifier un suivi personnalisé.",
        severity: "medium",
        actionLabel: "Ajouter note",
        action: handleOpenNoteModal,
      })
    }
    if (!completion?.hasPhoto) {
      list.push({
        id: "no-photo",
        message: "Photo de profil manquante.",
        severity: "medium",
        actionLabel: "Voir profil",
        action: () => setTab("overview"),
      })
    }

    // LOW severity
    if (!completion?.hasAge || !completion?.hasTaille || !completion?.hasPoids) {
      list.push({
        id: "missing-body-metrics",
        message: "Âge / taille / poids incomplets — bloque le calcul des macros.",
        severity: "low",
        actionLabel: "Compléter",
        action: () => setTab("overview"),
      })
    }
    if (!completion?.hasSexe) {
      list.push({
        id: "no-gender",
        message: "Sexe du client non renseigné.",
        severity: "low",
        actionLabel: "Compléter",
        action: () => setTab("overview"),
      })
    }
    if ((commerce?.totalOrders ?? 0) === 0) {
      list.push({
        id: "no-orders",
        message: "Aucune commande — opportunité upsell suppléments/coaching.",
        severity: "low",
        actionLabel: "Voir boutique",
        action: () => router.push("/admin/products"),
      })
    }

    // Sort by severity: high → medium → low
    const order: Record<Recommendation["severity"], number> = { high: 0, medium: 1, low: 2 }
    return list.sort((a, b) => order[a.severity] - order[b.severity])
  }, [profile, handleOpenSubModal, handleOpenNoteModal, router])

  // ─── Render guards ──────────────────────────────────────────────────────

  if (profileLoading && !profile) return <ClientDetailSkeleton />

  if (profileError || !profile) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20 text-center">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/clients")}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux clients
        </Button>
        <p className="text-sm text-muted-foreground">
          {profileError || "Client introuvable."}
        </p>
        <Button className="mt-4" onClick={refetchProfile}>
          Réessayer
        </Button>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ClientHeader
        profile={profile}
        clientLevel={clientLevel}
        tab={tab}
        onTabChange={setTab}
        onBack={() => router.push("/admin/clients")}
        onOpenSubModal={handleOpenSubModal}
        onOpenNoteModal={handleOpenNoteModal}
        onUpdateLevel={handleUpdateLevel}
        levelSaving={levelSaving}
      />

      <div className="flex-1 px-6 py-6">
        {tab === "overview" && (
          <OverviewTab
            profile={profile}
            orders={orders}
            ordersLoading={ordersLoading}
            orderFilter={orderFilter}
            onOrderFilterChange={setOrderFilter}
            recommendations={recommendations}
            onOpenSubModal={handleOpenSubModal}
            onOpenNoteModal={handleOpenNoteModal}
            onGoToDiet={() => setTab("diet")}
            onGoToTraining={() => setTab("training")}
          />
        )}

        {tab === "training" && (
          <TrainingTab
            profile={profile}
            exerciseHistory={exerciseHistory}
            exerciseHistoryLoading={exerciseHistoryLoading}
            restartS1Saving={restartS1Saving}
            onOpenSubModal={handleOpenSubModal}
            onChangePlan={handleChangePlan}
            onRestartWeek1={handleRestartProgramWeek1}
          />
        )}

        {tab === "diet" && (
          <DietTab
            kcal={kcal}
            protein={protein}
            carbs={carbs}
            fat={fat}
            onKcalChange={setKcal}
            onProteinChange={setProtein}
            onCarbsChange={setCarbs}
            onFatChange={setFat}
            onSave={handleSaveNutrition}
            savingTargets={savingTargets}
            onOpenTemplateModal={() => {
              setNutModal(true)
              loadNutritionPlans()
            }}
            logs={logs}
            logsLoading={logsLoading}
          />
        )}

        {tab === "timeline" && (
          <TimelineTab
            timeline={timeline}
            timelineLoading={timelineLoading}
            onOpenNoteModal={handleOpenNoteModal}
          />
        )}
      </div>

      <SubscriptionModal
        open={subModal}
        onOpenChange={setSubModal}
        sub={profile.subscription}
        scenario={subScenario}
        onScenarioChange={setSubScenario}
        templates={levelTemplates}
        templatesLoading={levelTemplatesLoading}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(id, name, gender) => {
          setSelectedTemplate(id)
          setSelectedLevelName(name)
          setSelectedLevelGender(gender)
        }}
        selectedGender={selectedLevelGender}
        onGenderChange={setSelectedLevelGender}
        endDate={subEndDate}
        onEndDateChange={setSubEndDate}
        startDate={subStartDate}
        onStartDateChange={setSubStartDate}
        note={subNote}
        onNoteChange={setSubNote}
        saving={subSaving}
        onSave={handleSaveSubscription}
      />

      <NoteModal
        open={noteModal}
        onOpenChange={setNoteModal}
        date={noteDate}
        onDateChange={setNoteDate}
        title={noteTitle}
        onTitleChange={setNoteTitle}
        message={noteMessage}
        onMessageChange={setNoteMessage}
        saving={noteSaving}
        onSave={handleAddNote}
      />

      <NutritionTemplateModal
        open={nutModal}
        onOpenChange={setNutModal}
        plans={nutritionPlans}
        plansLoading={nutritionPlansLoading}
        onApply={handleApplyTemplate}
      />
    </div>
  )
}
