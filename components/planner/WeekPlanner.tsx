"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus, Copy, Search, Moon, CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type WeekState,
  type PlannedSession,
  addSession,
  removeSession,
  duplicateSession,
  reorderSessions,
  setRestDaysAfterPrevious,
  setMinimumCompletedSessions,
  setIsRestWeek,
  computeOffsets,
  offsetsFitInCycle,
  previewDatesForWeek,
} from "@/lib/plannerHelpers";

const OFFSET_DAY_LABELS = ["J0", "J1", "J2", "J3", "J4", "J5", "J6"];

export interface WeekPlannerProps {
  weeks: WeekState[];
  onChange: (weeks: WeekState[]) => void;
  sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }>;
  librarySessions: Array<{ _id: string; title?: string; durationMinutes?: number }>;
  disabled?: boolean;
}

export function WeekPlanner({
  weeks,
  onChange,
  sessionTemplateById,
  librarySessions,
  disabled = false,
}: WeekPlannerProps) {
  const [previewStartDate, setPreviewStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Aperçu des dates — date de départ d&apos;exemple :</span>
        <input
          type="date"
          value={previewStartDate}
          onChange={(e) => setPreviewStartDate(e.target.value)}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
        />
        <span className="text-[11px] text-muted-foreground italic">Aperçu uniquement — jamais enregistré tel quel.</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3">
        {weeks.map((week, wi) => (
          <WeekCard
            key={week.weekNumber}
            week={week}
            weekIndex={wi}
            weeks={weeks}
            onChange={onChange}
            sessionTemplateById={sessionTemplateById}
            librarySessions={librarySessions}
            disabled={disabled}
            previewStartDate={previewStartDate}
          />
        ))}
      </div>
    </div>
  );
}

