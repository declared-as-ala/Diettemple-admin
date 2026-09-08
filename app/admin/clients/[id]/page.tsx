"use client"

import { useCallback, useEffect, useState } from "react"
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
import TimelineTab from "@/components/client-detail/TimelineTab"
import WorkoutPlanModal from "@/components/client-detail/WorkoutPlanModal"
import ClientProfileModal from "@/components/client-detail/ClientProfileModal"
import NoteModal from "@/components/client-detail/NoteModal"
import NutritionTemplateModal from "@/components/client-detail/NutritionTemplateModal"
import ClientDetailSkeleton from "@/components/client-detail/ClientDetailSkeleton"
import { useClientProfile } from "@/components/client-detail/useClientProfile"
import type { TabId, OrderFilter, NutritionPlan } from "@/components/client-detail/types"
import { ConfirmModal } from "@/components/shared/ConfirmModal"

export default function AdminClientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { toast } = useToast()

  const {
    profile, profileLoading, profileError, refetchProfile,
    timeline, timelineLoading,
    orders, ordersLoading,
    exerciseHistory, exerciseHistoryLoading,
    levelTemplates, levelTemplatesLoading, loadLevelTemplates,
    nutritionPlans, nutritionPlansLoading,
    planAssignment, planAssignmentLoading, refetchPlanAssignment,
    ensureTabData, invalidateTimeline,
  } = useClientProfile(id)

  // ─── Tab state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabId>("fiche")
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all")

  // ─── Client level (User.level — separate from LevelTemplate) ───────────
  const [clientLevel, setClientLevel] = useState("")

  // ─── Subscription / Plan modal state ───────────────────────────────────
  const [restartS1Saving, setRestartS1Saving] = useState(false)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // ─── Workout plan modal state ──────────────────────────────────────────
  const [planModal, setPlanModal] = useState(false)
  const [planTemplate, setPlanTemplate] = useState("")
  const [planLevelGender, setPlanLevelGender] = useState<"M" | "F">("M")
  const [planStartDate, setPlanStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [planNote, setPlanNote] = useState("")
  const [planSaving, setPlanSaving] = useState(false)

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
    setPlanTemplate("")
    setPlanLevelGender((planAssignment?.levelGender as "M" | "F") || "M")
    setPlanStartDate(planAssignment?.endDate?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"))
    setPlanNote("")
    setPlanModal(true)
    loadLevelTemplates()
  }, [planAssignment, loadLevelTemplates])

  // ─── Workout plan (PlanAssignment) handlers ────────────────────────────

  const handleOpenAssignWorkoutPlan = useCallback(() => {
    setPlanTemplate("")
    setPlanLevelGender("M")
    setPlanStartDate(format(new Date(), "yyyy-MM-dd"))
    setPlanNote("")
    setPlanModal(true)
    loadLevelTemplates()
  }, [loadLevelTemplates])

  const handleOpenChangeWorkoutPlan = useCallback(() => {
    if (planAssignment?.levelGender) {
      setPlanLevelGender((planAssignment.levelGender as "M" | "F") ?? "M")
    }
    setPlanTemplate("")
    setPlanStartDate(planAssignment?.endDate?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"))
    setPlanNote("")
    setPlanModal(true)
    loadLevelTemplates()
  }, [planAssignment, loadLevelTemplates])

  const handleSaveWorkoutPlan = useCallback(async () => {
    if (!planTemplate) { toast("Choisissez un programme", "error"); return }
    if (!planStartDate) { toast("Choisissez une date de début", "error"); return }
    setPlanSaving(true)
    try {
      if (planAssignment) {
        await api.changeWorkoutPlan(id, {
          planTemplateId: planTemplate,
          startDate: planStartDate + "T00:00:00.000Z",
          note: planNote || undefined,
        })
        toast("Programme changé ✓", "success")
      } else {
        await api.assignWorkoutPlan({
          userId: id,
          planTemplateId: planTemplate,
          startDate: planStartDate + "T00:00:00.000Z",
          note: planNote || undefined,
        })
        toast("Programme assigné ✓", "success")
      }
      setPlanModal(false)
      await refetchPlanAssignment()
      invalidateTimeline()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e?.response?.data?.message || e?.message || "Erreur", "error")
    } finally {
      setPlanSaving(false)
    }
  }, [id, planTemplate, planStartDate, planNote, planAssignment, toast, refetchPlanAssignment, invalidateTimeline])

  const handleRenewWorkoutPlan = useCallback(async () => {
    try {
      await api.renewWorkoutPlan(id)
      toast("Renouvellement planifié à la suite du plan actuel", "success")
      setPlanModal(false)
      await Promise.all([refetchPlanAssignment(), refetchProfile()])
      invalidateTimeline()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Renouvellement impossible", "error")
    }
  }, [id, invalidateTimeline, refetchPlanAssignment, refetchProfile, toast])

  const handleRestartProgramWeek1 = useCallback(async () => {
    if (!planAssignment?.id) return
    setRestartS1Saving(true)
    try {
      await api.restartWorkoutPlanWeek1(id)
      toast("Programme redémarré en semaine 1 ✓", "success")
      invalidateTimeline()
      await refetchPlanAssignment()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast(e?.response?.data?.message || e?.message || "Erreur", "error")
    } finally {
      setRestartS1Saving(false)
    }
  }, [planAssignment?.id, id, toast, invalidateTimeline, refetchPlanAssignment])

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

  const handleApplyTemplate = useCallback(
    async (plan: NutritionPlan) => {
      try {
        await api.setClientNutritionTarget(id, {
          dailyCalories: plan.dailyCalories,
          proteinG: plan.macros.proteinG,
          carbsG: plan.macros.carbsG,
          fatG: plan.macros.fatG,
        })
        setNutModal(false)
        await refetchProfile()
        toast(`Modèle "${plan.name}" appliqué ✓`, "success")
      } catch {
        toast("Erreur lors de l'application du modèle", "error")
      }
    },
    [id, refetchProfile, toast]
  )

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
        planAssignment={planAssignment}
      />

      <div className="flex-1 px-6 py-6">
        {tab === "fiche" && (
          <OverviewTab
            profile={profile}
            planAssignment={planAssignment}
            orders={orders}
            ordersLoading={ordersLoading}
            orderFilter={orderFilter}
            onOrderFilterChange={setOrderFilter}
            onOpenEditFiche={() => setProfileModalOpen(true)}
            onOpenSubModal={handleOpenSubModal}
            onOpenNoteModal={handleOpenNoteModal}
            onGoToPlan={() => setTab("plan")}
            onRefetchProfile={refetchProfile}
          />
        )}

        {tab === "plan" && (
          <TrainingTab
            planAssignment={planAssignment}
            planAssignmentLoading={planAssignmentLoading}
            exerciseHistory={exerciseHistory}
            exerciseHistoryLoading={exerciseHistoryLoading}
            restartS1Saving={restartS1Saving}
            onOpenSubModal={handleOpenSubModal}
            onAssignWorkoutPlan={handleOpenAssignWorkoutPlan}
            onChangeWorkoutPlan={handleOpenChangeWorkoutPlan}
            onRestartWeek1={() => setRestartConfirmOpen(true)}
            onRenewPlan={handleRenewWorkoutPlan}
          />
        )}

        {tab === "journal" && (
          <TimelineTab
            timeline={timeline}
            timelineLoading={timelineLoading}
            onOpenNoteModal={handleOpenNoteModal}
          />
        )}
      </div>

      <ClientProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        profile={profile}
        onSaved={refetchProfile}
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

      <WorkoutPlanModal
        open={planModal}
        onOpenChange={setPlanModal}
        clientId={id}
        currentAssignment={planAssignment}
        templates={levelTemplates}
        templatesLoading={levelTemplatesLoading}
        selectedTemplate={planTemplate}
        onSelectTemplate={(tid, _name, gender) => { setPlanTemplate(tid); setPlanLevelGender(gender) }}
        selectedGender={planLevelGender}
        onGenderChange={setPlanLevelGender}
        startDate={planStartDate}
        onStartDateChange={setPlanStartDate}
        note={planNote}
        onNoteChange={setPlanNote}
        saving={planSaving}
        onSave={handleSaveWorkoutPlan}
        onRenew={handleRenewWorkoutPlan}
      />

      <ConfirmModal
        open={restartConfirmOpen}
        onOpenChange={setRestartConfirmOpen}
        title="Redémarrer le programme en semaine 1 ?"
        description="La date de début du programme sera fixée à aujourd’hui. L’abonnement et l’historique existants ne seront pas supprimés."
        confirmLabel="Redémarrer en semaine 1"
        cancelLabel="Annuler"
        variant="default"
        loading={restartS1Saving}
        onConfirm={handleRestartProgramWeek1}
      />
    </div>
  )
}
