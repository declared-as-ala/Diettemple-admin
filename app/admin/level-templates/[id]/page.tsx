"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageLoader } from "@/components/ui/loading";
import { WeekPlanner } from "@/components/planner/WeekPlanner";
import {
  apiWeeksToState,
  weeksToApiPayload,
  countWeekSessions,
  DAY_KEYS,
  type WeekState,
  type DayKey,
} from "@/lib/plannerHelpers";
import { ArrowLeft, Save, RotateCcw, Check } from "lucide-react";

export default function LevelTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const [levelTemplate, setLevelTemplate] = useState<Record<string, unknown> | null>(null);
  const [sessionTemplates, setSessionTemplates] = useState<Array<{ _id: string; title?: string; durationMinutes?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<WeekState[]>([]);
  const [initialWeeks, setInitialWeeks] = useState<WeekState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tab, setTab] = useState<"info" | "planner">("info");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [sessionSearch, setSessionSearch] = useState("");

  const loadLevel = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getLevelTemplate(id);
      const plan = data.levelTemplate;
      if (!plan) return;
      setLevelTemplate(plan);
      setEditName(String(plan.name ?? ""));
      setEditDescription(String(plan.description ?? ""));
      setEditIsActive(plan.isActive !== false);
      const rawWeeks = plan.weeks && Array.isArray(plan.weeks) ? plan.weeks : [];
      const state = apiWeeksToState(rawWeeks as Parameters<typeof apiWeeksToState>[0]);
      setWeeks(state);
      setInitialWeeks(state);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast(e.response?.data?.message || e.message || "Failed to load", "error");
    }
  }, [id, toast]);

  const loadSessionTemplates = useCallback(async () => {
    try {
      const data = await api.getSessionTemplates({ limit: 100, search: sessionSearch || undefined });
      setSessionTemplates(data.sessionTemplates || []);
    } catch {
      setSessionTemplates([]);
    }
  }, [sessionSearch]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadLevel().finally(() => setLoading(false));
  }, [id, loadLevel]);

  useEffect(() => {
    loadSessionTemplates();
  }, [loadSessionTemplates]);

  useEffect(() => {
    setDirty(JSON.stringify(weeksToApiPayload(weeks)) !== JSON.stringify(weeksToApiPayload(initialWeeks)));
  }, [weeks, initialWeeks]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }> = {};
  sessionTemplates.forEach((s) => {
    sessionTemplateById[s._id] = { title: s.title, durationMinutes: s.durationMinutes };
  });

  const handleSaveInfo = async () => {
    try {
      await api.updateLevelTemplate(id, {
        name: editName,
        description: editDescription,
        imageUrl: editImageUrl || undefined,
        isActive: editIsActive,
      });
      setLevelTemplate((p) => (p ? { ...p, name: editName, description: editDescription, imageUrl: editImageUrl, isActive: editIsActive } : p));
      setLastSaved(new Date());
      toast("Saved", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast(e.response?.data?.message || e.message || "Error", "error");
    }
  };

  const handleSaveWeeks = async () => {
    const invalid = weeks.some((w) => {
      const c = countWeekSessions(w);
      return c < 4 || c > 7;
    });
    if (invalid) {
      toast("Each week must have 4–7 sessions", "error");
      return;
    }
    setSaving(true);
    try {
      await api.updateLevelTemplateWeeks(id, weeksToApiPayload(weeks));
      setInitialWeeks(weeks);
      setDirty(false);
      setLastSaved(new Date());
      toast("Planning saved", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast(e.response?.data?.message || e.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetWeek = (weekIndex: number) => {
    if (!confirm("Reset all sessions in this week? This cannot be undone.")) return;
    setWeeks((prev) =>
      prev.map((w, wi) =>
        wi === weekIndex
          ? {
              ...w,
              days: DAY_KEYS.reduce(
                (acc, d) => {
                  acc[d] = [];
                  return acc;
                },
                {} as Record<DayKey, WeekState["days"]["mon"]>
              ),
            }
          : w
      )
    );
  };

  const invalidWeeks = weeks.filter((w) => {
    const c = countWeekSessions(w);
    return c < 4 || c > 7;
  });
  const canSave = invalidWeeks.length === 0;

  if (loading || !levelTemplate) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (dirty && !confirm("You have unsaved changes. Leave anyway?")) return;
            router.push("/admin/level-templates");
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Level Templates
        </Button>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {dirty && (
            <Badge variant="secondary" className="text-amber-600 border-amber-600/30">
              Unsaved changes
            </Badge>
          )}
          <Button
            onClick={tab === "info" ? handleSaveInfo : handleSaveWeeks}
            disabled={tab === "planner" ? !canSave || saving : false}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">{String(levelTemplate.name)}</CardTitle>
          <Badge variant={levelTemplate.isActive !== false ? "default" : "secondary"} className="mt-2 w-fit">
            {levelTemplate.isActive !== false ? "Active" : "Inactive"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 border-b border-border pb-4">
            <Button
              variant={tab === "info" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("info")}
            >
              Info
            </Button>
            <Button
              variant={tab === "planner" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("planner")}
            >
              5-week planner
            </Button>
          </div>

          {tab === "info" && (
            <div className="grid gap-4 mt-6 max-w-md">
              <div>
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="/levels/initiate.png"
                  className="mt-1"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-border"
                />
                <Label>Active</Label>
              </label>
            </div>
          )}

          {tab === "planner" && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  Sessions per week: min 4, max 7.
                  {invalidWeeks.length > 0 && (
                    <span className="text-destructive ml-1">
                      Fix week {invalidWeeks.map((w) => w.weekNumber).join(", ")} before saving.
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleSaveWeeks} disabled={!canSave || saving}>
                    {saving ? "Saving…" : "Save planning"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 bg-muted/10">
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    placeholder="Search sessions…"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <WeekPlanner
                  weeks={weeks}
                  onChange={setWeeks}
                  sessionTemplateById={sessionTemplateById}
                  librarySessions={sessionTemplates}
                  minSessionsPerWeek={4}
                  maxSessionsPerWeek={7}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {weeks.map((week, wi) => (
                  <Button
                    key={week.weekNumber}
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetWeek(wi)}
                    className="text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset week {week.weekNumber}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
