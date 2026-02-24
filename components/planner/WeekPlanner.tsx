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
import { GripVertical, X } from "lucide-react";
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
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
      const sessionTemplateId = fromLib ? aid.replace("lib-", "") : (active.data.current as { sessionTemplateId?: string } | undefined)?.sessionTemplateId;

      if (fromLib && sessionTemplateId) {
        if (oid.startsWith("drop-")) {
          const match = oid.match(/^drop-(\d+)-(mon|tue|wed|thu|fri|sat|sun)$/);
          if (match) {
            const weekIndex = parseInt(match[1], 10);
            const day = match[2] as DayKey;
            const count = countWeekSessions(weeks[weekIndex] ?? { weekNumber: 0, days: {} as Record<DayKey, SessionPlacement[]> });
            if (count >= maxSessionsPerWeek) return;
            const next = addPlacementFromLibrary(weeks, weekIndex, day, sessionTemplateId);
            onChange(next);
          }
        } else if (oid.startsWith("pl-")) {
          const loc = findPlacementLocation(weeks, oid);
          if (loc) {
            const count = countWeekSessions(weeks[loc.weekIndex] ?? { weekNumber: 0, days: {} as Record<DayKey, SessionPlacement[]> });
            if (count >= maxSessionsPerWeek) return;
            const next = addPlacementFromLibrary(weeks, loc.weekIndex, loc.day, sessionTemplateId);
            onChange(next);
          }
        }
        return;
      }

      if (aid.startsWith("pl-")) {
        const placementId = aid;
        if (oid.startsWith("drop-")) {
          const match = oid.match(/^drop-(\d+)-(mon|tue|wed|thu|fri|sat|sun)$/);
          if (match) {
            const toWeekIndex = parseInt(match[1], 10);
            const toDay = match[2] as DayKey;
            const next = movePlacementToDay(weeks, placementId, toWeekIndex, toDay);
            if (next) onChange(next);
          }
        } else if (oid.startsWith("pl-")) {
          const targetLoc = findPlacementLocation(weeks, oid);
          const sourceLoc = findPlacementLocation(weeks, placementId);
          if (!targetLoc || !sourceLoc) return;
          const next = movePlacementToDay(weeks, placementId, targetLoc.weekIndex, targetLoc.day, targetLoc.index);
          if (next) onChange(next);
        }
      }
    },
    [weeks, onChange, maxSessionsPerWeek]
  );

  const handleRemove = useCallback(
    (placementId: string) => {
      onChange(removePlacement(weeks, placementId));
    },
    [weeks, onChange]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {weeks.map((week, wi) => {
          const total = countWeekSessions(week);
          const valid = total >= minSessionsPerWeek && total <= maxSessionsPerWeek;
          return (
            <div
              key={week.weekNumber}
              className={cn(
                "min-w-[160px] rounded-lg border bg-card/50 p-3 transition-colors",
                valid ? "border-border" : "border-destructive/50"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Week {week.weekNumber}</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    valid ? "text-muted-foreground" : "text-destructive"
                  )}
                >
                  {total} / {minSessionsPerWeek}–{maxSessionsPerWeek}
                </span>
              </div>
              <div className="space-y-2">
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
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground mb-2">Session Library — drag into a day</p>
        <div className="flex flex-wrap gap-2">
          {librarySessions.map((s) => (
            <LibrarySessionItem key={s._id} session={s} disabled={disabled} />
          ))}
          {librarySessions.length === 0 && (
            <p className="text-sm text-muted-foreground">No sessions. Add session templates first.</p>
          )}
        </div>
      </div>
    </DndContext>
  );
}

function DayColumn({
  weekIndex,
  day,
  placements,
  sessionTemplateById,
  onRemove,
  maxSessionsPerWeek,
  weekTotal,
  disabled,
}: {
  weekIndex: number;
  day: DayKey;
  placements: SessionPlacement[];
  sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }>;
  onRemove: (placementId: string) => void;
  maxSessionsPerWeek: number;
  weekTotal: number;
  disabled: boolean;
}) {
  const droppableId = `drop-${weekIndex}-${day}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });
  const canDrop = weekTotal < maxSessionsPerWeek;
  const sortableIds = placements.map((p) => p.placementId);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[52px] rounded-md border border-dashed p-1.5 transition-colors",
        isOver && canDrop && "border-primary bg-primary/10",
        isOver && !canDrop && "border-destructive/70 bg-destructive/5",
        !isOver && "border-border bg-background/50"
      )}
    >
      <div className="mb-1 text-xs font-medium text-muted-foreground">{DAY_LABELS[day]}</div>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
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
  placement,
  sessionTemplateById,
  onRemove,
  disabled,
}: {
  placement: SessionPlacement;
  sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }>;
  onRemove: (placementId: string) => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: placement.placementId,
    data: { sessionTemplateId: placement.sessionTemplateId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const session = sessionTemplateById[placement.sessionTemplateId];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 rounded border bg-card px-2 py-1.5 text-xs shadow-sm transition-shadow",
        isDragging && "opacity-80 shadow-lg z-50",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-foreground">{session?.title ?? placement.sessionTemplateId}</span>
      {session?.durationMinutes != null && (
        <span className="shrink-0 text-muted-foreground">{session.durationMinutes}m</span>
      )}
      {!disabled && (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(placement.placementId);
          }}
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function LibrarySessionItem({
  session,
  disabled,
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
        "flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-all hover:border-primary/50",
        isDragging && "opacity-60 shadow-lg cursor-grabbing",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-foreground">{session.title ?? session._id}</span>
      {session.durationMinutes != null && (
        <span className="text-xs text-muted-foreground">{session.durationMinutes}m</span>
      )}
    </div>
  );
}
