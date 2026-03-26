"use client";

import { useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAY_KEYS,
  type DayKey,
  type WeekState,
  type SessionPlacement,
  countWeekSessions,
  addPlacementFromLibrary,
  movePlacementToDay,
  removePlacement,
  findPlacementLocation,
} from "@/lib/plannerHelpers";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mer",
  thu: "Jeu",
  fri: "Ven",
  sat: "Sam",
  sun: "Dim",
};

const DAY_COLORS: Record<DayKey, string> = {
  mon: "bg-blue-500/10 border-blue-500/20",
  tue: "bg-violet-500/10 border-violet-500/20",
  wed: "bg-emerald-500/10 border-emerald-500/20",
  thu: "bg-amber-500/10 border-amber-500/20",
  fri: "bg-rose-500/10 border-rose-500/20",
  sat: "bg-sky-500/10 border-sky-500/20",
  sun: "bg-orange-500/10 border-orange-500/20",
};

export interface WeekPlannerProps {
  weeks: WeekState[];
  onChange: (weeks: WeekState[]) => void;
  sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }>;
  librarySessions: Array<{ _id: string; title?: string; durationMinutes?: number }>;
  maxSessionsPerWeek?: number;
  minSessionsPerWeek?: number;
  disabled?: boolean;
}

export function WeekPlanner({
  weeks,
  onChange,
  sessionTemplateById,
  librarySessions,
  maxSessionsPerWeek = 7,
  minSessionsPerWeek = 4,
  disabled = false,
}: WeekPlannerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {})
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over) return;
      const aid = String(active.id);
      const oid = String(over.id);
      if (aid === oid) return;

      const fromLib = aid.startsWith("lib-");
      const sessionTemplateId = fromLib
        ? aid.replace("lib-", "")
        : (active.data.current as { sessionTemplateId?: string } | undefined)?.sessionTemplateId;

      if (fromLib && sessionTemplateId) {
        const match = oid.startsWith("drop-")
          ? oid.match(/^drop-(\d+)-(mon|tue|wed|thu|fri|sat|sun)$/)
          : null;
        const loc = oid.startsWith("pl-") ? findPlacementLocation(weeks, oid) : null;
        const weekIndex = match ? parseInt(match[1], 10) : loc?.weekIndex;
        const day = match ? (match[2] as DayKey) : loc?.day;
        if (weekIndex !== undefined && day) {
          const count = countWeekSessions(weeks[weekIndex] ?? { weekNumber: 0, days: {} as Record<DayKey, SessionPlacement[]> });
          if (count >= maxSessionsPerWeek) return;
          onChange(addPlacementFromLibrary(weeks, weekIndex, day, sessionTemplateId));
        }
        return;
      }

      if (aid.startsWith("pl-")) {
        if (oid.startsWith("drop-")) {
          const match = oid.match(/^drop-(\d+)-(mon|tue|wed|thu|fri|sat|sun)$/);
          if (match) {
            const next = movePlacementToDay(weeks, aid, parseInt(match[1], 10), match[2] as DayKey);
            if (next) onChange(next);
          }
        } else if (oid.startsWith("pl-")) {
          const targetLoc = findPlacementLocation(weeks, oid);
          if (!targetLoc) return;
          const next = movePlacementToDay(weeks, aid, targetLoc.weekIndex, targetLoc.day, targetLoc.index);
          if (next) onChange(next);
        }
      }
    },
    [weeks, onChange, maxSessionsPerWeek]
  );

  const handleRemove = useCallback(
    (placementId: string) => { onChange(removePlacement(weeks, placementId)); },
    [weeks, onChange]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {weeks.map((week, wi) => {
          const total = countWeekSessions(week);
          const pct = Math.round((total / maxSessionsPerWeek) * 100);
          const isValid = total === 0 || (total >= minSessionsPerWeek && total <= maxSessionsPerWeek);
          return (
            <div
              key={week.weekNumber}
              className={cn(
                "min-w-[148px] flex-1 rounded-xl border bg-card shadow-sm flex flex-col",
                isValid ? "border-border" : "border-destructive/60"
              )}
            >
              {/* Week header */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-foreground">Semaine {week.weekNumber}</span>
                  <span className={cn("text-xs font-semibold tabular-nums", isValid ? "text-muted-foreground" : "text-destructive")}>
                    {total}/{maxSessionsPerWeek}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", isValid && total > 0 ? "bg-primary" : total === 0 ? "bg-muted-foreground/30" : "bg-destructive")}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Days */}
              <div className="flex flex-col gap-1.5 px-2 pb-2 flex-1">
                {DAY_KEYS.map((day) => (
                  <DayColumn
                    key={day}
                    weekIndex={wi}
                    day={day}
                    placements={week.days[day] ?? []}
                    sessionTemplateById={sessionTemplateById}
                    onRemove={handleRemove}
                    maxSessionsPerWeek={maxSessionsPerWeek}
                    weekTotal={total}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Library */}
      <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Séances disponibles — glissez vers un jour
        </p>
        <div className="flex flex-wrap gap-2">
          {librarySessions.map((s) => (
            <LibrarySessionItem key={s._id} session={s} disabled={disabled} />
          ))}
          {librarySessions.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune séance. Créez des modèles de séances d&apos;abord.</p>
          )}
        </div>
      </div>
    </DndContext>
  );
}

function DayColumn({
  weekIndex, day, placements, sessionTemplateById, onRemove,
  maxSessionsPerWeek, weekTotal, disabled,
}: {
  weekIndex: number;
  day: DayKey;
  placements: SessionPlacement[];
  sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }>;
  onRemove: (id: string) => void;
  maxSessionsPerWeek: number;
  weekTotal: number;
  disabled: boolean;
}) {
  const droppableId = `drop-${weekIndex}-${day}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });
  const canDrop = weekTotal < maxSessionsPerWeek;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border transition-all",
        placements.length > 0 ? DAY_COLORS[day] : "border-border/50 bg-background/30",
        isOver && canDrop && "border-primary bg-primary/10 scale-[1.01]",
        isOver && !canDrop && "border-destructive/60 bg-destructive/5",
      )}
    >
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{DAY_LABELS[day]}</span>
        {placements.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{placements.length}</span>
        )}
      </div>
      <SortableContext items={placements.map(p => p.placementId)} strategy={verticalListSortingStrategy}>
        <div className="px-1.5 pb-1.5 space-y-1 min-h-[28px]">
          {placements.map((p) => (
            <SortablePlacementCard
              key={p.placementId}
              placement={p}
              sessionTemplateById={sessionTemplateById}
              onRemove={onRemove}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortablePlacementCard({
  placement, sessionTemplateById, onRemove, disabled,
}: {
  placement: SessionPlacement;
  sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }>;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: placement.placementId,
    data: { sessionTemplateId: placement.sessionTemplateId },
  });
  const session = sessionTemplateById[placement.sessionTemplateId];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 rounded-md border bg-background px-1.5 py-1 text-[11px] shadow-sm group",
        isDragging && "opacity-70 shadow-lg z-50",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
      <span className="flex-1 truncate font-medium text-foreground leading-tight">
        {session?.title ?? "—"}
      </span>
      {session?.durationMinutes != null && (
        <span className="shrink-0 text-[10px] text-muted-foreground">{session.durationMinutes}m</span>
      )}
      {!disabled && (
        <button
          type="button"
          className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity rounded p-0.5"
          onClick={(e) => { e.stopPropagation(); onRemove(placement.placementId); }}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

export function LibrarySessionItem({
  session, disabled,
}: {
  session: { _id: string; title?: string; durationMinutes?: number };
  disabled: boolean;
}) {
  const id = `lib-${session._id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { sessionTemplateId: session._id },
  } as { id: string; data: { sessionTemplateId: string } });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-all hover:border-primary/50 hover:bg-primary/5",
        isDragging && "opacity-50 shadow-lg cursor-grabbing",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-foreground">{session.title ?? session._id}</span>
      {session.durationMinutes != null && (
        <span className="text-xs text-muted-foreground shrink-0">{session.durationMinutes}m</span>
      )}
    </div>
  );
}
