"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import type {
  ProfileData, ClientOrder, ExerciseLoadHistoryItem, NutritionLog,
  TimelineEvent, LevelTemplate, NutritionPlan, TabId, PlanAssignmentData,
} from "./types"

// Centralized data + action hook for the client detail page.
// Tab-specific datasets are loaded lazily and cached after first fetch.

export function useClientProfile(id: string) {
  const { toast } = useToast()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsLoaded, setLogsLoaded] = useState(false)

  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineLoaded, setTimelineLoaded] = useState(false)

  const [orders, setOrders] = useState<ClientOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)

  const [exerciseHistory, setExerciseHistory] = useState<ExerciseLoadHistoryItem[]>([])
  const [exerciseHistoryLoading, setExerciseHistoryLoading] = useState(false)
  const [exerciseHistoryLoaded, setExerciseHistoryLoaded] = useState(false)

  const [levelTemplates, setLevelTemplates] = useState<LevelTemplate[]>([])
  const [levelTemplatesLoading, setLevelTemplatesLoading] = useState(false)

  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([])
  const [nutritionPlansLoading, setNutritionPlansLoading] = useState(false)

  const [planAssignment, setPlanAssignment] = useState<PlanAssignmentData | null>(null)
  const [planAssignmentLoading, setPlanAssignmentLoading] = useState(false)

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    if (!id) return
    setProfileLoading(true)
    setProfileError(null)
    try {
      const data = await api.getClient(id)
      setProfile(data)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setProfileError(e?.message || "Erreur de chargement")
      toast("Erreur de chargement du client", "error")
    } finally {
      setProfileLoading(false)
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

  const loadOrders = useCallback(async () => {
    if (!id || ordersLoaded) return
    setOrdersLoading(true)
    try {
      const data = await api.getClientOrders(id, { limit: 30 })
      setOrders(data?.orders || [])
      setOrdersLoaded(true)
    } catch {
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [id, ordersLoaded])

  const loadExerciseHistory = useCallback(async () => {
    if (!id || exerciseHistoryLoaded) return
    setExerciseHistoryLoading(true)
    try {
      const data = await api.getClientExerciseLoadHistory(id, { limit: 40 })
      setExerciseHistory(data?.items || [])
      setExerciseHistoryLoaded(true)
    } catch {
      setExerciseHistory([])
    } finally {
      setExerciseHistoryLoading(false)
    }
  }, [id, exerciseHistoryLoaded])

  const loadLevelTemplates = useCallback(async () => {
    if (levelTemplates.length > 0) return
    setLevelTemplatesLoading(true)
    try {
      const data = await api.getLevelTemplates({ limit: 100 })
      setLevelTemplates(data?.levelTemplates || [])
    } catch {
      setLevelTemplates([])
    } finally {
      setLevelTemplatesLoading(false)
    }
  }, [levelTemplates.length])

  const loadPlanAssignment = useCallback(async () => {
    if (!id) return
    setPlanAssignmentLoading(true)
    try {
      const data = await api.getWorkoutPlan(id)
      if (data?.assignment) {
        setPlanAssignment({
          id: data.assignment.id,
          startDate: data.assignment.startDate,
          endDate: data.assignment.endDate,
          durationWeeks: 5,
          status: data.assignment.status,
          levelName: data.plan?.name,
          levelGender: data.plan?.gender,
          progress: {
            currentWeek: data.progress?.currentWeek != null ? Number(data.progress.currentWeek) + 1 : undefined,
            totalWeeks: data.progress?.totalWeeks,
            totalScheduledSessions: data.progress?.totalScheduledSessions,
            completedSessions: data.progress?.completedSessions,
            completionPercent: data.progress?.completionPercent,
            remainingDays: data.progress?.remainingDays,
            status: data.progress?.status,
          },
        })
      } else {
        setPlanAssignment(null)
      }
    } catch {
      setPlanAssignment(null)
    } finally {
      setPlanAssignmentLoading(false)
    }
  }, [id])

  const loadNutritionPlans = useCallback(async () => {
    if (nutritionPlans.length > 0) return
    setNutritionPlansLoading(true)
    try {
      const data = await api.getNutritionPlans()
      setNutritionPlans(data?.nutritionPlanTemplates || [])
    } catch {
      setNutritionPlans([])
    } finally {
      setNutritionPlansLoading(false)
    }
  }, [nutritionPlans.length])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Trigger lazy tab loaders based on active tab
  const ensureTabData = useCallback(
    (tab: TabId) => {
      if (tab === "overview") loadOrders()
      if (tab === "diet") loadLogs()
      if (tab === "timeline") loadTimeline()
      if (tab === "training") { loadExerciseHistory(); loadPlanAssignment() }
    },
    [loadOrders, loadLogs, loadTimeline, loadExerciseHistory, loadPlanAssignment]
  )

  // ─── Invalidate caches after mutations ───────────────────────────────────

  const invalidateTimeline = useCallback(() => setTimelineLoaded(false), [])
  const refetchPlanAssignment = useCallback(() => loadPlanAssignment(), [loadPlanAssignment])

  return {
    profile,
    profileLoading,
    profileError,
    refetchProfile: loadProfile,

    logs,
    logsLoading,
    timeline,
    timelineLoading,
    orders,
    ordersLoading,
    exerciseHistory,
    exerciseHistoryLoading,

    levelTemplates,
    levelTemplatesLoading,
    loadLevelTemplates,

    nutritionPlans,
    nutritionPlansLoading,
    loadNutritionPlans,

    planAssignment,
    planAssignmentLoading,
    refetchPlanAssignment,

    ensureTabData,
    invalidateTimeline,
  }
}
