/**
 * Pure helpers for 5-week planner state.
 * All functions are immutable; they return new state.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface SessionPlacement {
  placementId: string;
  sessionTemplateId: string;
  note?: string;
  order?: number;
}

export interface WeekState {
  weekNumber: number;
  days: Record<DayKey, SessionPlacement[]>;
}

function nextPlacementId(): string {
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function countWeekSessions(week: WeekState): number {
  return DAY_KEYS.reduce((sum, d) => sum + (week.days[d]?.length ?? 0), 0);
}

export function addPlacementFromLibrary(
  weeks: WeekState[],
  weekIndex: number,
  day: DayKey,
  sessionTemplateId: string
): WeekState[] {
  const count = countWeekSessions(weeks[weekIndex] ?? { weekNumber: 0, days: {} as Record<DayKey, SessionPlacement[]> });
  if (count >= 7) return weeks;
  const placement: SessionPlacement = { placementId: nextPlacementId(), sessionTemplateId, order: 0 };
  return weeks.map((w, wi) => {
    if (wi !== weekIndex) return w;
    const dayList = [...(w.days[day] ?? []), placement];
    return { ...w, days: { ...w.days, [day]: dayList } };
  });
}

export function movePlacementToDay(
  weeks: WeekState[],
  placementId: string,
  toWeekIndex: number,
  toDay: DayKey,
  toIndex?: number
): WeekState[] | null {
  let sourceWeekIndex = -1;
  let sourceDay: DayKey | null = null;
  let sourceIndex = -1;
  let placement: SessionPlacement | null = null;

  for (let wi = 0; wi < weeks.length; wi++) {
    for (const d of DAY_KEYS) {
      const list = weeks[wi].days[d] ?? [];
      const idx = list.findIndex((p) => p.placementId === placementId);
      if (idx >= 0) {
        sourceWeekIndex = wi;
        sourceDay = d;
        sourceIndex = idx;
        placement = list[idx];
        break;
      }
    }
    if (placement) break;
  }
  if (!placement || sourceDay === null) return null;

  const targetWeek = weeks[toWeekIndex];
  if (!targetWeek) return null;
  const currentCount = countWeekSessions(targetWeek);
  if (currentCount >= 7 && (sourceWeekIndex !== toWeekIndex || sourceDay !== toDay)) return null;

  const removeFromSource = (w: WeekState, wi: number, d: DayKey): SessionPlacement[] =>
    (w.days[d] ?? []).filter((p) => p.placementId !== placementId);

  const insertAtTarget = (list: SessionPlacement[], p: SessionPlacement, at?: number): SessionPlacement[] => {
    const arr = [...list];
    const index = at !== undefined && at >= 0 && at <= arr.length ? at : arr.length;
    arr.splice(index, 0, p);
    return arr;
  };

  return weeks.map((w, wi) => {
    if (wi === sourceWeekIndex && wi === toWeekIndex && sourceDay === toDay) {
      const list = w.days[sourceDay] ?? [];
      const fromIdx = list.findIndex((p) => p.placementId === placementId);
      if (fromIdx < 0) return w;
      const reordered = [...list];
      reordered.splice(fromIdx, 1);
      const rawTo = toIndex !== undefined && toIndex >= 0 ? toIndex : reordered.length;
      const insertIdx = fromIdx < rawTo ? rawTo - 1 : rawTo;
      const toIdx = Math.max(0, Math.min(insertIdx, reordered.length));
      reordered.splice(toIdx, 0, placement!);
      return { ...w, days: { ...w.days, [sourceDay!]: reordered } };
    }
    if (wi === sourceWeekIndex) {
      const newList = removeFromSource(w, wi, sourceDay!);
      return { ...w, days: { ...w.days, [sourceDay!]: newList } };
    }
    if (wi === toWeekIndex) {
      const existing = w.days[toDay] ?? [];
      const newList = insertAtTarget(existing, placement!, toIndex);
      return { ...w, days: { ...w.days, [toDay]: newList } };
    }
    return w;
  });
}

export function removePlacement(weeks: WeekState[], placementId: string): WeekState[] {
  return weeks.map((w) => {
    let changed = false;
    const newDays = { ...w.days };
    for (const d of DAY_KEYS) {
      const list = (w.days[d] ?? []).filter((p) => p.placementId !== placementId);
      if (list.length !== (w.days[d]?.length ?? 0)) changed = true;
      newDays[d] = list;
    }
    return changed ? { ...w, days: newDays } : w;
  });
}

export function reorderInDay(
  weeks: WeekState[],
  weekIndex: number,
  day: DayKey,
  fromIndex: number,
  toIndex: number
): WeekState[] {
  const w = weeks[weekIndex];
  if (!w) return weeks;
  const list = [...(w.days[day] ?? [])];
  if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return weeks;
  const [removed] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, removed);
  return weeks.map((wk, wi) =>
    wi === weekIndex ? { ...wk, days: { ...wk.days, [day]: list } } : wk
  );
}

/** Find which week/day a placementId belongs to */
export function findPlacementLocation(
  weeks: WeekState[],
  placementId: string
): { weekIndex: number; day: DayKey; index: number } | null {
  for (let wi = 0; wi < weeks.length; wi++) {
    for (const d of DAY_KEYS) {
      const list = weeks[wi].days[d] ?? [];
      const idx = list.findIndex((p) => p.placementId === placementId);
      if (idx >= 0) return { weekIndex: wi, day: d, index: idx };
    }
  }
  return null;
}

/** Strip client-only placementId for API payload */
export function weeksToApiPayload(weeks: WeekState[]): Array<{ weekNumber: number; days: Record<DayKey, Array<{ sessionTemplateId: string; note?: string; order?: number }>> }> {
  return weeks.map((w) => ({
    weekNumber: w.weekNumber,
    days: DAY_KEYS.reduce((acc, d) => {
      acc[d] = (w.days[d] ?? []).map(({ sessionTemplateId, note, order }) => ({
        sessionTemplateId,
        ...(note != null && { note }),
        ...(order != null && { order }),
      }));
      return acc;
    }, {} as Record<DayKey, Array<{ sessionTemplateId: string; note?: string; order?: number }>>),
  }));
}

/** API shape for one placement (no placementId) */
export type ApiDayPlacement = { sessionTemplateId?: string; note?: string; order?: number };

/** Add placementIds to API week data (for loading) */
export function apiWeeksToState(
  rawWeeks: Array<{ weekNumber: number; days?: Record<string, ApiDayPlacement[]> }>
): WeekState[] {
  const base: WeekState[] = [1, 2, 3, 4, 5].map((wn) => ({
    weekNumber: wn,
    days: DAY_KEYS.reduce((acc, day) => {
      acc[day] = [];
      return acc;
    }, {} as Record<DayKey, SessionPlacement[]>),
  }));
  return base.map((b) => {
    const fromApi = rawWeeks.find((w) => w.weekNumber === b.weekNumber);
    if (!fromApi?.days) return b;
    return {
      weekNumber: b.weekNumber,
      days: DAY_KEYS.reduce((acc, day) => {
        const list = fromApi.days?.[day] ?? [];
        acc[day] = list.map((s, idx) => ({
          placementId: `pl-${b.weekNumber}-${day}-${idx}-${s.sessionTemplateId ?? ""}`,
          sessionTemplateId: String(s.sessionTemplateId ?? ""),
          note: s.note,
          order: s.order ?? 0,
        }));
        return acc;
      }, {} as Record<DayKey, SessionPlacement[]>),
    };
  });
}
