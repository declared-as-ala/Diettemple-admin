/**
 * Pure helpers for the relative-cycle plan builder state.
 * Sessions are ORDERED and relative (session 1, session 2, …) with a number of
 * rest days after the previous session — never tied to a real weekday. All
 * functions are immutable; they return new state.
 *
 * `days{mon..sun}` is still round-tripped (positional legacy slots, mon = offset 0)
 * so the backend can keep every existing reader of that shape in sync — see
 * sessionsToDays()/daysToSessions() below.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface SessionPlacement {
  placementId: string;
  sessionTemplateId: string;
  note?: string;
  order?: number;
}

/** One ordered session slot in the relative-cycle builder. */
export interface PlannedSession {
  /** Client-only id for React keys / drag-and-drop — never sent to the API. */
  id: string;
  sessionTemplateId: string;
  /** Rest days between this session and the previous one (0 for the first session of the week). */
  restDaysAfterPrevious: number;
}

export interface WeekState {
  weekNumber: number;
  /** Legacy positional day slots — kept in sync, not edited directly by the new builder UI. */
  days: Record<DayKey, SessionPlacement[]>;
  sessions: PlannedSession[];
  minimumCompletedSessions: number;
  isRestWeek: boolean;
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Cumulative recommendedDayOffset (0-6) for each session, derived from restDaysAfterPrevious. */
export function computeOffsets(sessions: PlannedSession[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  sessions.forEach((s, idx) => {
    if (idx === 0) {
      cursor = 0;
    } else {
      cursor = cursor + 1 + Math.max(0, s.restDaysAfterPrevious || 0);
    }
    offsets.push(Math.min(cursor, 6));
  });
  return offsets;
}

/** True if the cumulative offsets stay inside a single 7-day cycle (0-6, non-decreasing, no overflow). */
export function offsetsFitInCycle(sessions: PlannedSession[]): boolean {
  let cursor = 0;
  for (let i = 0; i < sessions.length; i++) {
    if (i === 0) continue;
    cursor = cursor + 1 + Math.max(0, sessions[i].restDaysAfterPrevious || 0);
    if (cursor > 6) return false;
  }
  return true;
}

export function countWeekSessions(week: WeekState): number {
  return week.sessions.length;
}

export function addSession(weeks: WeekState[], weekIndex: number, sessionTemplateId: string): WeekState[] {
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    const sessions = [...w.sessions, { id: nextId("s"), sessionTemplateId, restDaysAfterPrevious: 1 }];
    return {
      ...w,
      sessions,
      isRestWeek: false,
      // Default minimum = total sessions when the coach hasn't customized it down yet.
      minimumCompletedSessions:
        w.minimumCompletedSessions >= w.sessions.length ? sessions.length : w.minimumCompletedSessions,
    };
  });
}

export function removeSession(weeks: WeekState[], weekIndex: number, sessionId: string): WeekState[] {
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    const sessions = w.sessions.filter((s) => s.id !== sessionId);
    return {
      ...w,
      sessions,
      minimumCompletedSessions: Math.max(0, Math.min(w.minimumCompletedSessions, sessions.length)),
    };
  });
}

export function duplicateSession(weeks: WeekState[], weekIndex: number, sessionId: string): WeekState[] {
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    const idx = w.sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) return w;
    const original = w.sessions[idx];
    const copy: PlannedSession = { id: nextId("s"), sessionTemplateId: original.sessionTemplateId, restDaysAfterPrevious: 1 };
    const sessions = [...w.sessions];
    sessions.splice(idx + 1, 0, copy);
    return { ...w, sessions };
  });
}

export function reorderSessions(weeks: WeekState[], weekIndex: number, fromIndex: number, toIndex: number): WeekState[] {
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    if (fromIndex < 0 || fromIndex >= w.sessions.length || toIndex < 0 || toIndex >= w.sessions.length) return w;
    const sessions = [...w.sessions];
    const [moved] = sessions.splice(fromIndex, 1);
    sessions.splice(toIndex, 0, moved);
    return { ...w, sessions };
  });
}

export function setRestDaysAfterPrevious(
  weeks: WeekState[],
  weekIndex: number,
  sessionId: string,
  restDays: number
): WeekState[] {
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    return {
      ...w,
      sessions: w.sessions.map((s) => (s.id === sessionId ? { ...s, restDaysAfterPrevious: Math.max(0, restDays) } : s)),
    };
  });
}

export function setMinimumCompletedSessions(weeks: WeekState[], weekIndex: number, value: number): WeekState[] {
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    const clamped = Math.max(0, Math.min(value, Math.max(w.sessions.length, 1)));
    return { ...w, minimumCompletedSessions: clamped };
  });
}

export function setIsRestWeek(weeks: WeekState[], weekIndex: number, isRestWeek: boolean): WeekState[] {
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    return isRestWeek
      ? { ...w, isRestWeek: true, sessions: [], minimumCompletedSessions: 0 }
      : { ...w, isRestWeek: false, minimumCompletedSessions: w.sessions.length };
  });
}

/** Derives the legacy days{mon..sun} map from ordered sessions (offset % 7 -> DAY_KEYS[offset % 7]). */
export function sessionsToDays(sessions: PlannedSession[]): Record<DayKey, SessionPlacement[]> {
  const days = DAY_KEYS.reduce((acc, d) => {
    acc[d] = [];
    return acc;
  }, {} as Record<DayKey, SessionPlacement[]>);
  const offsets = computeOffsets(sessions);
  sessions.forEach((s, idx) => {
    const key = DAY_KEYS[offsets[idx]];
    days[key].push({ placementId: s.id, sessionTemplateId: s.sessionTemplateId, order: idx });
  });
  return days;
}