function WeekCard({
  week, weekIndex, weeks, onChange, sessionTemplateById, librarySessions, disabled, previewStartDate,
}: {
  week: WeekState;
  weekIndex: number;
  weeks: WeekState[];
  onChange: (weeks: WeekState[]) => void;
  sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }>;
  librarySessions: Array<{ _id: string; title?: string; durationMinutes?: number }>;
  disabled: boolean;
  previewStartDate: string;
}) {
  const [addQuery, setAddQuery] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {})
  );

  const offsets = useMemo(() => computeOffsets(week.sessions), [week.sessions]);
  const fitsInCycle = useMemo(() => offsetsFitInCycle(week.sessions), [week.sessions]);
  const total = week.sessions.length;
  const min = week.minimumCompletedSessions;
  const isValidMinimum = week.isRestWeek ? min === 0 : min >= 1 && min <= Math.max(total, 1);
  const preview = useMemo(() => {
    const d = new Date(previewStartDate + "T00:00:00.000Z");
    if (Number.isNaN(d.getTime())) return [];
    return previewDatesForWeek(d, week.sessions);
  }, [previewStartDate, week.sessions]);

  const filteredLibrary = librarySessions.filter((s) =>
    !addQuery || (s.title ?? "").toLowerCase().includes(addQuery.toLowerCase())
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIndex = week.sessions.findIndex((s) => s.id === active.id);
    const toIndex = week.sessions.findIndex((s) => s.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onChange(reorderSessions(weeks, weekIndex, fromIndex, toIndex));
  };

  return (
    <div className="min-w-[300px] w-[300px] shrink-0 rounded-xl border border-border bg-card shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-3 border-b border-border/70 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Semaine {week.weekNumber}</span>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={week.isRestWeek}
              disabled={disabled}
              onChange={(e) => onChange(setIsRestWeek(weeks, weekIndex, e.target.checked))}
              className="h-3.5 w-3.5 rounded border-border"
            />
            <Moon className="h-3 w-3" /> Semaine de repos
          </label>
        </div>

        {!week.isRestWeek && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{total}</strong> séance{total !== 1 ? "s" : ""} planifiée{total !== 1 ? "s" : ""}
              </span>
              {total > 0 && (
                <span
                  className={cn(
                    "flex items-center gap-1 font-semibold",
                    isValidMinimum ? "text-emerald-600" : "text-destructive"
                  )}
                >
                  {isValidMinimum ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  Min {min}/{total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground shrink-0">Minimum pour valider la semaine</label>
              <input
                type="number"
                min={0}
                max={Math.max(total, 1)}
                value={min}
                disabled={disabled || total === 0}
                onChange={(e) => onChange(setMinimumCompletedSessions(weeks, weekIndex, Number(e.target.value) || 0))}
                className="h-7 w-14 rounded-md border border-border bg-background px-2 text-xs font-semibold text-center"
              />
            </div>
            {!fitsInCycle && (
              <p className="flex items-center gap-1 text-[10px] text-amber-600">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Le cumul des jours de repos dépasse le cycle de 7 jours.
              </p>
            )}
          </>
        )}
      </div>

      {/* Ordered sessions */}
      {!week.isRestWeek && (
        <div className="flex-1 p-2.5 space-y-2 min-h-[80px]">
          {total === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">Aucune séance. Ajoutez-en une ci-dessous.</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={week.sessions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {week.sessions.map((s, idx) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  index={idx}
                  offset={offsets[idx]}
                  sessionMeta={sessionTemplateById[s.sessionTemplateId]}
                  disabled={disabled}
                  onRemove={() => onChange(removeSession(weeks, weekIndex, s.id))}
                  onDuplicate={() => onChange(duplicateSession(weeks, weekIndex, s.id))}
                  onRestDaysChange={(v) => onChange(setRestDaysAfterPrevious(weeks, weekIndex, s.id, v))}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add session */}
      {!week.isRestWeek && !disabled && (
        <div className="p-2.5 border-t border-border/70 space-y-2">
          {showAddPanel ? (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  placeholder="Rechercher une séance…"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  className="w-full h-7 rounded-md border border-border bg-background pl-6 pr-2 text-xs"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border/50 p-1">
                {filteredLibrary.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-2">Aucun résultat</p>
                )}
                {filteredLibrary.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => {
                      onChange(addSession(weeks, weekIndex, s._id));
                      setAddQuery("");
                    }}
                    className="w-full flex items-center justify-between rounded px-2 py-1 text-xs text-left hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="truncate">{s.title ?? s._id}</span>
                    {s.durationMinutes != null && <span className="text-[10px] text-muted-foreground shrink-0">{s.durationMinutes}m</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setShowAddPanel(false); setAddQuery(""); }}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddPanel(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une séance
            </button>
          )}
        </div>
      )}

      {/* Date preview */}
      {!week.isRestWeek && total > 0 && (
        <div className="p-2.5 border-t border-border/70 bg-muted/10 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Aperçu des dates</p>
          {preview.map((p, idx) => (
            <div key={p.session.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Séance {idx + 1}</span>
              <span className="font-medium text-foreground">
                {p.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session, index, offset, sessionMeta, disabled, onRemove, onDuplicate, onRestDaysChange,
}: {
  session: PlannedSession;
  index: number;
  offset: number;
  sessionMeta?: { title?: string; durationMinutes?: number };
  disabled: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  onRestDaysChange: (v: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-lg border border-border bg-background shadow-sm",
        isDragging && "opacity-60 shadow-lg z-10"
      )}
    >
      {index > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 pt-1.5 text-[10px] text-muted-foreground">
          <Moon className="h-2.5 w-2.5" />
          <span>Jours de repos après la séance précédente :</span>
          <input
            type="number"
            min={0}
            max={6}
            value={session.restDaysAfterPrevious}
            disabled={disabled}
            onChange={(e) => onRestDaysChange(Number(e.target.value) || 0)}
            className="h-5 w-10 rounded border border-border bg-muted/30 px-1 text-center text-[10px]"
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {!disabled && (
          <div {...listeners} {...attributes} className="cursor-grab touch-none shrink-0">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{sessionMeta?.title ?? "Séance"}</p>
          <p className="text-[10px] text-muted-foreground">
            {OFFSET_DAY_LABELS[offset] ?? `J${offset}`}
            {sessionMeta?.durationMinutes != null ? ` · ${sessionMeta.durationMinutes}m` : ""}
          </p>
        </div>
        {!disabled && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={onDuplicate} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10" title="Dupliquer">
              <Copy className="h-3 w-3" />
            </button>
            <button onClick={onRemove} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Retirer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
