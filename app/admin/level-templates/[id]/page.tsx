"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import {
  ArrowLeft, Save, RotateCcw, Check, AlertCircle,
  User, Users, Calendar, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelImageUrl, normalizeLevelName } from "@/lib/levelAssets";

const LEVEL_COLORS: Record<string, string> = {
  Intiate:  "from-slate-600 to-slate-800",
  Fighter:  "from-blue-600 to-blue-900",
  Champion: "from-amber-500 to-amber-800",
  Elite:    "from-rose-600 to-rose-900",
};

export default function LevelTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [tab, setTab] = useState<"info" | "planner">(
    searchParams?.get("tab") === "info" ? "info" : "planner"
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
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
      toast(e.response?.data?.message || e.message || "Erreur de chargement", "error");
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

  useEffect(() => { loadSessionTemplates(); }, [loadSessionTemplates]);

  useEffect(() => {
    setDirty(JSON.stringify(weeksToApiPayload(weeks)) !== JSON.stringify(weeksToApiPayload(initialWeeks)));
  }, [weeks, initialWeeks]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const sessionTemplateById: Record<string, { title?: string; durationMinutes?: number }> = {};
  sessionTemplates.forEach((s) => { sessionTemplateById[s._id] = { title: s.title, durationMinutes: s.durationMinutes }; });

  const handleSaveInfo = async () => {
    try {
      await api.updateLevelTemplate(id, {
        name: editName,
        description: editDescription,
        isActive: editIsActive,
      });
      setLevelTemplate((p) => (p ? { ...p, name: editName, description: editDescription, isActive: editIsActive } : p));
      setLastSaved(new Date());
      toast("Informations sauvegardées", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast(e.response?.data?.message || e.message || "Erreur", "error");
    }
  };

  const handleSaveWeeks = async () => {
    const invalid = weeks.some((w) => { const c = countWeekSessions(w); return c > 0 && (c < 4 || c > 7); });
    if (invalid) { toast("Chaque semaine doit avoir 4–7 séances (ou rester vide)", "error"); return; }
    setSaving(true);
    try {
      await api.updateLevelTemplateWeeks(id, weeksToApiPayload(weeks));
      setInitialWeeks(weeks);
      setDirty(false);
      setLastSaved(new Date());
      toast("Planning sauvegardé ✓", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast(e.response?.data?.message || e.message || "Erreur de sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetWeek = (weekIndex: number) => {
    if (!confirm("Réinitialiser toutes les séances de cette semaine ?")) return;
    setWeeks((prev) =>
      prev.map((w, wi) =>
        wi === weekIndex
          ? { ...w, days: DAY_KEYS.reduce((acc, d) => { acc[d] = []; return acc; }, {} as Record<DayKey, WeekState["days"]["mon"]>) }
          : w
      )
    );
  };

  const invalidWeeks = weeks.filter((w) => { const c = countWeekSessions(w); return c > 0 && (c < 4 || c > 7); });
  const canSave = invalidWeeks.length === 0;
  const levelName = levelTemplate ? String(levelTemplate.name ?? "") : "";
  const gender = levelTemplate ? String(levelTemplate.gender ?? "M") : "M";
  const tierForUi = normalizeLevelName(levelName);
  const gradientClass = LEVEL_COLORS[tierForUi] ?? "from-gray-600 to-gray-900";
  const levelImage = getLevelImageUrl(levelName);

  if (loading || !levelTemplate) return <PageLoader />;

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* ── HEADER ── */}
      <div className={cn("relative bg-gradient-to-r overflow-hidden", gradientClass)}>
        <img
          src={levelImage}
          alt=""
          className="absolute right-0 top-0 h-full w-48 object-cover object-center opacity-15 pointer-events-none select-none"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="relative z-10 flex items-center gap-4 px-6 py-4">
          <button
            onClick={() => { if (dirty && !confirm("Modifications non sauvegardées. Quitter ?")) return; router.push("/admin/level-templates"); }}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Plans
          </button>

          <div className="w-px h-5 bg-white/20" />

          <img
            src={levelImage}
            alt={levelName}
            className="h-10 w-10 rounded-full object-cover border-2 border-white/30 shadow-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg">{levelName}</h1>
              <span className="flex items-center gap-1 text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                {gender === "F" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {gender === "F" ? "Femme" : "Homme"}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", levelTemplate.isActive !== false ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50")}>
                {levelTemplate.isActive !== false ? "Actif" : "Inactif"}
              </span>
            </div>
            <p className="text-white/50 text-xs mt-0.5">{String(levelTemplate.description ?? "")}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {lastSaved && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-white/60">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {dirty && (
              <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" />
                Non sauvegardé
              </span>
            )}
            <Button
              size="sm"
              className="bg-white text-gray-900 hover:bg-white/90 font-semibold"
              onClick={tab === "info" ? handleSaveInfo : handleSaveWeeks}
              disabled={tab === "planner" ? !canSave || saving : false}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative z-10 flex gap-1 px-6 pb-0">
          {[
            { key: "planner" as const, label: "Planning 5 semaines", icon: Calendar },
            { key: "info" as const, label: "Informations", icon: Info },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors",
                tab === key
                  ? "bg-background text-foreground"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 p-6">
        {/* INFO TAB */}
        {tab === "info" && (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium">Nom du plan</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1.5" />
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium">Description</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description courte…" className="mt-1.5" />
              </div>
              <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">Plan actif (visible dans l&apos;app)</label>
              </div>
            </div>
            <Button onClick={handleSaveInfo} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les informations
            </Button>
          </div>
        )}

        {/* PLANNER TAB */}
        {tab === "planner" && (
          <div className="space-y-4">
            {invalidWeeks.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Semaine{invalidWeeks.length > 1 ? "s" : ""} {invalidWeeks.map(w => w.weekNumber).join(", ")} : 4–7 séances requises
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Rechercher des séances…"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="h-8 text-sm w-56"
                />
                <p className="text-sm text-muted-foreground">
                  {weeks.reduce((s, w) => s + countWeekSessions(w), 0)} séances planifiées
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {weeks.map((w, wi) => (
                  <Button key={w.weekNumber} variant="outline" size="sm" onClick={() => handleResetWeek(wi)} className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive">
                    <RotateCcw className="h-3 w-3 mr-1" />S{w.weekNumber}
                  </Button>
                ))}
              </div>
            </div>

            <WeekPlanner
              weeks={weeks}
              onChange={setWeeks}
              sessionTemplateById={sessionTemplateById}
              librarySessions={sessionTemplates}
              minSessionsPerWeek={4}
              maxSessionsPerWeek={7}
            />

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveWeeks} disabled={!canSave || saving} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Sauvegarde en cours…" : "Sauvegarder le planning"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