/** Derives ordered sessions from a legacy days{mon..sun} map (mon->sun order, restDays from offset deltas). */
export function daysToSessions(days: Record<DayKey, SessionPlacement[]>): PlannedSession[] {
  const flat: Array<{ placement: SessionPlacement; offset: number }> = [];
  DAY_KEYS.forEach((day, offset) => {
    (days[day] ?? []).forEach((placement) => flat.push({ placement, offset }));
  });
  let previousOffset = 0;
  return flat.map((entry, idx) => {
    const restDaysAfterPrevious = idx === 0 ? 0 : Math.max(0, entry.offset - previousOffset - 1);
    previousOffset = entry.offset;
    return {
      id: entry.placement.placementId || nextId("s"),
      sessionTemplateId: entry.placement.sessionTemplateId,
      restDaysAfterPrevious,
    };
  });
}

/** Preview generated calendar dates for a sample start date (admin-only, never persisted). */
export function previewDatesForWeek(
  sampleStartDate: Date,
  sessions: PlannedSession[]
): Array<{ session: PlannedSession; offset: number; date: Date }> {
  const offsets = computeOffsets(sessions);
  const startMs = Date.UTC(sampleStartDate.getUTCFullYear(), sampleStartDate.getUTCMonth(), sampleStartDate.getUTCDate());
  return sessions.map((s, idx) => ({
    session: s,
    offset: offsets[idx],
    date: new Date(startMs + offsets[idx] * 24 * 60 * 60 * 1000),
  }));
}

/** Strip client-only ids for the API payload; includes derived days{} + offsets for the backend to store. */
export function weeksToApiPayload(weeks: WeekState[]): Array<{
  weekNumber: number;
  isRestWeek: boolean;
  minimumCompletedSessions: number;
  sessions: Array<{ sessionTemplateId: string; sessionOrder: number; recommendedDayOffset: number; restDaysAfterPrevious?: number }>;
}> {
  return weeks.map((w) => {
    const offsets = computeOffsets(w.sessions);
    return {
      weekNumber: w.weekNumber,
      isRestWeek: w.isRestWeek,
      minimumCompletedSessions: w.minimumCompletedSessions,
      sessions: w.sessions.map((s, idx) => ({
        sessionTemplateId: s.sessionTemplateId,
        sessionOrder: idx + 1,
        recommendedDayOffset: offsets[idx],
        restDaysAfterPrevious: idx === 0 ? undefined : s.restDaysAfterPrevious,
      })),
    };
  });
}

/** API shape for one ordered session (as returned by GET /level-templates/:id). */
export type ApiPlannedSession = {
  sessionTemplateId: string;
  sessionOrder?: number;
  recommendedDayOffset?: number;
  restDaysAfterPrevious?: number;
};
export type ApiDayPlacement = { sessionTemplateId?: string; note?: string; order?: number };
export type ApiWeek = {
  weekNumber: number;
  days?: Record<string, ApiDayPlacement[]>;
  sessions?: ApiPlannedSession[];
  minimumCompletedSessions?: number;
  isRestWeek?: boolean;
};

/** Builds client WeekState[] from the API response, preferring sessions[] when present. */
export function apiWeeksToState(rawWeeks: ApiWeek[], durationWeeks = 5): WeekState[] {
  const base: WeekState[] = Array.from({ length: durationWeeks }, (_, i) => ({
    weekNumber: i + 1,
    days: DAY_KEYS.reduce((acc, day) => {
      acc[day] = [];
      return acc;
    }, {} as Record<DayKey, SessionPlacement[]>),
    sessions: [],
    minimumCompletedSessions: 0,
    isRestWeek: false,
  }));

  return base.map((b) => {
    const fromApi = rawWeeks.find((w) => w.weekNumber === b.weekNumber);
    if (!fromApi) return b;

    const days: Record<DayKey, SessionPlacement[]> = DAY_KEYS.reduce((acc, day) => {
      const list = fromApi.days?.[day] ?? [];
      acc[day] = list.map((s, idx) => ({
        placementId: `pl-${b.weekNumber}-${day}-${idx}-${s.sessionTemplateId ?? ""}`,
        sessionTemplateId: String(s.sessionTemplateId ?? ""),
        note: s.note,
        order: s.order ?? 0,
      }));
      return acc;
    }, {} as Record<DayKey, SessionPlacement[]>);

    const sessions: PlannedSession[] =
      Array.isArray(fromApi.sessions) && fromApi.sessions.length > 0
        ? [...fromApi.sessions]
            .sort((a, b2) => (a.sessionOrder ?? 0) - (b2.sessionOrder ?? 0))
            .map((s) => ({
              id: nextId("s"),
              sessionTemplateId: String(s.sessionTemplateId),
              restDaysAfterPrevious: s.restDaysAfterPrevious ?? 0,
            }))
        : daysToSessions(days);

    const isRestWeek = fromApi.isRestWeek ?? sessions.length === 0;
    const minimumCompletedSessions = isRestWeek
      ? 0
      : fromApi.minimumCompletedSessions ?? sessions.length;

    return { weekNumber: b.weekNumber, days, sessions, minimumCompletedSessions, isRestWeek };
  });
}
