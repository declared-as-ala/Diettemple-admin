// ─── Client 360 shared types ─────────────────────────────────────────────────

export type TabId = "overview" | "training" | "diet" | "timeline"

export interface PlanAssignmentData {
  id: string
  startDate: string
  endDate: string
  durationWeeks: 5
  status: "active" | "completed" | "paused" | "archived"
  planTemplateId?: string
  levelName?: string
  levelGender?: string
  assignedAt?: string
  note?: string
  progress?: {
    currentWeek?: number
    totalWeeks?: number
    totalScheduledSessions?: number
    completedSessions?: number
    completionPercent?: number
    remainingDays?: number
    status?: "active" | "expired" | "not_started"
  }
}

export type OrderFilter = "all" | "paid" | "unpaid" | "delivered"

export type SubScenario = "renew" | "change" | "new"

export interface ClientData {
  _id: string
  name?: string
  email?: string
  phone?: string
  sexe?: string
  age?: string
  taille?: string
  poids?: string
  objectif?: string
  level?: string
  photoUri?: string
  createdAt?: string
  updatedAt?: string
  nutritionTarget?: {
    dailyCalories?: number
    proteinG?: number
    carbsG?: number
    fatG?: number
  }
}

export interface SubscriptionData {
  _id: string
  levelTemplateId?: { _id?: string; name?: string; gender?: string }
  effectiveStatus: string
  startAt: string
  endAt: string
  history?: Array<{ action: string; date: string; note?: string }>
}

export interface ProfileCompletionFlags {
  hasName: boolean
  hasPhoto: boolean
  hasSexe: boolean
  hasAge: boolean
  hasTaille: boolean
  hasPoids: boolean
  hasEmailOrPhone: boolean
}

export interface ProfileData {
  client: ClientData
  subscription: SubscriptionData | null
  nutritionAssignment: null
  lastCoachNote: { date: string; message?: string; title?: string } | null
  lastWorkoutDate: string | null
  profileMeta?: {
    photoUri?: string | null
    sexe?: string | null
    age?: string | null
    ageValue?: number | null
    taille?: string | null
    poids?: string | null
    objectif?: string | null
    profileCompletion?: ProfileCompletionFlags
  }
  commerceSummary?: {
    totalOrders: number
    paidOrders: number
    totalSpent: number
    lastOrderAt?: string | null
  }
  setupChecklist: {
    subscription: boolean
    trainingPlan: boolean
    dietPlan: boolean
    nextCheckIn: boolean
  }
}

export interface ClientOrder {
  _id: string
  reference?: string
  status: string
  paymentStatus: string
  paymentMethod?: string | null
  totalPrice: number
  createdAt: string
}

export interface ExerciseLoadHistoryItem {
  exerciseId: string
  exerciseName: string
  muscleGroup?: string | null
  lastWeight: number
  lastReps: number[]
  totalVolume: number
  lastCompletedAt?: string | null
  progressionStatus: "stable" | "eligible" | "failed"
  sets: Array<{
    setNumber: number
    weightKg: number
    reps: number
    completed: boolean
    completedAt?: string | null
  }>
  sessions?: Array<{
    sessionDate?: string | null
    completedAt?: string | null
    sets: Array<{
      setNumber: number
      weightKg: number
      reps: number
      completed: boolean
      completedAt?: string | null
    }>
  }>
}

export interface NutritionLog {
  date: string
  consumedCalories?: number
  consumedMacros?: { proteinG?: number; carbsG?: number; fatG?: number }
}

export interface TimelineEvent {
  type: string
  date: string
  title?: string
  meta?: Record<string, unknown>
}

export interface LevelTemplate {
  _id: string
  name: string
  gender?: string
  isActive?: boolean
}

export interface NutritionPlan {
  _id: string
  name: string
  goalType: string
  dailyCalories: number
  macros: { proteinG: number; carbsG: number; fatG: number }
}

export type RecommendationSeverity = "high" | "medium" | "low"

export interface Recommendation {
  id: string
  message: string
  severity: RecommendationSeverity
  actionLabel: string
  action: () => void
}
